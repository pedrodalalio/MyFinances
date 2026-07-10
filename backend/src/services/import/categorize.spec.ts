import { describe, expect, it } from 'vitest'
import { categorizeTransaction } from './categorize'

describe('categorizeTransaction — pagamento de fatura do cartão', () => {
  it('ignora o pagamento de fatura do cartão (não vira gasto)', () => {
    // Texto exato do extrato PagBank.
    const result = categorizeTransaction(
      'Cartão de crédito - pagamento de fatura',
      false,
    )
    expect(result.type).toBe('IGNORE')
  })

  it('ignora variações comuns de pagamento de fatura', () => {
    for (const desc of [
      'PAGAMENTO FATURA CARTAO',
      'Pagto fatura cartão de crédito',
      'Pagamento de fatura do cartão',
    ]) {
      expect(categorizeTransaction(desc, false).type).toBe('IGNORE')
    }
  })

  it('NÃO ignora uma fatura comum sem cartão (ex.: luz/água)', () => {
    // "fatura" sozinha, sem contexto de cartão/crédito, continua sendo gasto.
    expect(categorizeTransaction('Pagamento fatura CEMIG energia', false).type).toBe(
      'EXPENSE',
    )
    // "Luz/energia" tem regra própria de gasto (Moradia).
    expect(categorizeTransaction('Energia elétrica CPFL', false).category).toBe(
      'Moradia',
    )
  })

  it('mantém o comportamento padrão para débito/crédito genéricos', () => {
    expect(categorizeTransaction('Compra padaria do zé', false).type).toBe('EXPENSE')
    expect(categorizeTransaction('Pix recebido fulano', true).type).toBe('INCOME')
  })
})
