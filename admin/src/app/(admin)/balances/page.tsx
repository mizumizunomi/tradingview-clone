import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BalancesClient } from './BalancesClient'

export default async function BalancesPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Balance Control</h2>
        <p className="text-sm text-gray-400 mt-1">Manage user wallets and adjustments</p>
      </div>
      <BalancesClient />
    </div>
  )
}
