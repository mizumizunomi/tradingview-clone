import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { requireRole } from '@/lib/require-role'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  const denied = requireRole(session, 'SUPPORT')
  if (denied) return denied

  const { id } = await params
  const body = await req.json()
  const { status, adminNote, priority } = body

  const ticket = await prisma.supportTicket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(adminNote !== undefined && { adminNote }),
      ...(priority && { priority }),
      ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      assignedTo: session!.id,
    },
  })

  await prisma.adminAction.create({
    data: {
      adminId: session!.id,
      action: 'UPDATE_SUPPORT_TICKET',
      targetId: ticket.userId,
      details: { ticketId: id, status, adminNote },
    },
  })

  return NextResponse.json({ ticket: updated })
}
