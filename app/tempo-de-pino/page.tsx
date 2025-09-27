"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getRealHistory } from "@/lib/mock-data"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatSecondsToMMSS, parseMMSS, coerceToMMSS } from "@/lib/utils"
// Removidos gráficos nesta página

function TimeEditorCard({
  log,
  onSave,
  onInvalid,
  ignored,
  onToggleIgnored,
  onToggleWin,
}: {
  log: any
  onSave: (id: string, totalSec: number, lolliSec: number) => Promise<boolean>
  onInvalid: (msg: string) => void
  ignored: boolean
  onToggleIgnored: (id: string) => void
  onToggleWin: (id: string, win: boolean) => Promise<void>
}) {
  const totalSec = Number((log as any).total_node_seconds || 0)
  const lolliSec = Number((log as any).lollipop_occupancy_seconds || 0)
  const [tm, setTm] = useState<string>(formatSecondsToMMSS(totalSec))
  const [lm, setLm] = useState<string>(formatSecondsToMMSS(lolliSec))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [winSaving, setWinSaving] = useState(false)
  const win = !!(log.is_win ?? log.isWin ?? false)
  const winObs = (log.win_reason ?? log.winReason ?? '') as string

  return (
    <Card key={log.id} className={`relative border-neutral-800 bg-neutral-900`}>
      {saved && (
        <div className="absolute top-2 right-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
          Salvo
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-neutral-100 flex items-center justify-between">
          <span>{log.node || 'Node sem nome'} — {new Date(log.created_at).toLocaleString('pt-BR')}</span>
          <div className="flex items-center gap-2">
            {winObs && <span className="text-xs text-neutral-400 italic max-w-[220px] truncate" title={winObs}>"{winObs}"</span>}
            <button
              className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${win ? 'border-green-600 text-green-400' : 'border-red-600 text-red-400'}`}
              disabled={winSaving}
              onClick={async()=>{
                try {
                  setWinSaving(true)
                  await onToggleWin(log.id, !win)
                } finally {
                  setWinSaving(false)
                }
              }}
            >
              {winSaving ? 'Salvando...' : win ? 'Vitória' : 'Derrota'}
            </button>
          </div>
        </CardTitle>
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
  const [showLogs, setShowLogs] = useState<boolean>(false)
  // Controles de visualização da tabela semanal
  const [weekFilter, setWeekFilter] = useState<'all' | 'com' | 'sem'>('all')

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
      !ignoredIds.has(l.id) &&
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
      .sort(([a],[b]) => b.localeCompare(a)) // semanas mais recentes primeiro
      .map(([weekStart, b]) => ({
        week: weekStart,
        geral: avgPct(b.items),
        com: avgPct(b.withChern),
        sem: avgPct(b.withoutChern),
        count_total: b.items.length,
        count_com: b.withChern.length,
        count_sem: b.withoutChern.length,
        wins: b.items.filter(l => !!(l.isWin ?? l.is_win ?? false)).length,
        losses: b.items.filter(l => !(l.isWin ?? l.is_win ?? false)).length,
        withChernWins: b.withChern.filter(l => !!(l.isWin ?? l.is_win ?? false)).length,
        withChernLosses: b.withChern.filter(l => !(l.isWin ?? l.is_win ?? false)).length,
        withoutChernWins: b.withoutChern.filter(l => !!(l.isWin ?? l.is_win ?? false)).length,
        withoutChernLosses: b.withoutChern.filter(l => !(l.isWin ?? l.is_win ?? false)).length,
      }))

    return {
      data,
      configPct: {
        geral: { label: 'Geral', color: 'hsl(210 100% 56%)' },
        com: { label: 'Com Chernobyl', color: 'hsl(20 90% 60%)' },
        sem: { label: 'Sem Chernobyl', color: 'hsl(140 70% 45%)' },
      } as any,
    }
  }, [filtered, ignoredIds])

  const averages = useMemo(() => {
    // Usa buckets semanais e pondera pelos counts (nodes) para alinhar com a visão semanal
    const denomAll = weekly.data.reduce((s, w) => s + (w.count_total || 0), 0)
    const denomCom = weekly.data.reduce((s, w) => s + (w.count_com || 0), 0)
    const denomSem = weekly.data.reduce((s, w) => s + (w.count_sem || 0), 0)
    const allPct = denomAll ? Math.round(weekly.data.reduce((s, w) => s + (w.geral || 0) * (w.count_total || 0), 0) / denomAll) : 0
    const chPct = denomCom ? Math.round(weekly.data.reduce((s, w) => s + (w.com || 0) * (w.count_com || 0), 0) / denomCom) : 0
    const noChPct = denomSem ? Math.round(weekly.data.reduce((s, w) => s + (w.sem || 0) * (w.count_sem || 0), 0) / denomSem) : 0

    const totalCount = denomAll
    const withChernCount = denomCom
    const withoutChernCount = denomSem
    const chWins = weekly.data.reduce((s, w) => s + (w.withChernWins || 0), 0)
    const chLosses = weekly.data.reduce((s, w) => s + (w.withChernLosses || 0), 0)
    const noChWins = weekly.data.reduce((s, w) => s + (w.withoutChernWins || 0), 0)
    const noChLosses = weekly.data.reduce((s, w) => s + (w.withoutChernLosses || 0), 0)
    const totalWins = weekly.data.reduce((s, w) => s + (w.wins || 0), 0)
    const totalLosses = weekly.data.reduce((s, w) => s + (w.losses || 0), 0)
    const overallWinrate = denomAll ? Math.round((totalWins/denomAll)*1000)/10 : 0
    const withChernWinrate = denomCom ? Math.round((chWins / denomCom) * 1000) / 10 : 0
    const withoutChernWinrate = denomSem ? Math.round((noChWins / denomSem) * 1000) / 10 : 0

    return {
      allPct,
      chPct,
      noChPct,
      totalCount,
      withChernCount,
      withoutChernCount,
      totalWins,
      totalLosses,
      overallWinrate,
      withChernWinrate,
      withoutChernWinrate,
      chartDataPct: [
        { label: 'Geral', valuePct: allPct },
        { label: 'Com Chernobyl', valuePct: chPct },
        { label: 'Sem Chernobyl', valuePct: noChPct },
      ],
      chartDataCount: [
        { label: 'Total', valueCount: totalCount },
        { label: 'Com Chernobyl', valueCount: withChernCount },
        { label: 'Sem Chernobyl', valueCount: withoutChernCount },
      ],
      chartConfigPct: { valuePct: { label: '% Ocupação', color: 'hsl(210 100% 56%)' } },
      chartConfigCount: { valueCount: { label: 'Nodes', color: 'hsl(140 70% 45%)' } },
    }
  }, [weekly])

  // Aplica filtros/ordenação para exibição
  const weeklyView = useMemo(() => {
    const base = weekly.data.filter((w) => {
      if (weekFilter === 'com') return w.count_com > 0
      if (weekFilter === 'sem') return w.count_sem > 0
      return true
    })
    const weightKey: Record<'geral'|'com'|'sem', 'count_total'|'count_com'|'count_sem'> = {
      geral: 'count_total',
      com: 'count_com',
      sem: 'count_sem',
    }
    const weighted = (key: 'geral' | 'com' | 'sem') => {
      const wKey = weightKey[key]
      const denom = base.reduce((s, w) => s + (w[wKey] || 0), 0)
      if (!denom) return 0
      const num = base.reduce((s, w) => s + (w[key] || 0) * (w[wKey] || 0), 0)
      return Math.round((num / denom) * 10) / 10
    }
    const sum = (key: 'count_total' | 'count_com' | 'count_sem') =>
      base.reduce((s, w) => s + (w[key] || 0), 0)
    const totalNodes = sum('count_total')
    const totalWins = base.reduce((s, w) => s + (w.wins || 0), 0)
    const totalLosses = base.reduce((s, w) => s + (w.losses || 0), 0)
    const winrate = totalNodes ? Math.round((totalWins / totalNodes) * 1000) / 10 : 0
    return {
      rows: base,
      footer: {
        geral: weighted('geral'),
        com: weighted('com'),
        sem: weighted('sem'),
        count_total: totalNodes,
        count_com: sum('count_com'),
        count_sem: sum('count_sem'),
        wins: totalWins,
        losses: totalLosses,
        winrate,
      },
    }
  }, [weekly, weekFilter])

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

  const updateWin = async (id: string, win: boolean) => {
    try {
      const res = await fetch('/api/process-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_win: win
        })
      })
      const js = await res.json()
      if (!js?.success) throw new Error(js?.message || 'Falha ao atualizar vitória/derrota')
      toast({ title: 'Atualizado', description: win ? 'Marcado como vitória' : 'Marcado como derrota' })
      setLogs(prev => prev.map(l => l.id === id ? { ...l, is_win: win } : l))
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Falha ao atualizar vitória/derrota' })
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">Estatísticas Node</h1>
      </div>

      {/* Resumo e gráfico */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">Média de Ocupação (Lollipop)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 shadow-inner shadow-blue-500/10">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-200/80">% de pino geral</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-blue-100">{averages.allPct}%</span>
                <span className="text-xs text-blue-100/70">todos os nodes</span>
              </div>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 shadow-inner shadow-rose-500/10">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-200/80">% com Chernobyl</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-rose-100">{averages.chPct}%</span>
                <span className="text-xs text-rose-100/70">{averages.withChernCount} nodes</span>
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 shadow-inner shadow-emerald-500/10">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">% sem Chernobyl</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-emerald-100">{averages.noChPct}%</span>
                <span className="text-xs text-emerald-100/70">{averages.withoutChernCount} nodes</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-neutral-400">
                <span>Winrate geral</span>
                <span className="text-neutral-500 normal-case">{averages.totalWins}V / {averages.totalLosses}D</span>
              </div>
              <div className="mt-3 text-3xl font-semibold text-neutral-100">{averages.overallWinrate}%</div>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-rose-200/80">
                <span>Winrate com Chernobyl</span>
                <span className="text-rose-100/70 normal-case">{averages.withChernCount} nodes</span>
              </div>
              <div className="mt-3 text-3xl font-semibold text-rose-100">{averages.withChernWinrate}%</div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-emerald-200/80">
                <span>Winrate sem Chernobyl</span>
                <span className="text-emerald-100/70 normal-case">{averages.withoutChernCount} nodes</span>
              </div>
              <div className="mt-3 text-3xl font-semibold text-emerald-100">{averages.withoutChernWinrate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-neutral-200">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Nodes (Total)</div>
              <div className="mt-2 text-2xl font-semibold text-neutral-100">{averages.totalCount}</div>
            </div>
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 text-neutral-200">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-200/80">Nodes com Chernobyl</div>
              <div className="mt-2 text-2xl font-semibold text-rose-100">{averages.withChernCount}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-neutral-200">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/80">Nodes sem Chernobyl</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-100">{averages.withoutChernCount}</div>
            </div>
          </div>

          {/* Histórico Lollipop (semanas) */}
          {weeklyView.rows.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-neutral-100 font-semibold">Histórico Lollipop (semanas)</h3>
              {/* Controles */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="inline-flex rounded-md border border-neutral-800 overflow-hidden">
                  <button
                    className={`px-3 py-1.5 text-sm ${weekFilter==='all'?'bg-neutral-800 text-neutral-100':'text-neutral-300 hover:bg-neutral-800/60'}`}
                    onClick={()=>setWeekFilter('all')}
                  >Todas</button>
                  <button
                    className={`px-3 py-1.5 text-sm ${weekFilter==='com'?'bg-neutral-800 text-neutral-100':'text-neutral-300 hover:bg-neutral-800/60'}`}
                    onClick={()=>setWeekFilter('com')}
                  >Com Chernobyl</button>
                  <button
                    className={`px-3 py-1.5 text-sm ${weekFilter==='sem'?'bg-neutral-800 text-neutral-100':'text-neutral-300 hover:bg-neutral-800/60'}`}
                    onClick={()=>setWeekFilter('sem')}
                  >Sem Chernobyl</button>
                </div>
                <div className="text-sm text-neutral-500">Ordenado por semana (mais recente primeiro)</div>
              </div>
              <div className="overflow-x-auto rounded border border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-900 sticky top-0 z-10">
                    <tr className="text-neutral-300">
                      <th className="px-3 py-2 text-left">Semana</th>
                      <th className="px-3 py-2 text-left">
                        <div className="inline-flex items-center gap-2">
                          % Geral
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-neutral-500 text-[10px] border border-neutral-700 rounded px-1 py-0.5 cursor-help">?</span>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6} className="bg-neutral-800 text-neutral-100">Tempo de pino médio de todas as nodes da semana.</TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left"><span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span>Com Chernobyl</span></th>
                      <th className="px-3 py-2 text-left"><span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>Sem Chernobyl</span></th>
                      <th className="px-3 py-2 text-center">Nodes (Total)</th>
                      <th className="px-3 py-2 text-center">Vitórias</th>
                      <th className="px-3 py-2 text-center">Derrotas</th>
                      <th className="px-3 py-2 text-center">Winrate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyView.rows.map((w) => {
                      const start = new Date(w.week + 'T00:00:00Z')
                      const end = new Date(start)
                      end.setUTCDate(end.getUTCDate() + 6)
                      const label = `${start.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - ${end.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                      const bar = (pct: number, color: string) => (
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-2 rounded bg-neutral-800">
                            <div className="h-2 rounded" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
                          </div>
                          <span className="w-10 text-right">{pct}%</span>
                        </div>
                      )
                      return (
                        <tr key={w.week} className="border-t border-neutral-800 hover:bg-neutral-900/60 odd:bg-neutral-900/40">
                          <td className="px-3 py-2 text-neutral-200 whitespace-nowrap">{label}</td>
                          <td className="px-3 py-2">{bar(w.geral, '#3b82f6')}</td>
                          <td className="px-3 py-2">{bar(w.com, '#ef4444')}</td>
                          <td className="px-3 py-2">{bar(w.sem, '#22c55e')}</td>
                          <td className="px-3 py-2 font-medium text-center">{w.count_total}</td>
                          <td className="px-3 py-2 text-center text-green-400 font-medium">{w.wins ?? 0}</td>
                          <td className="px-3 py-2 text-center text-red-400 font-medium">{w.losses ?? 0}</td>
                          <td className="px-3 py-2 text-center text-neutral-200">{w.count_total ? Math.round(((w.wins || 0)/w.count_total)*1000)/10 : 0}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-800 bg-neutral-900/60">
                      <td className="px-3 py-2 text-neutral-300">Médias/Somas</td>
                      <td className="px-3 py-2 text-center">{weeklyView.footer.geral}%</td>
                      <td className="px-3 py-2 text-center">{weeklyView.footer.com}%</td>
                      <td className="px-3 py-2 text-center">{weeklyView.footer.sem}%</td>
                      <td className="px-3 py-2 font-medium text-center">{weeklyView.footer.count_total}</td>
                      <td className="px-3 py-2 text-center text-green-400 font-medium">{weeklyView.footer.wins}</td>
                      <td className="px-3 py-2 text-center text-red-400 font-medium">{weeklyView.footer.losses}</td>
                      <td className="px-3 py-2 text-center text-neutral-200">{weeklyView.footer.winrate}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Lista de logs individuais */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-neutral-100 font-semibold">Logs individuais</h3>
                <p className="text-sm text-neutral-500">Ajuste tempos ou marque vitória/derrota.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-700 text-neutral-200"
                onClick={() => setShowLogs(v => !v)}
              >
                {showLogs ? 'Esconder logs' : 'Mostrar logs'}
              </Button>
            </div>

            {showLogs && (
              <div className="space-y-4">
                <div className="md:w-80">
                  <Label htmlFor="log-filter" className="text-sm text-neutral-400">Filtrar por node ou guilda</Label>
                  <Input
                    id="log-filter"
                    placeholder="Ex: castle, chern..."
                    value={filter}
                    onChange={(e)=>setFilter(e.target.value)}
                    className="bg-neutral-900 border-neutral-800"
                  />
                </div>

                {loading ? (
                  <div className="text-neutral-400">Carregando logs...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-neutral-500 text-sm">Nenhum log encontrado com esse filtro.</div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((log) => (
                      <TimeEditorCard
                        key={log.id}
                        log={log}
                        onInvalid={(msg) => toast({ title: 'Formato inválido', description: msg })}
                        onSave={(id, ts, ls) => updateTimes(id, ts, ls)}
                        ignored={ignoredIds.has(log.id)}
                        onToggleIgnored={(id) => setIgnoredIds(prev => {
                          const next = new Set(prev)
                          if (next.has(id)) next.delete(id); else next.add(id)
                          return next
                        })}
                        onToggleWin={updateWin}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


