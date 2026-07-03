import { ParsedTransaction } from './parse-csv'
import { dateOnlyUTC } from "@/utils/date"

export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // OFX usa tags SGML - extrair transações entre <STMTTRN> e </STMTTRN>
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1]

    const dateMatch = block.match(/<DTPOSTED>(\d{8})/)
    const amountMatch = block.match(/<TRNAMT>([-\d.,]+)/)
    const memoMatch = block.match(/<MEMO>([^\n<]+)/)
    const nameMatch = block.match(/<NAME>([^\n<]+)/)

    if (!dateMatch || !amountMatch) continue

    const dateStr = dateMatch[1]
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6))
    const day = parseInt(dateStr.substring(6, 8))
    const date = dateOnlyUTC(year, month, day)

    if (isNaN(date.getTime())) continue

    const amount = parseFloat(amountMatch[1].replace(',', '.'))
    if (isNaN(amount)) continue

    const description = (memoMatch?.[1] || nameMatch?.[1] || 'Sem descrição').trim()

    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      isCredit: amount > 0,
    })
  }

  return transactions
}
