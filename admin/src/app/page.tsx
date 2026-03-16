import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'

export default async function RootPage() {
  const session = await getAdminSession()
  if (session) redirect('/dashboard')
  else redirect('/login')
}
