'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface Admin {
  id: string; email: string; username: string; role: string; isActive: boolean
  lastLogin: string | null; createdAt: string
}
interface Action {
  id: string; action: string; targetId: string; details: Record<string, unknown>; createdAt: string
  admin: { username: string }
}

export function SettingsClient() {
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ email: '', username: '', password: '', role: 'MANAGER' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setAdmins(data.admins ?? [])
      setActions(data.actions ?? [])
      setLoading(false)
    })
  }, [])

  async function handleCreate() {
    if (!form.email || !form.username || !form.password) return
    setCreating(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAdmins(a => [data, ...a])
      toast({ title: 'Admin created' })
      setCreateOpen(false)
      setForm({ email: '', username: '', password: '', role: 'MANAGER' })
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setCreating(false) }
  }

  async function handleToggleActive(admin: Admin) {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, isActive: !admin.isActive }),
      })
      const data = await res.json()
      setAdmins(a => a.map(x => x.id === admin.id ? { ...x, isActive: data.isActive } : x))
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  async function handleRoleChange(admin: Admin, role: string) {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: admin.id, role }),
      })
      const data = await res.json()
      setAdmins(a => a.map(x => x.id === admin.id ? { ...x, role: data.role } : x))
      toast({ title: 'Role updated' })
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="admins">
        <TabsList className="bg-[#1a1d29] border border-[#2a2d3a]">
          <TabsTrigger value="admins">Admin Accounts</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" /> New Admin
              </Button>
            </div>
            <div className="bg-[#1a1d29] border border-[#2a2d3a] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">Admin</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Last Login</th>
                    <th className="text-left px-4 py-3">Created</th>
                    <th className="text-center px-4 py-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-[#2a2d3a]">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><div className="h-4 bg-[#2a2d3a] rounded animate-pulse" /></td>
                          ))}
                        </tr>
                      ))
                    : admins.map(a => (
                        <tr key={a.id} className="border-b border-[#2a2d3a] hover:bg-white/3">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-white">{a.username}</div>
                              <div className="text-xs text-gray-500">{a.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Select value={a.role} onValueChange={role => handleRoleChange(a, role)}>
                              <SelectTrigger className="w-36 h-7 bg-transparent border-[#3a3d4a] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                                <SelectItem value="MANAGER">MANAGER</SelectItem>
                                <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{a.lastLogin ? formatDate(a.lastLogin) : 'Never'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatDate(a.createdAt)}</td>
                          <td className="px-4 py-3 text-center">
                            <Switch checked={a.isActive} onCheckedChange={() => handleToggleActive(a)} />
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="space-y-2">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-[#1a1d29] rounded-lg animate-pulse" />)
              : actions.map(a => (
                  <Card key={a.id} className="bg-[#1a1d29] border-[#2a2d3a]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="info" className="text-xs">{a.action}</Badge>
                            <span className="text-sm text-white font-medium">{a.admin.username}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Target: <code className="text-gray-300">{a.targetId.slice(0, 12)}…</code></p>
                          {Object.keys(a.details).length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">{JSON.stringify(a.details).slice(0, 120)}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 ml-4">{formatDate(a.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1a1d29] border-[#2a2d3a]">
          <DialogHeader>
            <DialogTitle>Create Admin Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-[#252836] border-[#3a3d4a]" />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="bg-[#252836] border-[#3a3d4a]" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="bg-[#252836] border-[#3a3d4a]" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={role => setForm(f => ({ ...f, role }))}>
                <SelectTrigger className="bg-[#252836] border-[#3a3d4a]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !form.email || !form.username || !form.password}>
              {creating ? '…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
