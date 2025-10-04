"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type ScraperPlayer = {
  nome: string
  url: string
  papd_maximo: number | null
  perfil_privado: boolean
}

type ScraperGuildResult = {
  guild_info: { nome: string }
  players: ScraperPlayer[]
  total_players: number
  players_with_papd: number
  private_profiles: number
  scraping_timestamp: string
}

type Consolidated = Record<string, ScraperGuildResult>

function computeGS(papd: number | null | undefined): number {
  return typeof papd === 'number' ? papd : 0
}

//

export function ChernobylMonitorPage() {
  const [currentData, setCurrentData] = useState<ScraperGuildResult | null>(null)
  const [prevSnapshot, setPrevSnapshot] = useState<{ average_papd: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingScrape, setLoadingScrape] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [foundLinks, setFoundLinks] = useState<number>(0)

  const handleScrapeNow = async () => {
    try {
      setLoadingScrape(true)
      setError(null)
      // 1) Busca links primeiro
      const resLinks = await fetch(`/api/chernobyl-scrape?guilds=Oxion,Guilty&mode=links`, { cache: 'no-store' })
      const jsonLinks = await resLinks.json()
      if (!jsonLinks?.success) throw new Error(jsonLinks?.error || 'Falha ao buscar links')
      const links: { nome: string; url: string }[] = jsonLinks.data.links || []
      setProgress({ done: 0, total: links.length })
      setFoundLinks(links.length)

      // 2) Processa cada perfil com progresso
      const players: ScraperPlayer[] = []
      const fetchWithRetry = async (l: { nome: string; url: string }, attempts = 3): Promise<ScraperPlayer> => {
        for (let t = 0; t < attempts; t++) {
          try {
            const resP = await fetch(`/api/chernobyl-scrape/player?url=${encodeURIComponent(l.url)}&nome=${encodeURIComponent(l.nome)}`, { cache: 'no-store' })
            const jp = await resP.json()
            if (jp?.success) return jp.data as ScraperPlayer
          } catch {
            // continua
          }
        }
        return { nome: l.nome, url: l.url, papd_maximo: null, perfil_privado: true }
      }
      for (let i = 0; i < links.length; i++) {
        const l = links[i]
        const profile = await fetchWithRetry(l, 3)
        players.push(profile)
        setProgress(prev => ({ done: prev.done + 1, total: links.length }))
      }

      const data: ScraperGuildResult = {
        guild_info: { nome: 'Oxion + Guilty' },
        players,
        total_players: players.length,
        players_with_papd: players.filter(p => p.papd_maximo != null).length,
        private_profiles: players.filter(p => p.papd_maximo == null || p.perfil_privado).length,
        scraping_timestamp: new Date().toISOString()
      }
      setCurrentData(data)
    } catch (e: any) {
      setError(e?.message || 'Falha no scraping')
    } finally {
      setLoadingScrape(false)
      setProgress({ done: 0, total: 0 })
      setFoundLinks(0)
    }
  }

  const currentPlayers = useMemo(() => currentData?.players || [], [currentData])
  const visiblePapd = useMemo(() => currentPlayers.filter(p => p.papd_maximo != null), [currentPlayers])
  const privateProfiles = useMemo(() => currentPlayers.filter(p => p.papd_maximo == null || p.perfil_privado), [currentPlayers])
  const timestamp = currentData?.scraping_timestamp ? new Date(currentData.scraping_timestamp) : null
  const averagePapd = useMemo(() => {
    const vals = visiblePapd.map(p => p.papd_maximo || 0)
    if (vals.length === 0) return 0
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }, [visiblePapd])

  const avgDiff = useMemo(() => {
    if (!prevSnapshot) return null
    return averagePapd - Number(prevSnapshot.average_papd || 0)
  }, [averagePapd, prevSnapshot])

  useEffect(() => {
    // Carrega último e penúltimo snapshots
    const loadSnapshots = async () => {
      try {
        const res = await fetch('/api/chernobyl-snapshots?limit=2', { cache: 'no-store' })
        const j = await res.json()
        if (j?.success && Array.isArray(j.data) && j.data.length > 0) {
          const [latest, previous] = j.data
          if (latest?.players) {
            setCurrentData({
              guild_info: { nome: (latest.guilds || ['Oxion','Guilty']).join(' + ') },
              players: latest.players || [],
              total_players: latest.total_players || 0,
              players_with_papd: latest.visible_count || 0,
              private_profiles: latest.private_count || 0,
              scraping_timestamp: latest.scraping_timestamp || latest.created_at || new Date().toISOString()
            })
          }
          if (previous) setPrevSnapshot({ average_papd: Number(previous.average_papd || 0) })
        }
      } catch {
        // silencioso
      }
    }
    loadSnapshots()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">Monitoramento Chernobyl</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Dados</CardTitle>
              <CardDescription>Último snapshot salvo e atualização via scraping</CardDescription>
            </div>
            <button
              className={`px-3 py-2 rounded border ${loadingScrape ? 'opacity-60' : ''}`}
              onClick={handleScrapeNow}
              disabled={loadingScrape}
            >
              {loadingScrape ? 'Atualizando...' : 'Atualizar gear'}
            </button>
          </div>
        </CardHeader>
        {loadingScrape && (
          <CardContent>
            <div className="text-sm text-neutral-300">
              Links encontrados: {foundLinks} • Processando perfis: {progress.done}/{progress.total}
            </div>
            <div className="mt-2 h-2 w-full bg-neutral-800 rounded">
              <div
                className="h-2 bg-blue-600 rounded"
                style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {currentData && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>
              Guildas: Oxion + Guilty
              {timestamp && (
                <span className="ml-2 text-xs text-neutral-400">{timestamp.toLocaleString('pt-BR')}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Com PAPD visível</div>
              <div className="text-2xl font-bold">{visiblePapd.length}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Perfis privados</div>
              <div className="text-2xl font-bold">{privateProfiles.length}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total coletado</div>
              <div className="text-2xl font-bold">{currentPlayers.length}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">GS médio (PAPD)</div>
              <div className="text-2xl font-bold flex items-baseline gap-2">
                <span>{averagePapd}</span>
                {avgDiff !== null && (
                  <span className={`text-sm ${avgDiff > 0 ? 'text-green-500' : avgDiff < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                    {avgDiff > 0 ? `+${avgDiff}` : avgDiff}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Com PAPD visível</CardTitle>
              <CardDescription>Oxion + Chernobyl</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Jogador</TableHead>
                      <TableHead className="text-right">PAPD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePapd
                      .sort((a, b) => computeGS(b.papd_maximo) - computeGS(a.papd_maximo))
                      .map((p, i) => (
                        <TableRow key={`${p.nome}-${i}`}>
                          <TableCell className="text-center">{i + 1}</TableCell>
                          <TableCell className="truncate">{p.nome}</TableCell>
                          <TableCell className="text-right font-mono">{computeGS(p.papd_maximo)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Perfis privados</CardTitle>
              <CardDescription>Sem PAPD visível</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto max-h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Jogador</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {privateProfiles.map((p, i) => (
                      <TableRow key={`${p.nome}-${i}`}>
                        <TableCell className="text-center">{i + 1}</TableCell>
                        <TableCell className="truncate">{p.nome}</TableCell>
                        <TableCell className="text-right text-neutral-400">Privado</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentData && (
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded border"
            onClick={async () => {
              try {
                const payload = {
                  guilds: ['Oxion','Guilty'],
                  players: currentPlayers,
                  total_players: currentPlayers.length,
                  visible_count: visiblePapd.length,
                  private_count: privateProfiles.length,
                  average_papd: averagePapd,
                  scraping_timestamp: timestamp?.toISOString?.() || new Date().toISOString()
                }
                const res = await fetch('/api/chernobyl-snapshots', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                })
                const j = await res.json()
                if (!j?.success) throw new Error(j?.error || 'Falha ao salvar')
                alert('Snapshot salvo!')
              } catch (e: any) {
                alert(e?.message || 'Erro ao salvar')
              }
            }}
          >
            Salvar snapshot
          </button>
          <button
            className="px-3 py-2 rounded border"
            onClick={async () => {
              try {
                const res = await fetch('/api/chernobyl-snapshots?limit=5', { cache: 'no-store' })
                const j = await res.json()
                if (!j?.success) throw new Error(j?.error || 'Falha ao carregar snapshots')
                console.log('Últimos snapshots:', j.data)
                alert(`Carregado ${j.data?.length || 0} snapshot(s). Veja o console para detalhes.`)
              } catch (e: any) {
                alert(e?.message || 'Erro ao carregar snapshots')
              }
            }}
          >
            Ver últimos snapshots (console)
          </button>
        </div>
      )}

      {/* Removido: comparação/dif, por enquanto apenas listas */}
    </div>
  )
}


