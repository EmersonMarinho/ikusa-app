"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trophy, 
  Users, 
  TrendingUp, 
  Search, 
  Filter, 
  RefreshCw,
  Crown,
  Sword,
  Shield,
  UploadIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { isDefensePlayer, computeGearscore } from "@/lib/player-filters"

// Interfaces
interface PlayerGearscore {
  id: number
  user_id: string
  family_name: string
  character_name: string
  main_class: string
  ap: number
  aap: number
  dp: number
  gearscore: number
  link_gear?: string
  created_at: string
  last_updated: string
  // valores do registro anterior (para evolução)
  prev_gearscore?: number | null
  prev_recorded_at?: string | null
}

interface GuildStats {
  total_players: number
  average_gearscore: number
  top_players: PlayerGearscore[]
  class_distribution: Record<string, number>
  gearscore_ranges: {
    '751-800': number
    '801-850': number
    '851-900': number
  }
}

interface GearscoreHistory {
  id: number
  user_id: string
  ap: number
  aap: number
  dp: number
  gearscore: number
  recorded_at: string
}

export function GearscorePageComponent() {
  const [players, setPlayers] = useState<PlayerGearscore[]>([])
  const [stats, setStats] = useState<GuildStats | null>(null)
  const [history, setHistory] = useState<GearscoreHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("gearscore")
  const [sortOrder, setSortOrder] = useState("desc")
  const [limit] = useState(0) // Sem limite - mostra todos os players
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerGearscore | null>(null)
  // Membros da aliança para mapear família -> guilda
  const [familyToGuild, setFamilyToGuild] = useState<Record<string, string>>({})
  const [guildAverages, setGuildAverages] = useState<Record<string, { totalPlayers: number; averageGS: number }>>({})
  const [prevGuildAverages, setPrevGuildAverages] = useState<Record<string, { totalPlayers: number; averageGS: number }>>({})
  const [guildFilter, setGuildFilter] = useState<'all' | 'Manifest' | 'Allyance' | 'Grand_Order'>('all')
  const [classFilter, setClassFilter] = useState<'all' | string>('all')
  const availableClasses = Array.from(new Set(players.map(p => p.main_class))).sort()
  const [showAllEvolutions, setShowAllEvolutions] = useState<boolean>(false)
  
  // Estados para upload de gearscore
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Busca dados dos players
  const fetchPlayers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        guild: 'lollipop',
        limit: limit.toString(),
        sortBy,
        order: sortOrder
      })

      const response = await fetch(`/api/players-gearscore?${params}`)
      const data = await response.json()

      if (data.success) {
        setPlayers(data.data.players)
        setStats(data.data.stats)
      } else {
        setError(data.error || 'Erro ao buscar dados')
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      setError('Erro ao buscar dados dos players')
    } finally {
      setLoading(false)
    }
  }

  // Funções para upload de gearscore
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.name.endsWith('.json')) {
      setUploadFile(selectedFile)
      setUploadSuccess(false)
      setUploadError(null)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    setIsUploading(true)
    setUploadError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('guild', 'lollipop')

      const response = await fetch('/api/players-gearscore', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setUploadSuccess(true)
        setUploadFile(null)
        // Recarrega os dados após upload bem-sucedido
        await fetchPlayers()
      } else {
        setUploadError(data.error || 'Erro ao fazer upload do arquivo')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      setUploadError('Erro ao fazer upload do arquivo')
    } finally {
      setIsUploading(false)
    }
  }

  // Busca histórico de um player
  const fetchPlayerHistory = async (userId: string) => {
    try {
      const params = new URLSearchParams({
        guild: 'lollipop',
        history: 'true',
        userId
      })

      const response = await fetch(`/api/players-gearscore?${params}`)
      const data = await response.json()

      if (data.success && data.data.history) {
        setHistory(data.data.history)
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err)
    }
  }

  // Carrega dados iniciais
  useEffect(() => {
    fetchPlayers()
  }, [sortBy, sortOrder, limit])

  // Carrega cache de aliança para mapear famílias
  useEffect(() => {
    const loadAlliance = async () => {
      try {
        const res = await fetch('/api/alliance-cache')
        const data = await res.json()
        if (data?.success && Array.isArray(data.members)) {
          const map: Record<string, string> = {}
          for (const m of data.members) {
            if (m?.familia) {
              map[String(m.familia).toLowerCase()] = m.guilda
            }
          }
          setFamilyToGuild(map)
        }
      } catch (e) {
        // silencioso: se falhar, apenas não mostra por guilda
      }
    }
    loadAlliance()
  }, [])

  // Recalcula médias por guilda quando players ou mapa mudam
  useEffect(() => {
    if (players.length === 0) {
      setGuildAverages({})
      return
    }
    const allowedGuilds = ['Manifest', 'Allyance', 'Grand_Order']
    const sum: Record<string, { gs: number; count: number; gsPrev: number; countPrev: number }> = {}
    for (const g of allowedGuilds) sum[g] = { gs: 0, count: 0, gsPrev: 0, countPrev: 0 }
    for (const p of players) {
      const g = familyToGuild[p.family_name?.toLowerCase?.() || '']
      if (!allowedGuilds.includes(g)) continue
      // Médias por Guilda: mantém Shai, remove somente Defesa (classe) e nicks listados
      if (isDefensePlayer({ familyName: p.family_name, characterName: p.character_name, mainClass: p.main_class })) continue
      const gsCurr = computeGearscore(p.ap, p.aap, p.dp)
      sum[g].gs += gsCurr
      sum[g].count += 1
      const prev = (p as any).prev_gearscore
      if (prev != null) {
        sum[g].gsPrev += Number(prev)
        sum[g].countPrev += 1
      }
    }
    const result: Record<string, { totalPlayers: number; averageGS: number }> = {}
    const resultPrev: Record<string, { totalPlayers: number; averageGS: number }> = {}
    for (const g of allowedGuilds) {
      const c = sum[g].count
      result[g] = {
        totalPlayers: c,
        averageGS: c > 0 ? Math.round(sum[g].gs / c) : 0,
      }
      const cp = sum[g].countPrev
      resultPrev[g] = {
        totalPlayers: cp,
        averageGS: cp > 0 ? Math.round(sum[g].gsPrev / cp) : 0,
      }
    }
    setGuildAverages(result)
    setPrevGuildAverages(resultPrev)
  }, [players, familyToGuild])

  // Filtra players por busca e guilda
  const filteredPlayers = players.filter(player => {
    const matchesSearch =
      player.family_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.character_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.main_class.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (classFilter !== 'all' && player.main_class !== classFilter) return false
    if (guildFilter === 'all') return true
    const g = familyToGuild[player.family_name?.toLowerCase?.() || '']
    return g === guildFilter
  })

  // Funções auxiliares
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getGearscoreColor = (gs: number) => {
    if (gs >= 900) return "text-purple-600 font-bold"
    if (gs >= 850) return "text-red-600 font-semibold"
    if (gs >= 800) return "text-orange-600 font-semibold"
    if (gs >= 750) return "text-yellow-600"
    return "text-green-600"
  }

  const computePlayerGS = (p: PlayerGearscore) => computeGearscore(p.ap, p.aap, p.dp)

  const getClassColor = (className: string) => {
    const colors: Record<string, string> = {
      'Dosa': 'bg-blue-100 text-blue-800',
      'Striker': 'bg-red-100 text-red-800',
      'Ranger': 'bg-green-100 text-green-800',
      'Shai': 'bg-purple-100 text-purple-800',
      'Ninja': 'bg-gray-100 text-gray-800',
      'Berserker': 'bg-orange-100 text-orange-800',
      'Arqueiro': 'bg-yellow-100 text-yellow-800',
      'Tamer': 'bg-pink-100 text-pink-800',
      'Megu': 'bg-indigo-100 text-indigo-800',
      'Mistica': 'bg-teal-100 text-teal-800',
      'Wusa': 'bg-cyan-100 text-cyan-800',
      'Musah': 'bg-lime-100 text-lime-800',
      'Feiticeira': 'bg-violet-100 text-violet-800',
      'Bruxa': 'bg-rose-100 text-rose-800',
      'Deadeye': 'bg-slate-100 text-slate-800',
      'Corsaria': 'bg-amber-100 text-amber-800',
      'Lahn': 'bg-emerald-100 text-emerald-800',
      'Guardian': 'bg-sky-100 text-sky-800',
      'Hashashin': 'bg-fuchsia-100 text-fuchsia-800',
      'Kunoichi': 'bg-stone-100 text-stone-800',
      'Sage': 'bg-zinc-100 text-zinc-800',
      'Warrior': 'bg-neutral-100 text-neutral-800',
      'Nova': 'bg-slate-100 text-slate-800',
      'Drakania': 'bg-rose-100 text-rose-800'
    }
    return colors[className] || 'bg-gray-100 text-gray-800'
  }

  const getGuildBadgeClass = (guild?: string) => {
    if (guild === 'Manifest') return 'border-blue-700 text-blue-300'
    if (guild === 'Allyance') return 'border-green-700 text-green-300'
    if (guild === 'Grand_Order') return 'border-purple-700 text-purple-300'
    return 'border-yellow-700 text-yellow-300'
  }

  if (loading && players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando ranking de gearscore...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchPlayers}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary flex items-center justify-center gap-3">
          <Trophy className="h-10 w-10" />
          Ranking de Gearscore
        </h1>
        <p className="text-muted-foreground">
          Acompanhe a evolução do poder dos players da Lollipop
        </p>
      </div>

      {/* Upload de Gearscore */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <UploadIcon className="h-5 w-5" />
            Upload de Dados de Gearscore
          </CardTitle>
          <CardDescription>
            Faça upload de um arquivo JSON com dados de gearscore dos players
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="flex-1"
              placeholder="Selecione um arquivo JSON"
            />
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || isUploading}
              className="min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
          
          {uploadFile && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <FileTextIcon className="h-4 w-4" />
              <span>{uploadFile.name}</span>
              <Badge variant="outline">
                {(uploadFile.size / 1024).toFixed(1)} KB
              </Badge>
            </div>
          )}

          {uploadSuccess && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <CheckCircleIcon className="h-4 w-4" />
              <span>Upload realizado com sucesso! Dados atualizados.</span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <AlertCircleIcon className="h-4 w-4" />
              <span>{uploadError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abas de Navegação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas de Gearscore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ranking" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="ranking">Ranking Geral</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ranking" className="space-y-6">
              {/* Conteúdo do Ranking Geral */}
              {/* Cards de Estatísticas */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Players</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total_players}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Desconsiderando Shai e Defesa
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">GS Médio</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.average_gearscore}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top GS</CardTitle>
                      <Crown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.top_players[0]?.gearscore || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {players[0] ? formatDate(players[0].last_updated) : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Médias por Guilda */}
              {Object.keys(guildAverages).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Médias por Guilda
                    </CardTitle>
                    <CardDescription>Contagem e GS médio por guilda da aliança</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {(['Manifest','Allyance','Grand_Order'] as const).map(g => (
                        <div key={g} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{g}</div>
                            <Badge variant="outline" className={
                              g==='Manifest' ? 'border-blue-700 text-blue-300' :
                              g==='Allyance' ? 'border-green-700 text-green-300' :
                              'border-purple-700 text-purple-300'
                            }>
                              {guildAverages[g]?.totalPlayers || 0} players
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">GS médio</div>
                          <div className="text-2xl font-bold flex items-baseline gap-2">
                            <span>{guildAverages[g]?.averageGS || 0}</span>
                            {(() => {
                              const prev = prevGuildAverages[g]?.averageGS || 0
                              const curr = guildAverages[g]?.averageGS || 0
                              if (!prev) return null
                              const diff = curr - prev
                              const cls = diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-neutral-400'
                              const sign = diff > 0 ? '+' : ''
                              return <span className={`text-sm ${cls}`}>{sign}{diff} vs ant.</span>
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Distribuição de Gearscore */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Distribuição de Gearscore
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(stats.gearscore_ranges).map(([range, count]) => (
                      <div key={range} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{range}</span>
                          <span className="text-muted-foreground">{count} players</span>
                        </div>
                        <Progress 
                          value={(count / stats.total_players) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Top Players */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    Top Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.top_players.slice(0, 10).map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{player.family_name}</div>
                            <div className="text-sm text-muted-foreground">{player.character_name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{player.gearscore}</div>
                          <div className="text-sm text-muted-foreground">
                            AP: {player.ap} | DP: {player.dp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Players que mais evoluíram GS (minimalista, guilda inteira) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Maiores evoluções de GS (guilda)
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const countPrev = players.filter(p => (p as any).prev_gearscore != null).length
                        return `${countPrev} jogadores com histórico`
                      })()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const rows = players
                      .map((p) => {
                        const current = computePlayerGS(p)
                        const prev = (p as any).prev_gearscore as number | null | undefined
                        const diff = prev != null ? current - Number(prev) : null
                        return { p, current, prev, diff }
                      })
                      .filter(r => r.diff !== null)
                      .sort((a, b) => Number(b.diff) - Number(a.diff))
                    const limited = showAllEvolutions ? rows : rows.slice(0, 5)

                    if (rows.length === 0) {
                      return <div className="text-sm text-muted-foreground">Sem dados suficientes para evolução.</div>
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex justify-end">
                          {rows.length > 5 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAllEvolutions(v => !v)}
                            >
                              {showAllEvolutions ? 'Ver menos' : 'Ver mais'}
                            </Button>
                          )}
                        </div>
                        <div className="divide-y rounded-md border">
                          {limited.map(({ p, current, prev, diff }, i) => (
                            <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-muted-foreground w-6 text-right">{i + 1}.</span>
                                <span className="font-medium truncate flex items-center gap-2">
                                  {p.family_name}
                                  {(() => {
                                    const g = familyToGuild[p.family_name?.toLowerCase?.() || '']
                                    return (
                                      <Badge variant="outline" className={getGuildBadgeClass(g)}>
                                        {g || '—'}
                                      </Badge>
                                    )
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground hidden sm:inline">{prev}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-mono">{current}</span>
                                <span className={Number(diff) > 0 ? 'text-green-600 font-semibold' : Number(diff) < 0 ? 'text-red-600 font-semibold' : 'text-neutral-500'}>
                                  {Number(diff) > 0 ? `+${diff}` : diff}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Filtros e Controles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros e Controles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nome, família ou classe..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Select value={guildFilter} onValueChange={(v: any) => setGuildFilter(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por guilda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Guildas</SelectItem>
                        <SelectItem value="Manifest">Manifest</SelectItem>
                        <SelectItem value="Allyance">Allyance</SelectItem>
                        <SelectItem value="Grand_Order">Grand_Order</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={classFilter} onValueChange={(v: any) => setClassFilter(v)}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Filtrar por classe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Classes</SelectItem>
                        {availableClasses.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gearscore">Gearscore</SelectItem>
                        <SelectItem value="family_name">Família</SelectItem>
                        <SelectItem value="main_class">Classe</SelectItem>
                        <SelectItem value="ap">AP</SelectItem>
                        <SelectItem value="aap">AAP</SelectItem>
                        <SelectItem value="dp">DP</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Decrescente</SelectItem>
                        <SelectItem value="asc">Crescente</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={fetchPlayers} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Players */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sword className="h-5 w-5" />
                    Ranking de Players ({filteredPlayers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead>Guilda</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead className="text-center">AP</TableHead>
                          <TableHead className="text-center">AAP</TableHead>
                          <TableHead className="text-center">DP</TableHead>
                          <TableHead className="text-center font-bold">GS</TableHead>
                          <TableHead className="text-center">Última Atualização</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlayers.map((player, index) => (
                          <TableRow key={player.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-center">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{player.family_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {player.character_name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const g = familyToGuild[player.family_name?.toLowerCase?.() || '']
                                return (
                                  <Badge variant="outline" className={getGuildBadgeClass(g)}>
                                    {g || 'Desconhecida'}
                                  </Badge>
                                )
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge className={getClassColor(player.main_class)}>
                                {player.main_class}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {player.ap}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {player.aap}
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              {player.dp}
                            </TableCell>
                            <TableCell className={`text-center font-bold font-mono ${getGearscoreColor(player.gearscore)}`}>
                              {player.gearscore}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {formatDate(player.last_updated)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPlayer(player)
                                  fetchPlayerHistory(player.user_id)
                                }}
                              >
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Histórico
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Histórico */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Histórico de Gearscore - {selectedPlayer.family_name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPlayer(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedPlayer.ap}</div>
                  <div className="text-sm text-muted-foreground">AP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedPlayer.aap}</div>
                  <div className="text-sm text-muted-foreground">AAP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{selectedPlayer.dp}</div>
                  <div className="text-sm text-muted-foreground">DP</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getGearscoreColor(selectedPlayer.gearscore)}`}>
                    {selectedPlayer.gearscore}
                  </div>
                  <div className="text-sm text-muted-foreground">GS Total</div>
                </div>
              </div>

              {history.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Evolução do Gearscore</h4>
                  <div className="space-y-2">
                    {history.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(entry.recorded_at)}
                          </span>
                          <span className="font-mono">
                            AP: {entry.ap} | AAP: {entry.aap} | DP: {entry.dp}
                          </span>
                        </div>
                        <span className={`font-bold ${getGearscoreColor(entry.gearscore)}`}>
                          {entry.gearscore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlayer.link_gear && (
                <div className="text-center">
                  <Button asChild>
                    <a href={selectedPlayer.link_gear} target="_blank" rel="noopener noreferrer">
                      Ver Gear no Garmoth
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
