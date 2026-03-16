'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Props {
  dailyChart: { date: string; count: number }[]
  topAssets: { symbol: string; name: string; count: number }[]
}

export function DashboardCharts({ dailyChart, topAssets }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-[#1a1d29] border-[#2a2d3a]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">New Registrations (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyChart}>
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
                interval={6}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d29', border: '1px solid #2a2d3a', borderRadius: 6 }}
                labelStyle={{ color: '#e5e7eb' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#regGrad)" strokeWidth={2} name="Users" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-[#1a1d29] border-[#2a2d3a]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Top Traded Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topAssets} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="symbol" tick={{ fill: '#9ca3af', fontSize: 11 }} width={60} />
              <Tooltip
                contentStyle={{ background: '#1a1d29', border: '1px solid #2a2d3a', borderRadius: 6 }}
                labelStyle={{ color: '#e5e7eb' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Trades" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
