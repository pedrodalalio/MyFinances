import { FastifyInstance } from 'fastify'
import { verifyJWT } from '@/http/middlewares/verify-jwt'

import { getPortfolio } from './get-portfolio'
import { createAsset } from './create-asset'
import { updateAsset } from './update-asset'
import { deleteAsset } from './delete-asset'
import { updateAssetValue } from './update-asset-value'

export async function investmentPortfolioRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  // Portfolio routes
  app.get('/portfolio', getPortfolio)

  // Asset routes
  app.post('/portfolio/assets', createAsset)
  app.put('/portfolio/assets/:assetId', updateAsset)
  app.delete('/portfolio/assets/:assetId', deleteAsset)
  app.patch('/portfolio/assets/:assetId/value', updateAssetValue)
}