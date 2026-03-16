import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? 'fallback-secret-change-in-production'
)

export interface AdminSession {
  id: string
  email: string
  username: string
  role: string
}

export async function signAdminToken(payload: AdminSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(ADMIN_JWT_SECRET)
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET)
    return payload as unknown as AdminSession
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export async function getAdminSessionFromRequest(req: NextRequest): Promise<AdminSession | null> {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return null
  return verifyAdminToken(token)
}
