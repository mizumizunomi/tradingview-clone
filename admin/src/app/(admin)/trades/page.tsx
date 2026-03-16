import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TradesClient } from './TradesClient'

export default async function TradesPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Trades & Positions</h2>
        <p className="text-sm text-gray-400 mt-1">Monitor all platform trading activity</p>
      </div>
      <TradesClient />
    </div>
  )
}
