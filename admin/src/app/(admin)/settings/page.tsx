import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')
  if (session.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-300">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">SUPER_ADMIN role required</p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Admin Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Manage admin accounts and view audit log</p>
      </div>
      <SettingsClient />
    </div>
  )
}
