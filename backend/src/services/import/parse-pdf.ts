// Importa direto o lib interno para evitar o código de debug do index.js do
// pdf-parse, que tenta ler um PDF de teste quando rodando como módulo ESM.
import pdf from "pdf-parse/lib/pdf-parse.js"
import { ParsedTransaction } from "./parse-csv"

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdf(buffer)
  return parsePagBankStatement(data.text)
}

/**
 * Converte um valor no formato brasileiro ("1.234,56") em número.
 */
function parseBrazilianAmount(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

/**
 * Parser do extrato do PagBank (PDF). O texto extraído pelo pdf-parse cola a
 * data na descrição e o valor logo em seguida, por linha:
 *   "01/06/2026Pix enviado - Yoli Donizetti Da Silva-R$ 15,00"
 *   "05/06/2026Pix recebido - Yoli Donizetti Da SilvaR$ 78,00"
 * As linhas de saldo vêm com outro layout ("Saldo do dia{data}R$ ...") e por
 * não começarem com a data são naturalmente descartadas.
 * Tratamos o sinal: "-R$" = saída (débito), "R$" = entrada (crédito).
 *
 * Exportado separadamente do parsePDF para permitir testar sem precisar de PDF.
 */
export function parsePagBankStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Valor no fim da linha, com sinal opcional ( - / − ) antes do "R$".
  const valueAtEnd = /([-−])?\s*R\$\s*([\d.]+,\d{2})\s*$/
  // Data no início (colada na descrição, sem espaço obrigatório).
  const lineStart = /^(\d{2})\/(\d{2})\/(\d{4})(.+)$/

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    const head = line.match(lineStart)
    if (!head) continue

    const [, dd, mm, yyyy, rest] = head
    const value = rest.match(valueAtEnd)
    if (!value) continue

    const description = rest.slice(0, value.index).trim()
    if (!description) continue
    // "Saldo do dia" é só o saldo corrente, não um lançamento.
    if (/^saldo do dia$/i.test(description)) continue

    const day = parseInt(dd)
    const month = parseInt(mm)
    const year = parseInt(yyyy)
    const amount = parseBrazilianAmount(value[2])
    if (amount === 0) continue

    const isCredit = !value[1] // sem sinal de menos = entrada

    transactions.push({
      date: new Date(year, month - 1, day, 12, 0, 0),
      description,
      amount,
      isCredit,
    })
  }

  return transactions
}
