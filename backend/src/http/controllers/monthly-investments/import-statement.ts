import { FastifyRequest, FastifyReply } from "fastify"
import {
  parseInvestmentStatementPDF,
  type ParsedInvestmentHolding,
} from "@/services/import/parse-investment-statement"
import { parseInvestmentSpreadsheet } from "@/services/import/parse-investment-spreadsheet"
import { PrismaInvestmentRepository } from "@/repositories/prisma/prisma-investment-repository"

// Índice do dia (em dias desde a época, UTC) para comparar datas ignorando hora.
function dayIndex(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000,
  )
}

/**
 * Recebe um extrato de renda fixa (PDF) e casa cada título do "Resumo das
 * Aplicações" com os investimentos ativos do usuário, sugerindo o novo valor
 * bruto/líquido. NÃO salva nada: devolve os casamentos para o front preencher
 * os campos de rendimento (o usuário confere e clica em Salvar). Isso reaproveita
 * o fluxo de snapshot ao salvar, igual ao "Atualizar cotações" da BRAPI.
 */
export async function importStatement(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const file = await request.file()

  if (!file) {
    return reply.status(400).send({ message: "Nenhum arquivo enviado." })
  }

  const fileName = file.filename.toLowerCase()
  const isPdf = fileName.endsWith(".pdf")
  const isSpreadsheet = fileName.endsWith(".xlsx") || fileName.endsWith(".csv")

  if (!isPdf && !isSpreadsheet) {
    return reply
      .status(400)
      .send({ message: "Envie o extrato em PDF, Excel (.xlsx) ou CSV." })
  }

  const buffer = await file.toBuffer()
  const holdings = isPdf
    ? await parseInvestmentStatementPDF(buffer)
    : await parseInvestmentSpreadsheet(buffer, fileName)

  if (holdings.length === 0) {
    return reply.status(400).send({
      message: isPdf
        ? "Não foi possível ler os títulos do extrato. Verifique se é um extrato de renda fixa."
        : "Não foi possível ler a planilha. Verifique se há uma linha de cabeçalho com, no mínimo, as colunas: data de aplicação e valor bruto (ou líquido).",
    })
  }

  const investmentRepository = new PrismaInvestmentRepository()
  const all = await investmentRepository.findAllPortfolioByUser(request.user.sub)

  // Candidatos: ativos de renda fixa (ETF/FII/Ações têm ticker e preço unitário,
  // não casam com V. Aplicado).
  const candidates = all.filter(
    (inv) =>
      inv.status === "ACTIVE" &&
      inv.purchase_date != null &&
      inv.investment_type !== "ETF" &&
      inv.investment_type !== "FII" &&
      inv.investment_type !== "STOCKS",
  )

  type Candidate = (typeof candidates)[number]

  const consumed = new Set<string>()
  const matched: Array<{
    investmentId: string
    name: string
    paper: string
    purchaseDate: string
    applied: number
    previousGross: number | null
    previousNet: number | null
    newGross: number
    newNet: number
  }> = []
  const unmatched: Array<{
    paper: string
    purchaseDate: string
    maturityDate: string
    applied: number | null
    gross: number
    net: number
    rate: string
  }> = []

  function pushMatched(inv: Candidate, h: ParsedInvestmentHolding) {
    consumed.add(inv.id)
    matched.push({
      investmentId: inv.id,
      name: inv.name,
      paper: h.paper,
      purchaseDate: h.purchaseDate.toISOString(),
      applied: h.applied ?? Number(inv.amount),
      previousGross: inv.gross_yield != null ? Number(inv.gross_yield) : null,
      previousNet: inv.net_value != null ? Number(inv.net_value) : null,
      newGross: h.gross,
      newNet: h.net,
    })
  }

  function pushUnmatched(h: ParsedInvestmentHolding) {
    unmatched.push({
      paper: h.paper,
      purchaseDate: h.purchaseDate.toISOString(),
      maturityDate: h.maturityDate.toISOString(),
      applied: h.applied,
      gross: h.gross,
      net: h.net,
      rate: h.rate,
    })
  }

  // A planilha/extrato pode ou não trazer o "valor aplicado". Se trouxer,
  // casamos por data (±1 dia) + valor aplicado (preciso). Se não, casamos só
  // pela data de aplicação.
  const hasAppliedColumn = holdings.some((h) => h.applied != null)

  if (hasAppliedColumn) {
    for (const h of holdings) {
      if (h.applied == null) {
        pushUnmatched(h)
        continue
      }
      const holdingDay = dayIndex(h.purchaseDate)
      const applied = h.applied
      const tolerance = Math.max(0.5, applied * 0.001)

      let best: { inv: Candidate; score: number } | null = null
      for (const inv of candidates) {
        if (consumed.has(inv.id)) continue
        const dayDiff = Math.abs(dayIndex(inv.purchase_date!) - holdingDay)
        if (dayDiff > 1) continue
        const amountDiff = Math.abs(Number(inv.amount) - applied)
        if (amountDiff > tolerance) continue
        const score = dayDiff * 1000 + amountDiff
        if (!best || score < best.score) best = { inv, score }
      }

      if (best) pushMatched(best.inv, h)
      else pushUnmatched(h)
    }
  } else {
    // Modo por data: agrupa títulos e investimentos pela data de aplicação.
    // Quando há mais de um na mesma data, desempata pareando por ordem de
    // grandeza (maior bruto atual ↔ maior valor aplicado), o que bate quando
    // são da mesma data e taxa.
    const candByDay = new Map<number, Candidate[]>()
    for (const inv of candidates) {
      const key = dayIndex(inv.purchase_date!)
      const list = candByDay.get(key) ?? []
      list.push(inv)
      candByDay.set(key, list)
    }

    const holdingsByDay = new Map<number, ParsedInvestmentHolding[]>()
    for (const h of holdings) {
      const key = dayIndex(h.purchaseDate)
      const list = holdingsByDay.get(key) ?? []
      list.push(h)
      holdingsByDay.set(key, list)
    }

    for (const [day, hs] of holdingsByDay) {
      const cands = (candByDay.get(day) ?? []).filter((c) => !consumed.has(c.id))
      const hsSorted = [...hs].sort((a, b) => a.gross - b.gross)
      const candSorted = [...cands].sort(
        (a, b) => Number(a.amount) - Number(b.amount),
      )
      hsSorted.forEach((h, i) => {
        const inv = candSorted[i]
        if (inv) pushMatched(inv, h)
        else pushUnmatched(h)
      })
    }
  }

  return reply.status(200).send({
    fileName: file.filename,
    totalRows: holdings.length,
    matched,
    unmatched,
    requestedAt: new Date().toISOString(),
  })
}
