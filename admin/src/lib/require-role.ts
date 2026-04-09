import { NextResponse } from 'next/server'
import { AdminSession } from './auth'

type AdminRole = 'SUPER_ADMIN' | 'MANAGER' | 'SUPPORT'

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  SUPPORT: 1,
  MANAGER: 2,
  SUPER_ADMIN: 3,
}

export function hasRole(session: AdminSession, minRole: AdminRole): boolean {
  const sessionRole = session.role as AdminRole
  return (ROLE_HIERARCHY[sessionRole] ?? 0) >= ROLE_HIERARCHY[minRole]
}

export function requireRole(session: AdminSession | null, minRole: AdminRole): NextResponse | null {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasRole(session, minRole)) return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 })
  return null // means OK
}
