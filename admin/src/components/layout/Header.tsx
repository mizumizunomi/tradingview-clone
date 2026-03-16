import { getAdminSession } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'

export async function Header({ title }: { title?: string }) {
  const session = await getAdminSession()

  return (
    <header className="h-14 bg-[#1a1d29] border-b border-[#2a2d3a] flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-white">{title ?? 'Admin'}</h1>
      {session && (
        <div className="flex items-center gap-3">
          <Badge variant="info" className="text-xs">{session.role}</Badge>
          <span className="text-sm text-gray-400">{session.username}</span>
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-semibold uppercase">{session.username.charAt(0)}</span>
          </div>
        </div>
      )}
    </header>
  )
}
