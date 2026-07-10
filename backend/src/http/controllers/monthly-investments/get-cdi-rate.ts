import { FastifyRequest, FastifyReply } from 'fastify'
import { getCdiCumulativeSeries, cdiFactorBetween, CdiUnavailableError } from '@/lib/bcb'

// CDI anualizado "atual": o quanto o CDI rendeu, de fato, nos últimos 12 meses.
// Usado no frontend para estimar quanto um CDB "X% do CDI" rende por mês.
export async function getCdiRate(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const oneYearAgo = (() => {
      const d = new Date(`${today}T00:00:00Z`)
      d.setUTCFullYear(d.getUTCFullYear() - 1)
      return d.toISOString().split('T')[0]
    })()

    const series = await getCdiCumulativeSeries(oneYearAgo)
    const factor = cdiFactorBetween(series, oneYearAgo, today)
    const annualRate = (factor - 1) * 100

    return reply.status(200).send({ annualRate, asOf: today })
  } catch (error) {
    if (error instanceof CdiUnavailableError) {
      return reply.status(503).send({ message: error.message })
    }
    console.error('Erro ao obter taxa do CDI:', error)
    return reply.status(500).send({ message: 'Erro interno do servidor' })
  }
}
