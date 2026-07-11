import { describe, expect, it } from "vitest"
import ExcelJS from "exceljs"
import { parseInvestmentSpreadsheet } from "./parse-investment-spreadsheet"

describe("parseInvestmentSpreadsheet — CSV", () => {
  it("lê colunas em PT-BR (separador ;) e casa data/aplicado/bruto/líquido", async () => {
    const csv = [
      "Nome;Data de aplicacao;Valor aplicado;Valor bruto;Valor liquido;Rentabilidade",
      "CDB LD 3;13/09/2024;1.500,00;1.964,06;1.882,85;119% CDI",
    ].join("\n")

    const holdings = await parseInvestmentSpreadsheet(
      Buffer.from(csv, "utf-8"),
      "modelo.csv",
    )

    expect(holdings).toHaveLength(1)
    const h = holdings[0]
    expect(h.paper).toBe("CDB LD 3")
    expect(h.applied).toBeCloseTo(1500)
    expect(h.gross).toBeCloseTo(1964.06)
    expect(h.net).toBeCloseTo(1882.85)
    expect(h.rate).toBe("119% CDI")
    // Meio-dia UTC de 13/09/2024
    expect(h.purchaseDate.toISOString()).toBe("2024-09-13T12:00:00.000Z")
  })

  it("aceita cabeçalho com acento e BOM, e separador vírgula", async () => {
    const csv = [
      "﻿Data de aplicação,Valor aplicado,Valor bruto",
      "2024-09-13,1500.00,1964.06",
    ].join("\n")

    const holdings = await parseInvestmentSpreadsheet(
      Buffer.from(csv, "utf-8"),
      "planilha.csv",
    )

    expect(holdings).toHaveLength(1)
    expect(holdings[0].applied).toBeCloseTo(1500)
    expect(holdings[0].gross).toBeCloseTo(1964.06)
    // Sem coluna de líquido: assume igual ao bruto.
    expect(holdings[0].net).toBeCloseTo(1964.06)
  })

  it("ignora linhas sem data ou sem valores e sem cabeçalho retorna vazio", async () => {
    const semCabecalho = "13/09/2024;1500,00;1964,06"
    expect(
      await parseInvestmentSpreadsheet(Buffer.from(semCabecalho), "x.csv"),
    ).toHaveLength(0)

    const comLinhaInvalida = [
      "Data de aplicacao;Valor aplicado;Valor bruto",
      ";;", // linha vazia
      "13/09/2024;;", // sem valores
      "13/09/2024;1500,00;1964,06", // válida
    ].join("\n")
    expect(
      await parseInvestmentSpreadsheet(Buffer.from(comLinhaInvalida), "x.csv"),
    ).toHaveLength(1)
  })
})

describe("parseInvestmentSpreadsheet — XLSX", () => {
  it("lê a primeira aba com células numéricas e de data nativas", async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Rendimentos")
    ws.addRow([
      "Nome",
      "Data de aplicação",
      "Valor aplicado",
      "Valor bruto",
      "Valor líquido",
    ])
    ws.addRow([
      "CDB POS 58",
      new Date(Date.UTC(2024, 8, 13)),
      1500,
      1964.06,
      1882.85,
    ])
    const buffer = Buffer.from(await wb.xlsx.writeBuffer())

    const holdings = await parseInvestmentSpreadsheet(buffer, "carteira.xlsx")

    expect(holdings).toHaveLength(1)
    const h = holdings[0]
    expect(h.paper).toBe("CDB POS 58")
    expect(h.applied).toBeCloseTo(1500)
    expect(h.gross).toBeCloseTo(1964.06)
    expect(h.net).toBeCloseTo(1882.85)
    expect(h.purchaseDate.getUTCFullYear()).toBe(2024)
    expect(h.purchaseDate.getUTCMonth() + 1).toBe(9)
    expect(h.purchaseDate.getUTCDate()).toBe(13)
  })
})
