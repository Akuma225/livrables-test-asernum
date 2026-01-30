import { Request } from 'express'
import { AccessTokenData } from 'src/auth/interfaces/access-token-data'

export interface CustomRequest extends Request {
  user?: AccessTokenData
}
