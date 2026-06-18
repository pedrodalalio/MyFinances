import { FastifyRequest, FastifyReply } from "fastify"
import { prisma } from "@/lib/prisma"
import { parseCSV } from "@/services/import/parse-csv"
import { parseOFX } from "@/services/import/parse-ofx"
import { parsePDF } from "@/services/import/parse-pdf"
import { categorizeTransaction } from "@/services/import/categorize"
import { fetchExistingRecords, matchTransactions } from "@/services/import/match"

export async function upload(request: FastifyRequest, reply: FastifyReply) {
  const file = await request.file()

  if (!file) {
    return reply.status(400).send({ message: "Nenhum arquivo enviado." })
  }

  const buffer = await file.toBuffer()
  const fileName = file.filename.toLowerCase()

  // Detectar formato e parsear
  let parsedTransactions
  if (fileName.endsWith(".pdf")) {
    parsedTransactions = await parsePDF(buffer)
  } else if (fileName.endsWith(".ofx") || fileName.endsWith(".ofc")) {
    parsedTransactions = parseOFX(buffer.toString("utf-8"))
  } else {
    // CSV, TXT ou qualquer outro formato texto
    parsedTransactions = parseCSV(buffer.toString("utf-8"))
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

  // Gerar group_key para cada transação (normalizar descrição para agrupar)
  function generateGroupKey(description: string, isCredit: boolean): string {
    const normalized = description
      .toLowerCase()
      .replace(/[^a-záàâãéèêíïóôõúüç\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return `${isCredit ? 'c' : 'd'}_${normalized}`
  }

  // Categorizar e montar dados base (com um id temporário para a conciliação)
  const prepared = parsedTransactions.map((t, index) => {
    const categorized = categorizeTransaction(t.description, t.isCredit)
    const groupKey = generateGroupKey(categorized.cleanDescription, t.isCredit)
    return {
      tempId: String(index),
      parsed: t,
      categorized,
      groupKey,
    }
  })

  // Conciliar com o que já está cadastrado no mês (gastos, entradas,
  // investimentos, impostos, gastos fixos e salário). Casa individualmente e
  // por total de grupo (ex.: dois Pix de 280 = um gasto de 560).
  const existingRecords = await fetchExistingRecords(userId, month, yearNum)
  const { duplicates, orphans } = matchTransactions(
    existingRecords,
    prepared.map((p) => ({
      id: p.tempId,
      amount: p.parsed.amount,
      isCredit: p.parsed.isCredit,
      groupKey: p.groupKey,
    })),
  )

  const transactionsData = prepared.map((p) => {
    const duplicateOf = duplicates.get(p.tempId) ?? null
    return {
      date: p.parsed.date,
      description: p.categorized.cleanDescription,
      original_description: p.parsed.description,
      amount: p.parsed.amount,
      type: duplicateOf ? ('IGNORE' as const) : p.categorized.type,
      category: p.categorized.category,
      is_credit: p.parsed.isCredit,
      is_duplicate: !!duplicateOf,
      duplicate_of: duplicateOf,
      group_key: p.groupKey,
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
    orphans,
  })
}
