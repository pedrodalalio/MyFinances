import { FastifyInstance } from 'fastify'
import { verifyJWT } from '@/http/middlewares/verify-jwt'

import { getPortfolio } from './get-portfolio'
import { createAsset } from './create-asset'
import { updateAsset } from './update-asset'
import { deleteAsset } from './delete-asset'
import { updateAssetValue } from './update-asset-value'

export async function investmentPortfolioRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJWT)

  // CDB routes
  app.get('/cdbs', getPortfolio)

  // Asset routes
  app.post('/cdbs/assets', createAsset)
  app.put('/cdbs/assets/:assetId', updateAsset)
  app.delete('/cdbs/assets/:assetId', deleteAsset)
  app.patch('/cdbs/assets/:assetId/value', updateAssetValue)
}