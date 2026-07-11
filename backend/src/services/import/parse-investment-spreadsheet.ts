import ExcelJS from "exceljs"
import { dateOnlyUTC } from "@/utils/date"
import type { ParsedInvestmentHolding } from "./parse-investment-statement"

// Valor de célula que o leitor de planilha pode devolver: texto, número, data
// ou vazio. Fórmulas/rich text são normalizados para primitivo antes de chegar
// aqui (ver cellToPrimitive).
type Cell = string | number | Date | null

// Campos que sabemos extrair de cada linha. Só data + aplicado + (bruto OU
// líquido) são obrigatórios para casar/atualizar um investimento.
type Field = "purchaseDate" | "applied" | "gross" | "net" | "rate" | "name"

// Normaliza cabeçalho: minúsculas, sem acento, só letras/números e espaços.
// "Data de Aplicação" -> "data de aplicacao"; "V. Bruto (R$)" -> "v bruto r".
function normalizeHeader(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

// Classifica um cabeçalho num campo. A ordem importa: "líquido"/"bruto" antes
// de "aplicado", e "data" antes de tudo. Em PT-BR o principal costuma ser
// "aplicado" (particípio) e a data "aplicação" (substantivo), então não
// colidem — mas checamos "data" primeiro por segurança.
function classifyHeader(h: string): Field | null {
  if (!h) return null
  if (/liquido/.test(h)) return "net"
  if (/bruto|valor atual|saldo bruto|valor bruto/.test(h)) return "gross"
  if (/\bdata\b|emissao|compra|aplicacao/.test(h)) return "purchaseDate"
  if (/aplicado|principal|investido/.test(h)) return "applied"
  if (/rentab|taxa|rendimento|indexador|percentual|cdi/.test(h)) return "rate"
  if (/nome|papel|titulo|ativo|descricao|produto|emissor/.test(h)) return "name"
  return null
}

// Converte "1.234,56" (BR) ou "1,234.56" (US) ou "1234.56"/"1234,56" em número.
// Aceita "R$", espaços e sinal. Retorna null quando não há número.
function parseAmount(value: Cell): number | null {
  if (typeof value === "number") return isFinite(value) ? value : null
  if (value == null) return null
  let s = String(value).trim()
  if (!s) return null
  s = s.replace(/r\$/i, "").replace(/\s/g, "")
  const neg = /^-/.test(s)
  s = s.replace(/[^0-9.,]/g, "")
  if (!s) return null

  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")
  if (lastComma > -1 && lastDot > -1) {
    // O separador decimal é o que aparecer por último.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".")
    else s = s.replace(/,/g, "")
  } else if (lastComma > -1) {
    // Só vírgula: decimal BR (a menos que seja separador de milhar "1,234").
    const decimals = s.length - lastComma - 1
    if (decimals === 3 && !/,\d{1,2}$/.test(s)) s = s.replace(/,/g, "")
    else s = s.replace(",", ".")
  }
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return neg ? -n : n
}

// Converte a célula de data em Date (meio-dia UTC). Aceita Date já pronto (do
// xlsx), "dd/mm/aaaa", "dd-mm-aaaa" e ISO "aaaa-mm-dd".
function parseCellDate(value: Cell): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return dateOnlyUTC(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    )
  }
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null

  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (br) {
    const day = Number(br[1])
    const month = Number(br[2])
    const year = Number(br[3]) < 100 ? 2000 + Number(br[3]) : Number(br[3])
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return dateOnlyUTC(year, month, day)
    }
  }

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return dateOnlyUTC(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  return null
}

// Constrói os títulos a partir de uma matriz de linhas (cabeçalho + dados).
// Detecta a linha de cabeçalho como a primeira que tenha, no mínimo, colunas de
// data, aplicado e (bruto ou líquido). Linhas sem esses valores são ignoradas.
function buildHoldings(rows: Cell[][]): ParsedInvestmentHolding[] {
  let headerRow = -1
  let cols: Partial<Record<Field, number>> = {}

  for (let i = 0; i < rows.length; i++) {
    const map: Partial<Record<Field, number>> = {}
    rows[i].forEach((cell, idx) => {
      const field = classifyHeader(normalizeHeader(cell))
      // Primeira coluna vence em caso de cabeçalhos repetidos.
      if (field && map[field] === undefined) map[field] = idx
    })
    if (
      map.purchaseDate !== undefined &&
      map.applied !== undefined &&
      (map.gross !== undefined || map.net !== undefined)
    ) {
      headerRow = i
      cols = map
      break
    }
  }

  if (headerRow === -1) return []

  const holdings: ParsedInvestmentHolding[] = []
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    const at = (f?: number): Cell => (f === undefined ? null : (row[f] ?? null))

    const purchaseDate = parseCellDate(at(cols.purchaseDate))
    const applied = parseAmount(at(cols.applied))
    let gross = parseAmount(at(cols.gross))
    let net = parseAmount(at(cols.net))

    if (!purchaseDate || applied == null || applied <= 0) continue
    if (gross == null && net == null) continue
    // Só um dos dois preenchido: assume iguais (ex.: sem IR retido ainda).
    if (gross == null) gross = net!
    if (net == null) net = gross

    const name = cols.name !== undefined ? String(at(cols.name) ?? "").trim() : ""
    const rate = cols.rate !== undefined ? String(at(cols.rate) ?? "").trim() : ""

    holdings.push({
      paper: name,
      issuer: "",
      rate,
      purchaseDate,
      maturityDate: purchaseDate,
      applied,
      gross,
      ir: 0,
      iof: 0,
      net,
    })
  }

  return holdings
}

// Normaliza o valor de uma célula do exceljs (fórmula/rich text/hyperlink) para
// primitivo.
function cellToPrimitive(value: unknown): Cell {
  if (value == null) return null
  if (value instanceof Date) return value
  if (typeof value === "object") {
    const v = value as Record<string, unknown>
    if (v.result !== undefined) return cellToPrimitive(v.result) // fórmula
    if (typeof v.text === "string") return v.text // hyperlink
    if (Array.isArray(v.richText)) {
      return (v.richText as Array<{ text?: string }>)
        .map((t) => t.text ?? "")
        .join("")
    }
    return null
  }
  return value as Cell
}

// Faz o parse de uma planilha .xlsx (primeira aba) em títulos.
async function parseXlsx(buffer: Buffer): Promise<ParsedInvestmentHolding[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  if (!ws) return []

  const rows: Cell[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    // row.values é 1-indexado; a posição 0 vem vazia.
    const values = (row.values as unknown[]) ?? []
    rows.push(values.slice(1).map(cellToPrimitive))
  })
  return buildHoldings(rows)
}

// Faz o parse de um CSV (separador ; , ou tab) em títulos.
function parseCsv(content: string): ParsedInvestmentHolding[] {
  const lines = content.replace(/^﻿/, "").split(/\r?\n/)
  const rows: Cell[][] = []
  for (const line of lines) {
    if (!line.trim()) continue
    const delimiter = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ","
    const cells = line
      .split(delimiter)
      .map((c) => c.trim().replace(/^"|"$/g, ""))
    rows.push(cells)
  }
  return buildHoldings(rows)
}

/**
 * Faz o parse de uma planilha de investimentos que o próprio usuário monta
 * (.xlsx ou .csv) e a converte no mesmo formato do parser de PDF, para
 * reaproveitar o casamento por data de aplicação + valor aplicado.
 *
 * Colunas reconhecidas pelo cabeçalho (acentos/maiúsculas ignorados):
 *   - Data de aplicação  (data | emissão | compra)                [obrigatória]
 *   - Valor aplicado     (aplicado | principal | investido)       [obrigatória]
 *   - Valor bruto        (bruto | valor atual)          [bruto OU líquido]
 *   - Valor líquido      (líquido)                        [bruto OU líquido]
 *   - Rentabilidade      (rentabilidade | taxa | CDI ...)         [opcional]
 *   - Nome/Papel         (nome | papel | título | ativo ...)      [opcional]
 */
export async function parseInvestmentSpreadsheet(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedInvestmentHolding[]> {
  if (fileName.toLowerCase().endsWith(".csv")) {
    return parseCsv(buffer.toString("utf-8"))
  }
  return parseXlsx(buffer)
}
