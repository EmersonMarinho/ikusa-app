"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getRealHistory } from "@/lib/mock-data"
import { formatSecondsToMMSS, parseMMSS, coerceToMMSS } from "@/lib/utils"
// Removidos gráficos nesta página

function TimeEditorCard({
  log,
  onSave,
  onInvalid,
  ignored,
  onToggleIgnored,
}: {
  log: any
  onSave: (id: string, totalSec: number, lolliSec: number) => Promise<boolean>
  onInvalid: (msg: string) => void
  ignored: boolean
  onToggleIgnored: (id: string) => void
}) {
  const totalSec = Number((log as any).total_node_seconds || 0)
  const lolliSec = Number((log as any).lollipop_occupancy_seconds || 0)
  const [tm, setTm] = useState<string>(formatSecondsToMMSS(totalSec))
  const [lm, setLm] = useState<string>(formatSecondsToMMSS(lolliSec))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <Card key={log.id} className={`relative border-neutral-800 bg-neutral-900`}>
      {saved && (
        <div className="absolute top-2 right-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
          Salvo
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-neutral-100">{log.node || 'Node sem nome'} — {new Date(log.created_at).toLocaleString('pt-BR')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Total da node (mm:ss)</Label>
            <Input placeholder="mm:ss" value={tm} onChange={(e)=>setTm(coerceToMMSS(e.target.value))} className="bg-neutral-800 border-neutral-700" />
          </div>
          <div>
            <Label>Ocupação Lollipop (mm:ss)</Label>
            <Input placeholder="mm:ss" value={lm} onChange={(e)=>setLm(coerceToMMSS(e.target.value))} className="bg-neutral-800 border-neutral-700" />
          </div>
          <div className="flex items-end">
            <Button onClick={async()=>{
              const ts = parseMMSS(tm)
              const ls = parseMMSS(lm)
              if (ts == null || ls == null) {
                onInvalid('Use mm:ss (ex: 48:23)')
                return
              }
              setSaving(true)
              const ok = await onSave(log.id, ts, ls)
              setSaving(false)
              if (ok) {
                setSaved(true)
                // Mantém o card visível para permitir preenchimento de tudo
                setTimeout(()=> setSaved(false), 1200)
              }
            }} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
              {saving ? (
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></span> Salvando...</span>
              ) : 'Salvar'}
            </Button>
          </div>
        </div>
        {/* Guildas e ignorar */}
        <div className="flex items-center justify-between pt-2 text-sm text-neutral-300">
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(log.guilds) ? log.guilds : []).map((g: string) => (
              <span key={g} className="px-2 py-0.5 rounded border border-neutral-700">{g}</span>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={ignored} onChange={() => onToggleIgnored(log.id)} />
            Não tenho os dados (ignorar este log)
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TempoDePinoPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [filter, setFilter] = useState("")
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await getRealHistory()
        setLogs(data || [])
      } catch (e: any) {
        toast({ title: "Erro", description: e?.message || "Falha ao carregar histórico" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const f = (filter || "").toLowerCase()
    return logs.filter((l: any) => {
      const node = (l.node || "").toLowerCase()
      const guild = (l.guild || "").toLowerCase()
      const isSiege = (l.territorio || l.territory || '').toLowerCase() === 'siege'
      // Mantém os cards visíveis, mesmo quando ignorados
      if (isSiege) return false
      return node.includes(f) || guild.includes(f)
    })
  }, [logs, filter])

  function normalizeGuildName(value: string | null | undefined): string {
    return (value || '').normalize('NFKC').trim().toLowerCase()
  }

  function hasChernobylPresence(log: any): boolean {
    try {
      const psg = (log.player_stats_by_guild || (log as any).playerStatsByGuild) as any
      if (psg && typeof psg === 'object') {
        for (const guildName of Object.keys(psg)) {
          const players = psg[guildName] || {}
          for (const [, stats] of Object.entries(players as any)) {
            const kvc = (stats as any)?.kills_vs_chernobyl || 0
            const dvc = (stats as any)?.deaths_vs_chernobyl || 0
            if ((kvc > 0) || (dvc > 0)) return true
          }
        }
      }
      const km = (log.kills_matrix || (log as any).killsMatrix) as any
      if (km && typeof km === 'object') {
        for (const attacker of Object.keys(km)) {
          const row = km[attacker] || {}
          if (normalizeGuildName(attacker) === 'chernobyl') {
            const sum = Object.values(row).reduce((a: number, v: any) => a + (Number(v) || 0), 0)
            if (sum > 0) return true
          }
          for (const victim of Object.keys(row)) {
            if (normalizeGuildName(victim) === 'chernobyl') {
              const v = Number(row[victim] || 0)
              if (v > 0) return true
            }
          }
        }
      }
      const cbg = log.classes_by_guild as any
      if (cbg && typeof cbg === 'object') {
        if (Object.keys(cbg).some((k) => normalizeGuildName(k) === 'chernobyl')) return true
      }
      if (Array.isArray(log.guilds)) {
        if (log.guilds.some((g: string) => normalizeGuildName(g) === 'chernobyl')) return true
      }
      return false
    } catch {
      return false
    }
  }

  const averages = useMemo(() => {
    const valid = filtered.filter((l: any) => (
      !ignoredIds.has(l.id) &&
      typeof l.lollipop_occupancy_seconds === 'number' &&
      typeof l.total_node_seconds === 'number' &&
      l.total_node_seconds > 0 &&
      l.lollipop_occupancy_seconds >= 0
    ))
    const withChern = valid.filter((l) => hasChernobylPresence(l))
    const withoutChern = valid.filter((l) => !hasChernobylPresence(l))

    const avgPct = (arr: any[]) => {
      if (!arr.length) return 0
      const sumPct = arr.reduce((acc, l) => {
        const occ = Number(l.lollipop_occupancy_seconds || 0)
        const tot = Math.max(1, Number(l.total_node_seconds || 0))
        const pct = Math.min(100, Math.max(0, (occ / tot) * 100))
        return acc + pct
      }, 0)
      return Math.round(sumPct / arr.length)
    }

    const allPct = avgPct(valid)
    const chPct = avgPct(withChern)
    const noChPct = avgPct(withoutChern)

    return {
      allPct,
      chPct,
      noChPct,
      totalCount: valid.length,
      withChernCount: withChern.length,
      withoutChernCount: withoutChern.length,
      chartDataPct: [
        { label: 'Geral', valuePct: allPct },
        { label: 'Com Chernobyl', valuePct: chPct },
        { label: 'Sem Chernobyl', valuePct: noChPct },
      ],
      chartDataCount: [
        { label: 'Total', valueCount: valid.length },
        { label: 'Com Chernobyl', valueCount: withChern.length },
        { label: 'Sem Chernobyl', valueCount: withoutChern.length },
      ],
      chartConfigPct: { valuePct: { label: '% Ocupação', color: 'hsl(210 100% 56%)' } },
      chartConfigCount: { valueCount: { label: 'Nodes', color: 'hsl(140 70% 45%)' } },
    }
  }, [filtered, ignoredIds])

  // Weekly aggregation (ISO-like, week starts Monday)
  const weekly = useMemo(() => {
    const toWeekStart = (iso: string) => {
      const d = new Date(iso)
      // Use UTC to be stable
      const day = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      start.setUTCDate(start.getUTCDate() - day)
      return start.toISOString().slice(0, 10) // YYYY-MM-DD (Monday)
    }

    const valid = filtered.filter((l: any) => (
      typeof l.lollipop_occupancy_seconds === 'number' &&
      typeof l.total_node_seconds === 'number' &&
      l.total_node_seconds > 0
    ))

    const buckets = new Map<string, { items: any[]; withChern: any[]; withoutChern: any[] }>()
    for (const l of valid) {
      const key = toWeekStart(l.created_at || new Date().toISOString())
      if (!buckets.has(key)) buckets.set(key, { items: [], withChern: [], withoutChern: [] })
      const b = buckets.get(key)!
      b.items.push(l)
      ;(hasChernobylPresence(l) ? b.withChern : b.withoutChern).push(l)
    }

    const avgPct = (arr: any[]) => {
      if (!arr.length) return 0
      const sum = arr.reduce((acc, l) => acc + Math.min(100, Math.max(0, (Number(l.lollipop_occupancy_seconds||0) / Math.max(1, Number(l.total_node_seconds||0))) * 100)), 0)
      return Math.round(sum / arr.length)
    }

    const data = Array.from(buckets.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([weekStart, b]) => ({
        week: weekStart,
        geral: avgPct(b.items),
        com: avgPct(b.withChern),
        sem: avgPct(b.withoutChern),
        count_total: b.items.length,
        count_com: b.withChern.length,
        count_sem: b.withoutChern.length,
      }))

    return {
      data,
      configPct: {
        geral: { label: 'Geral', color: 'hsl(210 100% 56%)' },
        com: { label: 'Com Chernobyl', color: 'hsl(20 90% 60%)' },
        sem: { label: 'Sem Chernobyl', color: 'hsl(140 70% 45%)' },
      } as any,
    }
  }, [filtered])

  const updateTimes = async (id: string, totalSec: number, lolliSec: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/process-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          total_node_seconds: Math.max(0, Math.floor(totalSec)),
          lollipop_occupancy_seconds: Math.max(0, Math.floor(lolliSec))
        })
      })
      const js = await res.json()
      if (!js?.success) throw new Error(js?.message || 'Falha ao atualizar')
      toast({ title: 'Atualizado', description: 'Tempos salvos com sucesso' })
      return true
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Falha ao atualizar' })
      return false
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">Tempo de Pino</h1>
      </div>

      {/* Resumo e gráfico */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">Média de Ocupação (Lollipop)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-neutral-200">
            <div>
              <div className="text-sm text-neutral-400">Geral (% do tempo de pino)</div>
              <div className="text-lg font-semibold">{averages.allPct}%</div>
            </div>
            <div>
              <div className="text-sm text-neutral-400">Com Chernobyl</div>
              <div className="text-lg font-semibold">{averages.chPct}%</div>
            </div>
            <div>
              <div className="text-sm text-neutral-400">Sem Chernobyl</div>
              <div className="text-lg font-semibold">{averages.noChPct}%</div>
            </div>
          </div>

          {/* Contadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-neutral-200">
            <div>
              <div className="text-sm text-neutral-400">Nodes (Total)</div>
              <div className="text-lg font-semibold">{averages.totalCount}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-400">Nodes com Chernobyl</div>
              <div className="text-lg font-semibold">{averages.withChernCount}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-400">Nodes sem Chernobyl</div>
              <div className="text-lg font-semibold">{averages.withoutChernCount}</div>
            </div>
          </div>

          {/* Histórico Lollipop (semanas) */}
          {weekly.data.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-neutral-100 font-semibold">Histórico Lollipop (semanas)</h3>
              <div className="overflow-x-auto rounded border border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-900">
                    <tr className="text-neutral-300">
                      <th className="px-3 py-2 text-left">Semana</th>
                      <th className="px-3 py-2 text-left">% Geral</th>
                      <th className="px-3 py-2 text-left">% Com Chernobyl</th>
                      <th className="px-3 py-2 text-left">% Sem Chernobyl</th>
                      <th className="px-3 py-2 text-left">Nodes</th>
                      <th className="px-3 py-2 text-left">Com</th>
                      <th className="px-3 py-2 text-left">Sem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.data.map((w) => {
                      const start = new Date(w.week + 'T00:00:00Z')
                      const end = new Date(start)
                      end.setUTCDate(end.getUTCDate() + 6)
                      const label = `${start.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${end.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                      return (
                        <tr key={w.week} className="border-t border-neutral-800 hover:bg-neutral-900/60">
                          <td className="px-3 py-2 text-neutral-200">{label}</td>
                          <td className="px-3 py-2">{w.geral}%</td>
                          <td className="px-3 py-2">{w.com}%</td>
                          <td className="px-3 py-2">{w.sem}%</td>
                          <td className="px-3 py-2">{w.count_total}</td>
                          <td className="px-3 py-2">{w.count_com}</td>
                          <td className="px-3 py-2">{w.count_sem}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


