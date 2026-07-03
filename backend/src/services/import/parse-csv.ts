import { dateOnlyUTC } from "@/utils/date"

export interface ParsedTransaction {
  date: Date
  description: string
  amount: number
  isCredit: boolean
}

export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.trim().split('\n')
  const transactions: ParsedTransaction[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Tentar detectar se é header
    const lower = line.toLowerCase()
    if (
      lower.includes('data') && (lower.includes('descri') || lower.includes('histórico') || lower.includes('lançamento')) ||
      lower.includes('date') && lower.includes('description')
    ) {
      continue
    }

    // Tentar parsear como CSV (separadores: ; ou , ou \t)
    let columns: string[]
    if (line.includes(';')) {
      columns = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''))
    } else if (line.includes('\t')) {
      columns = line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''))
    } else {
      columns = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    }

    if (columns.length < 2) continue

    const parsed = tryParseColumns(columns)
    if (parsed) {
      transactions.push(parsed)
    }
  }

  return transactions
}

function tryParseColumns(columns: string[]): ParsedTransaction | null {
  let date: Date | null = null
  let description: string | null = null
  let amount: number | null = null

  for (const col of columns) {
    if (!date) {
      const d = tryParseDate(col)
      if (d) { date = d; continue }
    }

    if (amount === null) {
      const a = tryParseAmount(col)
      if (a !== null) { amount = a; continue }
    }

    if (!description && col.length > 2 && !/^[\d.,\-\/]+$/.test(col)) {
      description = col
    }
  }

  // Segundo passe para description se não achou
  if (!description) {
    for (const col of columns) {
      if (col.length > 2 && !/^[\d.,\-\/]+$/.test(col)) {
        description = col
        break
      }
    }
  }

  if (!date || !description || amount === null) return null

  return {
    date,
    description,
    amount: Math.abs(amount),
    isCredit: amount > 0,
  }
}

function tryParseDate(str: string): Date | null {
  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (brMatch) {
    const day = parseInt(brMatch[1])
    const month = parseInt(brMatch[2])
    const year = parseInt(brMatch[3]) < 100 ? 2000 + parseInt(brMatch[3]) : parseInt(brMatch[3])
    const d = dateOnlyUTC(year, month, day)
    if (!isNaN(d.getTime()) && day >= 1 && day <= 31 && month >= 1 && month <= 12) return d
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const d = dateOnlyUTC(parseInt(isoMatch[1]), parseInt(isoMatch[2]), parseInt(isoMatch[3]))
    if (!isNaN(d.getTime())) return d
  }

  return null
}

function tryParseAmount(str: string): number | null {
  // Remove espaços
  let cleaned = str.trim()
  if (!cleaned) return null

  // Formato brasileiro: 1.234,56 ou -1.234,56
  if (/^-?[\d.]+,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }

  // Formato americano: 1,234.56 ou -1,234.56
  if (/^-?[\d,]+\.\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '')
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }

  // Formato simples: 123.45 ou -123.45 ou 123,45
  cleaned = cleaned.replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}
