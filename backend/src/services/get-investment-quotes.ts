import { InvestmentRepository } from '@/repositories/investment-repository'
import { fetchQuotes, BrapiQuote } from '@/lib/brapi'

interface GetInvestmentQuotesServiceRequest {
  userId: string
}

interface GetInvestmentQuotesServiceResponse {
  quotes: BrapiQuote[]
  notFound: string[]
  requestedAt: string
}

export class GetInvestmentQuotesService {
  constructor(private investmentRepository: InvestmentRepository) {}

  async execute({
    userId,
  }: GetInvestmentQuotesServiceRequest): Promise<GetInvestmentQuotesServiceResponse> {
    const investments = await this.investmentRepository.findAllPortfolioByUser(userId)

    const tickers = Array.from(
      new Set(
        investments
          .filter((inv) => inv.status === 'ACTIVE' && inv.ticker)
          .map((inv) => inv.ticker!.trim().toUpperCase())
          .filter((ticker) => ticker.length > 0)
      )
    )

    if (tickers.length === 0) {
      return { quotes: [], notFound: [], requestedAt: new Date().toISOString() }
    }

    const { quotes, notFound } = await fetchQuotes(tickers)

    return { quotes, notFound, requestedAt: new Date().toISOString() }
  }
}
