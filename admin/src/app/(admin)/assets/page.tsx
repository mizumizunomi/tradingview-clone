import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AssetsClient } from './AssetsClient'

export default async function AssetsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Asset Management</h2>
        <p className="text-sm text-gray-400 mt-1">Configure trading parameters for all assets</p>
      </div>
      <AssetsClient />
    </div>
  )
}
