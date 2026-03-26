import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"
import { parseCSV } from "@/services/import/parse-csv"
import { parseOFX } from "@/services/import/parse-ofx"
import { categorizeTransaction } from "@/services/import/categorize"

export async function upload(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file()

  if (!file) {
    return reply.status(400).send({ message: "Nenhum arquivo enviado." })
  }

  const buffer = await file.toBuffer()
  const content = buffer.toString("utf-8")
  const fileName = file.filename.toLowerCase()

  // Detectar formato e parsear
  let parsedTransactions
  if (fileName.endsWith(".ofx") || fileName.endsWith(".ofc")) {
    parsedTransactions = parseOFX(content)
  } else {
    // CSV, TXT ou qualquer outro formato texto
    parsedTransactions = parseCSV(content)
  }

  if (parsedTransactions.length === 0) {
    return reply.status(400).send({
      message: "Não foi possível extrair transações do arquivo. Verifique o formato.",
    })
  }

  // Detectar mês/ano predominante
  const monthCounts: Record<string, number> = {}
  for (const t of parsedTransactions) {
    const key = `${t.date.getMonth() + 1}-${t.date.getFullYear()}`
    monthCounts[key] = (monthCounts[key] || 0) + 1
  }
  const predominant = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0][0]
  const [monthNum, yearNum] = predominant.split("-").map(Number)
  const month = monthNum.toString().padStart(2, "0")

  const userId = request.user.sub

  // Buscar registros existentes para verificar duplicatas (gastos e entradas do período)
  const existingExpenses = await prisma.expense.findMany({
    where: { user_id: userId, month, year: yearNum },
    select: { name: true, amount: true, date: true },
  })
  const existingIncomes = await prisma.income.findMany({
    where: { user_id: userId, month, year: yearNum },
    select: { name: true, amount: true, date: true },
  })
  const monthInt = parseInt(month)
  const investmentStartDate = new Date(Date.UTC(yearNum, monthInt - 1, 1))
  const investmentEndDate = new Date(Date.UTC(yearNum, monthInt, 1))
  const existingInvestments = await prisma.investment.findMany({
    where: { user_id: userId, purchase_date: { gte: investmentStartDate, lt: investmentEndDate } },
    select: { name: true, amount: true, date: true },
  })
  const existingTaxes = await prisma.tax.findMany({
    where: { user_id: userId, month, year: yearNum },
    select: { amount: true, due_date: true, tax_type: true },
  })

  // Montar lista de registros existentes com data + valor para comparação
  const existingRecords = [
    ...existingExpenses.map(e => ({
      amount: Number(e.amount),
      date: e.date,
      name: e.name,
    })),
    ...existingIncomes.map(e => ({
      amount: Number(e.amount),
      date: e.date,
      name: e.name,
    })),
    ...existingInvestments.map(e => ({
      amount: Number(e.amount),
      date: e.date,
      name: e.name,
    })),
    ...existingTaxes.map(e => ({
      amount: Number(e.amount),
      date: e.due_date,
      name: e.tax_type,
    })),
  ]

  // Função para verificar duplicata: mesma data (±1 dia) e mesmo valor
  function findDuplicate(date: Date, amount: number): string | null {
    for (const existing of existingRecords) {
      const existingDate = new Date(existing.date)
      const diffDays = Math.abs(date.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)
      const amountMatch = Math.abs(existing.amount - amount) < 0.01

      if (diffDays <= 1 && amountMatch) {
        return existing.name
      }
    }
    return null
  }

  // Gerar group_key para cada transação (normalizar descrição para agrupar)
  function generateGroupKey(description: string, isCredit: boolean): string {
    const normalized = description
      .toLowerCase()
      .replace(/[^a-záàâãéèêíïóôõúüç\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return `${isCredit ? 'c' : 'd'}_${normalized}`
  }

  // Criar importação e transações
  const transactionsData = parsedTransactions.map((t) => {
    const categorized = categorizeTransaction(t.description, t.isCredit)
    const duplicateOf = findDuplicate(t.date, t.amount)
    const groupKey = generateGroupKey(categorized.cleanDescription, t.isCredit)

    return {
      date: t.date,
      description: categorized.cleanDescription,
      original_description: t.description,
      amount: t.amount,
      type: duplicateOf ? 'IGNORE' as const : categorized.type,
      category: categorized.category,
      is_credit: t.isCredit,
      is_duplicate: !!duplicateOf,
      duplicate_of: duplicateOf,
      group_key: groupKey,
    }
  })

  const importRecord = await prisma.import.create({
    data: {
      file_name: file.filename,
      month,
      year: yearNum,
      total_transactions: parsedTransactions.length,
      user_id: userId,
      transactions: {
        create: transactionsData,
      },
    },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
    },
  })

  const duplicateCount = transactionsData.filter(t => t.is_duplicate).length

  return reply.status(201).send({
    import: importRecord,
    duplicates_found: duplicateCount,
  })
}
