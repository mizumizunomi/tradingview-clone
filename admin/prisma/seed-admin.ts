import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@trading.com'
  const username = 'superadmin'
  const password = 'Admin123!'

  const existing = await prisma.admin.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin "${email}" already exists — skipping seed.`)
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const admin = await prisma.admin.create({
    data: { email, username, password: hashed, role: 'SUPER_ADMIN', isActive: true },
  })

  console.log(`✅ Super admin created:`)
  console.log(`   Email:    ${admin.email}`)
  console.log(`   Username: ${admin.username}`)
  console.log(`   Password: ${password}`)
  console.log(`   Role:     ${admin.role}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
