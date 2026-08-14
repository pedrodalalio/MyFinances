import { describe, expect, it } from "vitest"
import { matchInvestmentHoldings, type HoldingCandidate } from "./match-investment-holdings"
import type { ParsedInvestmentHolding } from "./parse-investment-statement"

function holding(over: Partial<ParsedInvestmentHolding> = {}): ParsedInvestmentHolding {
  return {
    paper: "CDB LD",
    issuer: "BancoSeguro",
    rate: "103,0 % CDI CETIP",
    purchaseDate: new Date("2025-09-08T12:00:00Z"),
    maturityDate: new Date("2027-09-09T12:00:00Z"),
    applied: 1000,
    gross: 1139.83,
    ir: 27.96,
    iof: 0,
    net: 1111.87,
    ...over,
  }
}

function candidate(over: Partial<HoldingCandidate> = {}): HoldingCandidate {
  return {
    id: "inv-1",
    purchase_date: new Date("2025-09-08T12:00:00Z"),
    maturity_date: new Date("2027-09-09T12:00:00Z"),
    amount: 1000,
    gross_yield: 1125.18,
    net_value: 1100.15,
    ...over,
  }
}

describe("matchInvestmentHoldings", () => {
  it("casa pelo par exato data + valor aplicado", () => {
    const { matched, unmatched } = matchInvestmentHoldings([holding()], [candidate()])

    expect(unmatched).toHaveLength(0)
    expect(matched[0].investment.id).toBe("inv-1")
  })

  it("aceita ±1 dia de diferença na data de aplicação", () => {
    const inv = candidate({ purchase_date: new Date("2025-09-09T12:00:00Z") })

    expect(matchInvestmentHoldings([holding()], [inv]).matched).toHaveLength(1)
  })

  it("casa mesmo depois de resgate parcial, quando o aplicado não bate mais", () => {
    // O PagBank continua dizendo 555,50; o app já reduziu o amount para 288,86
    // ao registrar o saque. Só data de aplicação e vencimento sobrevivem.
    const h = holding({ applied: 555.5, gross: 426.97, net: 416.5 })
    const inv = candidate({ id: "sacado", amount: 288.86, gross_yield: 296.4, net_value: 290.1 })

    const { matched, unmatched } = matchInvestmentHoldings([h], [inv])

    expect(unmatched).toHaveLength(0)
    expect(matched[0].investment.id).toBe("sacado")
  })

  it("não rouba um investimento de outra data só porque o aplicado bate", () => {
    const inv = candidate({ purchase_date: new Date("2025-10-07T12:00:00Z") })

    const { matched, unmatched } = matchInvestmentHoldings([holding()], [inv])

    expect(matched).toHaveLength(0)
    expect(unmatched).toHaveLength(1)
  })

  it("respeita o vencimento quando os dois lados o conhecem", () => {
    // Mesma data de aplicação, vencimento diferente: são títulos distintos.
    const inv = candidate({ amount: 999, maturity_date: new Date("2030-01-01T12:00:00Z") })

    expect(matchInvestmentHoldings([holding({ applied: 555.5 })], [inv]).unmatched).toHaveLength(1)
  })

  it("o par exato tem prioridade sobre o casamento por datas", () => {
    // Dois títulos na mesma data e vencimento: um intacto (1000) e um sacado.
    // O intacto casa por valor na 1ª passada e sobra o certo para o outro.
    const intacto = holding()
    const sacado = holding({ applied: 555.5, gross: 426.97, net: 416.5 })
    const invIntacto = candidate({ id: "intacto", amount: 1000, gross_yield: 1125.18 })
    const invSacado = candidate({ id: "sacado", amount: 288.86, gross_yield: 296.4 })

    const { matched, unmatched } = matchInvestmentHoldings(
      [sacado, intacto],
      [invSacado, invIntacto],
    )

    expect(unmatched).toHaveLength(0)
    expect(matched.find((m) => m.holding === intacto)!.investment.id).toBe("intacto")
    expect(matched.find((m) => m.holding === sacado)!.investment.id).toBe("sacado")
  })

  it("empate na 2ª passada fica com o valor atual mais próximo do bruto", () => {
    const h = holding({ applied: 555.5, gross: 426.97, net: 416.5 })
    const longe = candidate({ id: "longe", amount: 900, gross_yield: 1120 })
    const perto = candidate({ id: "perto", amount: 300, gross_yield: 430 })

    const { matched } = matchInvestmentHoldings([h], [longe, perto])

    expect(matched[0].investment.id).toBe("perto")
  })

  it("um investimento não pode casar com dois títulos", () => {
    const a = holding({ applied: 555.5, gross: 426.97 })
    const b = holding({ applied: 777.7, gross: 800 })

    const { matched, unmatched } = matchInvestmentHoldings([a, b], [candidate()])

    expect(matched).toHaveLength(1)
    expect(unmatched).toHaveLength(1)
  })

  it("planilha sem vencimento casa só pela data de aplicação", () => {
    // O parser de planilha repete a data de aplicação no campo de vencimento;
    // usar isso como filtro barraria tudo.
    const h = holding({
      applied: null,
      maturityDate: new Date("2025-09-08T12:00:00Z"),
      gross: 1139.83,
    })

    expect(matchInvestmentHoldings([h], [candidate()]).matched).toHaveLength(1)
  })

  it("ignora investimento sem data de compra", () => {
    const inv = candidate({ purchase_date: null })

    expect(matchInvestmentHoldings([holding()], [inv]).unmatched).toHaveLength(1)
  })
})
