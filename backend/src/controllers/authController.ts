import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { findUserByUsername } from '../services/usersRepository.js'

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos' })
      return
    }

    const user = await findUserByUsername(username)
    if (!user) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
      return
    }

    const token = jwt.sign({ sub: user.id, username: user.username }, config.auth.jwtSecret, { expiresIn: '7d' })
    res.json({ token, username: user.username })
  } catch (error) {
    console.error('[authController] Error:', error)
    res.status(500).json({ error: 'Error iniciando sesión' })
  }
}
