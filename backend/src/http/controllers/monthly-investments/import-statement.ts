import { FastifyRequest, FastifyReply } from "fastify"
import {
  parseInvestmentStatementPDF,
  type ParsedInvestmentHolding,
} from "@/services/import/parse-investment-statement"
import { parseInvestmentSpreadsheet } from "@/services/import/parse-investment-spreadsheet"
import { matchInvestmentHoldings } from "@/services/import/match-investment-holdings"
import { PrismaInvestmentRepository } from "@/repositories/prisma/prisma-investment-repository"

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

  const result = matchInvestmentHoldings(holdings, candidates)
  for (const { investment, holding } of result.matched) pushMatched(investment, holding)
  for (const holding of result.unmatched) pushUnmatched(holding)

  return reply.status(200).send({
    fileName: file.filename,
    totalRows: holdings.length,
    matched,
    unmatched,
    requestedAt: new Date().toISOString(),
  })
}
