import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UsersTable } from './UsersTable'

export default async function UsersPage() {
  const session = await getAdminSession()
  if (!session) redirect('/login')
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Users</h2>
        <p className="text-sm text-gray-400 mt-1">Manage platform users</p>
      </div>
      <UsersTable />
    </div>
  )
}
