import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getAdminSession()
  if (!session || session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [admins, actions] = await Promise.all([
    prisma.admin.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, email: true, username: true, role: true, isActive: true, lastLogin: true, createdAt: true } }),
    prisma.adminAction.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { admin: { select: { username: true } } } }),
  ])

  return NextResponse.json({ admins, actions })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session || session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, username, password, role } = await req.json()
  if (!email || !username || !password) return NextResponse.json({ error: 'All fields required' }, { status: 400 })

  const hashed = await bcrypt.hash(password, 10)
  const admin = await prisma.admin.create({
    data: { email, username, password: hashed, role: role ?? 'MANAGER' },
    select: { id: true, email: true, username: true, role: true, isActive: true, createdAt: true },
  })

  await prisma.adminAction.create({
    data: { adminId: session.id, action: 'CREATE_ADMIN', targetId: admin.id, details: { username, role } },
  })

  return NextResponse.json(admin)
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session || session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, isActive, role } = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof isActive === 'boolean') data.isActive = isActive
  if (role) data.role = role

  const admin = await prisma.admin.update({ where: { id }, data, select: { id: true, email: true, username: true, role: true, isActive: true } })

  await prisma.adminAction.create({
    data: { adminId: session.id, action: 'EDIT_ADMIN', targetId: id, details: data as import('@prisma/client').Prisma.InputJsonValue },
  })

  return NextResponse.json(admin)
}
