import { FastifyRequest, FastifyReply } from "fastify"
import { parseInvestmentStatementPDF } from "@/services/import/parse-investment-statement"
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

  if (!file.filename.toLowerCase().endsWith(".pdf")) {
    return reply
      .status(400)
      .send({ message: "Envie o extrato em PDF." })
  }

  const buffer = await file.toBuffer()
  const holdings = await parseInvestmentStatementPDF(buffer)

  if (holdings.length === 0) {
    return reply.status(400).send({
      message:
        "Não foi possível ler os títulos do extrato. Verifique se é um extrato de renda fixa.",
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
    applied: number
    gross: number
    net: number
    rate: string
  }> = []

  for (const h of holdings) {
    const holdingDay = dayIndex(h.purchaseDate)
    const tolerance = Math.max(0.5, h.applied * 0.001)

    // Casa por data de aplicação (±1 dia, tolerante a fuso) + valor aplicado.
    let best: { inv: (typeof candidates)[number]; score: number } | null = null
    for (const inv of candidates) {
      if (consumed.has(inv.id)) continue
      const dayDiff = Math.abs(dayIndex(inv.purchase_date!) - holdingDay)
      if (dayDiff > 1) continue
      const amountDiff = Math.abs(Number(inv.amount) - h.applied)
      if (amountDiff > tolerance) continue
      const score = dayDiff * 1000 + amountDiff
      if (!best || score < best.score) best = { inv, score }
    }

    if (best) {
      consumed.add(best.inv.id)
      matched.push({
        investmentId: best.inv.id,
        name: best.inv.name,
        paper: h.paper,
        purchaseDate: h.purchaseDate.toISOString(),
        applied: h.applied,
        previousGross:
          best.inv.gross_yield != null ? Number(best.inv.gross_yield) : null,
        previousNet:
          best.inv.net_value != null ? Number(best.inv.net_value) : null,
        newGross: h.gross,
        newNet: h.net,
      })
    } else {
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
  }

  return reply.status(200).send({
    fileName: file.filename,
    totalRows: holdings.length,
    matched,
    unmatched,
    requestedAt: new Date().toISOString(),
  })
}
