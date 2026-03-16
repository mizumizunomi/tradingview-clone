import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tempPassword = generateTempPassword()
  const hashed = await bcrypt.hash(tempPassword, 10)

  await prisma.user.update({ where: { id }, data: { password: hashed } })

  await prisma.adminAction.create({
    data: {
      adminId: session.id,
      action: 'RESET_PASSWORD',
      targetId: id,
      details: {},
    },
  })

  return NextResponse.json({ tempPassword })
}
