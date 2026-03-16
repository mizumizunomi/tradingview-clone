'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Search, ChevronLeft, ChevronRight, Edit2, Star } from 'lucide-react'

interface Asset {
  id: string; symbol: string; name: string; category: string; broker: string
  spread: number; commission: number; minOrderSize: number; maxLeverage: number
  isActive: boolean; isFeatured: boolean
}

const CATEGORIES = ['', 'CRYPTO', 'FOREX', 'STOCKS', 'FUTURES', 'INDICES', 'COMMODITIES', 'FUNDS', 'BONDS']

export function AssetsClient() {
  const { toast } = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [form, setForm] = useState<Partial<Asset>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), search, category })
    const res = await fetch(`/api/assets?${params}`)
    const data = await res.json()
    setAssets(data.assets); setTotal(data.total); setPages(data.pages)
    setLoading(false)
  }, [page, search, category])

  useEffect(() => { load() }, [load])

  async function handleToggle(asset: Asset, field: 'isActive' | 'isFeatured') {
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !asset[field] }),
      })
      const data = await res.json()
      setAssets(a => a.map(x => x.id === asset.id ? { ...x, [field]: data[field] } : x))
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    }
  }

  async function handleSave() {
    if (!editAsset) return
    setSaving(true)
    try {
      const res = await fetch(`/api/assets/${editAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spread: parseFloat(String(form.spread ?? editAsset.spread)),
          commission: parseFloat(String(form.commission ?? editAsset.commission)),
          minOrderSize: parseFloat(String(form.minOrderSize ?? editAsset.minOrderSize)),
          maxLeverage: parseInt(String(form.maxLeverage ?? editAsset.maxLeverage)),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAssets(a => a.map(x => x.id === editAsset.id ? { ...x, ...data } : x))
      toast({ title: 'Asset updated' })
      setEditAsset(null)
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Symbol or name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 bg-[#1a1d29] border-[#2a2d3a]" />
        </div>
        <Select value={category || 'all'} onValueChange={v => { setCategory(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-[#1a1d29] border-[#2a2d3a]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.filter(Boolean).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-400">{total} assets</span>
      </div>

      <div className="bg-[#1a1d29] border border-[#2a2d3a] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d3a] text-gray-400 text-xs">
                <th className="text-left px-4 py-3">Symbol</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Spread</th>
                <th className="text-right px-4 py-3">Commission</th>
                <th className="text-right px-4 py-3">Min Size</th>
                <th className="text-right px-4 py-3">Max Leverage</th>
                <th className="text-center px-4 py-3">Active</th>
                <th className="text-center px-4 py-3">Featured</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#2a2d3a]">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-[#2a2d3a] rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                : assets.map(a => (
                    <tr key={a.id} className="border-b border-[#2a2d3a] hover:bg-white/3">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-white flex items-center gap-1.5">
                            {a.isFeatured && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                            {a.symbol}
                          </div>
                          <div className="text-xs text-gray-500">{a.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="secondary">{a.category}</Badge></td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{a.spread}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{a.commission}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{a.minOrderSize}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-300">{a.maxLeverage}x</td>
                      <td className="px-4 py-3 text-center">
                        <Switch checked={a.isActive} onCheckedChange={() => handleToggle(a, 'isActive')} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch checked={a.isFeatured} onCheckedChange={() => handleToggle(a, 'isFeatured')} />
                      </td>
                      <td className="px-4 py-3">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditAsset(a); setForm({}) }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]">
          <span className="text-xs text-gray-400">Page {page} of {pages}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!editAsset} onOpenChange={open => !open && setEditAsset(null)}>
        <DialogContent className="bg-[#1a1d29] border-[#2a2d3a]">
          <DialogHeader>
            <DialogTitle>Edit {editAsset?.symbol}</DialogTitle>
          </DialogHeader>
          {editAsset && (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label>Spread</Label>
                <Input type="number" step="0.00001" defaultValue={editAsset.spread} onChange={e => setForm(f => ({ ...f, spread: parseFloat(e.target.value) }))} className="bg-[#252836] border-[#3a3d4a]" />
              </div>
              <div className="space-y-2">
                <Label>Commission</Label>
                <Input type="number" step="0.0001" defaultValue={editAsset.commission} onChange={e => setForm(f => ({ ...f, commission: parseFloat(e.target.value) }))} className="bg-[#252836] border-[#3a3d4a]" />
              </div>
              <div className="space-y-2">
                <Label>Min Order Size</Label>
                <Input type="number" step="0.01" defaultValue={editAsset.minOrderSize} onChange={e => setForm(f => ({ ...f, minOrderSize: parseFloat(e.target.value) }))} className="bg-[#252836] border-[#3a3d4a]" />
              </div>
              <div className="space-y-2">
                <Label>Max Leverage</Label>
                <Input type="number" defaultValue={editAsset.maxLeverage} onChange={e => setForm(f => ({ ...f, maxLeverage: parseInt(e.target.value) }))} className="bg-[#252836] border-[#3a3d4a]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditAsset(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
