import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export interface AuthedRequest extends Request {
  userId?: number
  username?: string
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  try {
    const payload = jwt.verify(token, config.auth.jwtSecret) as unknown as { sub: number; username: string }
    req.userId = payload.sub
    req.username = payload.username
    next()
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' })
  }
}
