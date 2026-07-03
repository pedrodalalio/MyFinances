import { CreditCardInstallmentsRepository } from "@/repositories/credit-card-installments-repository"
import { CreditCardPurchasesRepository } from "@/repositories/credit-card-purchases-repository"
import { SalaryProfilesRepository } from "@/repositories/salary-profiles-repository"
import { isRecurringActive } from "./utils/recurring-expense"
import { sumAmounts } from "./utils/money"

interface GetMonthlyExpensesServiceRequest {
  userId: string
  month: string
  year: number
}

interface MonthlyExpense {
  id: string
  name: string
  amount: number
  type: 'installment' | 'recurring'
  current_installment?: number
  total_installments?: number
  purchase_id?: string
}

interface GetMonthlyExpensesServiceResponse {
  expenses: MonthlyExpense[]
  total: number
  salary: number | null
  balance: number | null
  spentPercentage: number | null
  month: string
  year: number
}

export class GetMonthlyExpensesService {
  constructor(
    private creditCardInstallmentsRepository: CreditCardInstallmentsRepository,
    private creditCardPurchasesRepository: CreditCardPurchasesRepository,
    private salaryProfilesRepository: SalaryProfilesRepository
  ) {}

  async execute({
    userId,
    month,
    year
  }: GetMonthlyExpensesServiceRequest): Promise<GetMonthlyExpensesServiceResponse> {

    // Buscar parcelas do mês
    const installments = await this.creditCardInstallmentsRepository.findManyByUserAndPeriod(userId, month, year)

    // Buscar gastos recorrentes ativos
    const recurringPurchases = await this.creditCardPurchasesRepository.findManyByUser(userId)
    const activeRecurringPurchases = recurringPurchases.filter(
      (purchase) => purchase.is_recurring && isRecurringActive(purchase, month, year),
    )

    const expenses: MonthlyExpense[] = []

    // Adicionar parcelas
    installments.forEach(installment => {
      expenses.push({
        id: installment.id,
        name: installment.purchase_name,
        amount: Number(installment.installment_amount),
        type: 'installment',
        current_installment: installment.current_installment,
        total_installments: installment.total_installments,
        purchase_id: installment.purchase_id
      })
    })

    // Adicionar gastos recorrentes
    activeRecurringPurchases.forEach(purchase => {
      expenses.push({
        id: purchase.id,
        name: purchase.name,
        amount: Number(purchase.installment_amount),
        type: 'recurring',
        purchase_id: purchase.id
      })
    })

    // Calcular total em Decimal a partir dos valores originais (os itens de
    // `expenses` já foram convertidos para number só para exibição)
    const total = sumAmounts(installments, (i) => i.installment_amount)
      .add(sumAmounts(activeRecurringPurchases, (p) => p.installment_amount))
      .toNumber()

    // Buscar salário do período
    const requestedDate = new Date(year, parseInt(month) - 1)
    const salaryProfiles = await this.salaryProfilesRepository.findManyByUser(userId)

    const activeSalaryProfile = salaryProfiles.find(profile => {
      const startDate = new Date(profile.start_date)
      const endDate = profile.end_date ? new Date(profile.end_date) : null

      return startDate <= requestedDate && (!endDate || endDate >= requestedDate)
    })

    const salary = activeSalaryProfile ? Number(activeSalaryProfile.amount) : null
    const balance = salary ? salary - total : null
    const spentPercentage = salary ? Math.round((total / salary) * 100) : null

    return {
      expenses,
      total,
      salary,
      balance,
      spentPercentage,
      month,
      year
    }
  }
}