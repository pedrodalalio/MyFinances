import { InvestmentRepository } from '@/repositories/investment-repository'
import { IncomeRepository } from '@/repositories/income-repository'
import { prisma } from '@/lib/prisma'
import { Investment, Prisma } from '@prisma/client'
import { investmentOutflow, toDecimal, ZERO } from './utils/money'

interface RedeemInvestmentRequest {
  investmentId: string
  userId: string
  finalValue: number
  redeemDate?: Date
  // Resgate parcial: retira só uma parte e mantém a aplicação ativa com o resto.
  // Só faz sentido em renda fixa — ETF/FII são precificados por cota.
  partial?: boolean
  // Quanto a aplicação vale HOJE, informado na hora do resgate. O net_value
  // guardado costuma estar defasado (rendimento é atualizado ~1x por mês), e é
  // ele que define a fatia principal/rendimento do saque parcial. Informar aqui
  // corrige a divisão e de quebra atualiza a posição.
  currentValue?: number
}

export interface RedeemOutcome {
  // false quando o resgate parcial consumiu a posição inteira e virou total
  partial: boolean
  redeemedValue: number
  principalWithdrawn: number
  yieldWithdrawn: number
  // Quanto entrou como receita do mês (0 quando é reserva sem rendimento)
  incomeAmount: number
  remainingAmount: number
  remainingNetValue: number
}

interface RedeemInvestmentResponse {
  investment: Investment
  outcome: RedeemOutcome
}

export const PARTIAL_NOT_SUPPORTED_MESSAGE =
  'Resgate parcial não é suportado para ETF/FII — venda a posição inteira'

const money = (value: Prisma.Decimal) => value.toDecimalPlaces(2)

export class RedeemInvestmentService {
  constructor(
    private investmentRepository: InvestmentRepository,
    private incomeRepository: IncomeRepository
  ) {}

  async execute({
    investmentId,
    userId,
    finalValue,
    redeemDate,
    partial,
    currentValue: informedValue
  }: RedeemInvestmentRequest): Promise<RedeemInvestmentResponse> {
    const investment = await this.investmentRepository.findById(investmentId)

    if (!investment) {
      throw new Error('Investimento não encontrado')
    }

    if (investment.user_id !== userId) {
      throw new Error('Investimento não pertence ao usuário')
    }

    if (investment.status !== 'ACTIVE') {
      throw new Error('Investimento não está ativo')
    }

    const isUnitPriced =
      investment.investment_type === 'ETF' || investment.investment_type === 'FII'

    if (partial && isUnitPriced) {
      throw new Error(PARTIAL_NOT_SUPPORTED_MESSAGE)
    }

    // Aplicado: em ETF/FII o amount é o preço da cota, então o desembolso real
    // é amount × quantidade.
    const principal = investmentOutflow(investment)
    const storedGrossYield = investment.gross_yield ? toDecimal(investment.gross_yield) : null
    // Valor de mercado registrado; sem acompanhamento de rendimento, cai no aplicado
    const storedValue = investment.net_value
      ? toDecimal(investment.net_value)
      : (storedGrossYield ?? principal)
    // O valor informado na hora do resgate manda — o registrado pode estar
    // meses atrasado.
    const currentValue =
      informedValue !== undefined ? money(toDecimal(informedValue)) : storedValue
    // Bruto acompanha o mesmo salto do líquido, senão a atualização deixaria os
    // dois em épocas diferentes.
    const refreshRatio = storedValue.gt(ZERO) ? currentValue.div(storedValue) : new Prisma.Decimal(1)
    const grossYield = storedGrossYield ? storedGrossYield.mul(refreshRatio) : null
    const redeemed = money(toDecimal(finalValue))

    if (partial && redeemed.lte(ZERO)) {
      throw new Error('Valor do resgate parcial deve ser maior que zero')
    }

    // Tirar tudo (ou mais do que a posição vale) é resgate total, não parcial
    const isPartial = Boolean(partial) && currentValue.gt(ZERO) && redeemed.lt(currentValue)

    const effectiveDate = redeemDate ?? investment.maturity_date ?? new Date()
    const month = String(effectiveDate.getUTCMonth() + 1).padStart(2, '0')
    const year = effectiveDate.getUTCFullYear()

    // Fatia da posição que está saindo. O principal sai proporcionalmente ao
    // valor de mercado retirado — o resto (rendimento) é o ganho realizado.
    const fraction = isPartial ? redeemed.div(currentValue) : new Prisma.Decimal(1)
    const principalWithdrawn = isPartial ? money(principal.mul(fraction)) : principal
    const yieldWithdrawn = redeemed.sub(principalWithdrawn)

    const remainingAmount = isPartial ? money(principal.sub(principalWithdrawn)) : ZERO
    const remainingNetValue = isPartial ? money(currentValue.sub(redeemed)) : ZERO
    const remainingGrossYield =
      isPartial && grossYield ? money(grossYield.mul(new Prisma.Decimal(1).sub(fraction))) : null

    await prisma.investmentSnapshot.create({
      data: {
        investment_id: investmentId,
        gross_yield: isPartial ? (remainingGrossYield ?? remainingNetValue) : redeemed,
        net_value: isPartial ? remainingNetValue : redeemed,
        recorded_at: effectiveDate
      }
    })

    // Reserva (liquidez diária) nunca saiu do saldo na aplicação — ver
    // month-summary.ts. Trazer o valor cheio de volta como receita contaria o
    // principal duas vezes; só o rendimento realizado é entrada nova.
    const incomeAmount = investment.is_reserve ? yieldWithdrawn : redeemed
    const label = isPartial ? 'Resgate parcial' : 'Resgate'

    if (incomeAmount.gt(ZERO)) {
      await this.incomeRepository.create({
        userId,
        name: investment.is_reserve
          ? `Rendimento do resgate: ${investment.name}`
          : `${label}: ${investment.name}`,
        description: investment.is_reserve
          ? `${label} de ${investment.name} (reserva) — só o rendimento entra como receita, o principal já estava no saldo`
          : `${label} do investimento ${investment.name}`,
        amount: incomeAmount.toNumber(),
        source: investment.broker ?? undefined,
        category: 'Resgate de Investimento',
        month,
        year,
        date: effectiveDate
      })
    }

    const updated = await this.investmentRepository.update(
      isPartial
        ? {
            id: investmentId,
            userId,
            // Em renda fixa o amount é o total aplicado, então basta reduzi-lo.
            // (Parcial é bloqueado em ETF/FII, onde amount é preço da cota.)
            amount: remainingAmount.toNumber(),
            netValue: remainingNetValue.toNumber(),
            ...(remainingGrossYield
              ? { grossYield: remainingGrossYield.toNumber() }
              : {})
          }
        : {
            id: investmentId,
            userId,
            status: 'MATURED',
            netValue: redeemed.toNumber(),
            grossYield: redeemed.toNumber()
          }
    )

    return {
      investment: updated,
      outcome: {
        partial: isPartial,
        redeemedValue: redeemed.toNumber(),
        principalWithdrawn: principalWithdrawn.toNumber(),
        yieldWithdrawn: yieldWithdrawn.toNumber(),
        incomeAmount: incomeAmount.gt(ZERO) ? incomeAmount.toNumber() : 0,
        remainingAmount: remainingAmount.toNumber(),
        remainingNetValue: remainingNetValue.toNumber()
      }
    }
  }
}
