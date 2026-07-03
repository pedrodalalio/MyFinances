// Importa direto o lib interno para evitar o código de debug do index.js do
// pdf-parse, que tenta ler um PDF de teste quando rodando como módulo ESM.
import pdf from "pdf-parse/lib/pdf-parse.js"
import { dateOnlyUTC } from "@/utils/date"

export interface ParsedInvestmentHolding {
  paper: string // "CDB LD 3"
  issuer: string // "BancoSeguro"
  rate: string // "103,0 % CDI CETIP" (texto da taxa)
  purchaseDate: Date // Emissão
  maturityDate: Date // Vencimento
  applied: number // V. Aplicado (principal)
  gross: number // V. Bruto (valor atual)
  ir: number // Imposto de Renda retido
  iof: number // IOF retido
  net: number // V. Líquido (valor atual líquido)
}

function parseBrazilianAmount(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

// Datas em UTC ao meio-dia para evitar deslocamento de fuso ao comparar/exibir.
function parseDate(dd: string, mm: string, yyyy: string): Date {
  return dateOnlyUTC(Number(yyyy), Number(mm), Number(dd))
}

// Cada título da tabela "Resumo das Aplicações" sai do pdf-parse numa única
// linha, com as colunas embaralhadas e sem separador:
//   "1.964,06119,0 % CDI CETIP1.500,0081,210,001.882,8513/09/202414/09/2026CDB POS 58BancoSeguro"
//    └V.Bruto┘└─taxa──────────┘└V.Aplic┘└IR─┘└IOF┘└V.Líquido┘└Emissão─┘└Vencto──┘└─Papel──┘└Emissor┘
// O emissor é um único token sem espaços/dígitos no fim da linha; o papel pode
// conter espaços e dígitos (ex.: "CDB POS 58"), por isso o capturamos de forma
// não-gulosa antes do emissor.
const HOLDING_RE =
  /^([\d.]+,\d{2})(\d+,\d+)\s*%\s*(.+?)([\d.]+,\d{2})([\d.]+,\d{2})([\d.]+,\d{2})([\d.]+,\d{2})(\d{2})\/(\d{2})\/(\d{4})(\d{2})\/(\d{2})\/(\d{4})(.+?)([A-Za-zÀ-ÿ]+)$/

/**
 * Faz o parse do "Resumo das Aplicações" de um extrato de renda fixa
 * (testado com o extrato do BancoSeguro). Linhas que não casam o padrão de
 * título (cabeçalho, movimentações, totais, "Static text") são ignoradas.
 *
 * Exportado separadamente do parse via PDF para permitir testar sem PDF.
 */
export function parseFixedIncomeStatement(text: string): ParsedInvestmentHolding[] {
  const holdings: ParsedInvestmentHolding[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    const m = line.match(HOLDING_RE)
    if (!m) continue

    const [
      ,
      gross,
      rate,
      index,
      applied,
      ir,
      iof,
      net,
      ed,
      em,
      ey,
      vd,
      vm,
      vy,
      paper,
      issuer,
    ] = m

    const appliedValue = parseBrazilianAmount(applied)
    if (appliedValue <= 0) continue

    holdings.push({
      paper: paper.trim(),
      issuer: issuer.trim(),
      rate: `${rate} % ${index.trim()}`.replace(/\s+/g, " ").trim(),
      purchaseDate: parseDate(ed, em, ey),
      maturityDate: parseDate(vd, vm, vy),
      applied: appliedValue,
      gross: parseBrazilianAmount(gross),
      ir: parseBrazilianAmount(ir),
      iof: parseBrazilianAmount(iof),
      net: parseBrazilianAmount(net),
    })
  }

  return holdings
}

export async function parseInvestmentStatementPDF(
  buffer: Buffer,
): Promise<ParsedInvestmentHolding[]> {
  const data = await pdf(buffer)
  return parseFixedIncomeStatement(data.text)
}
