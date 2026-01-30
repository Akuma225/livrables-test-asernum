import { Request } from 'express'
import { AccessTokenData } from './access-token-data'

export interface CustomRequest extends Request {
  user?: AccessTokenData
}
