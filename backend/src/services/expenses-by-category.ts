import { ExpenseRepository } from '@/repositories/expense-repository'

interface ExpensesByCategoryRequest {
  userId: string
  month: string
  year: number
}

interface CategoryData {
  category: string
  amount: number
  count: number
  percentage: number
}

interface ExpensesByCategoryResponse {
  categories: CategoryData[]
  total: number
  uncategorized: number
}

export class ExpensesByCategoryService {
  constructor(
    private expenseRepository: ExpenseRepository,
  ) {}

  async execute({ userId, month, year }: ExpensesByCategoryRequest): Promise<ExpensesByCategoryResponse> {
    const expenses = await this.expenseRepository.findByMonthAndUser(userId, month, year)

    // Group expenses by category
    const categoryMap = new Map<string, { amount: number; count: number }>()
    let uncategorizedAmount = 0
    let totalAmount = 0

    expenses.forEach(expense => {
      const amount = Number(expense.amount)
      totalAmount += amount

      if (!expense.category || expense.category.trim() === '') {
        uncategorizedAmount += amount
      } else {
        const category = expense.category.trim()
        const existing = categoryMap.get(category) || { amount: 0, count: 0 }
        categoryMap.set(category, {
          amount: existing.amount + amount,
          count: existing.count + 1
        })
      }
    })

    // Convert to array and calculate percentages
    const categories: CategoryData[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount === 0 ? 0 : (data.amount / totalAmount) * 100
      }))
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending

    return {
      categories,
      total: totalAmount,
      uncategorized: uncategorizedAmount
    }
  }
}