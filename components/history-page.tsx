"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getRealHistory, getMockHistory, type ProcessedLog } from "@/lib/mock-data"
import { CollapsibleClassItem } from "@/components/shared/collapsible-class-item"
import { GuildFilterChips } from "@/components/shared/guild-filter-chips"
import { StatsCard } from "@/components/shared/stats-card"
import { getGuildBadgeClasses } from "@/lib/guild-colors"
import {
  FileTextIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  UsersIcon,
  TrendingUpIcon,
  SwordIcon,
  XIcon,
  SkullIcon,
  TargetIcon,
  MapIcon,
  FlagIcon,
} from "lucide-react"

interface DayStats {
  date: string
  recordCount: number
  totalGeral: number
  guilds: string[]
  killStats?: Record<string, number>
  deathStats?: Record<string, number>
  kdStats?: Record<string, number>
  killsMatrix?: Record<string, Record<string, number>>
  territorios: Set<string>
  nodes: Set<string>
}

interface GuildStats {
  guild: string
  recordCount: number
  totalGeral: number
  totalKills: number
  totalDeaths: number
  averageKD: number
}

export function HistoryPage() {
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([])
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null)
  const [viewingComplete, setViewingComplete] = useState<string | null>(null)
  const [selectedGuildView, setSelectedGuildView] = useState<string>("all")
  const [modalSearch, setModalSearch] = useState<string>("")
  const [modalClassFilter, setModalClassFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("kills")
  const [showKillStats, setShowKillStats] = useState<Record<string, boolean>>({})
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllGuildStats, setShowAllGuildStats] = useState(false)

  // Load real data from Supabase
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const data = await getRealHistory()
        console.log('📊 Dados carregados do banco:', data)
        console.log('📊 Estrutura dos dados:', data.map(d => ({
          id: d.id,
          guild: d.guild,
          guilds: d.guilds,
          total_geral: d.total_geral,
          arquivo_nome: d.arquivo_nome,
          created_at: d.created_at,
          event_date: d.event_date,
          // Adicionar mais campos para debug
          territorio: d.territorio,
          node: d.node,
          kills_by_guild: d.kills_by_guild,
          deaths_by_guild: d.deaths_by_guild
        })))
        setHistoryData(data)
        setError(null)
      } catch (err) {
        console.error('Erro ao carregar histórico:', err)
        // Fallback para dados mock
        const mockData = getMockHistory()
        console.log('📊 Usando dados mock:', mockData)
        setHistoryData(mockData)
        setError('Erro ao carregar dados do banco. Usando dados simulados.')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [])

  // Get all unique guilds for filtering
  const allGuilds = useMemo(() => {
    const guilds = new Set<string>()
    historyData.forEach((record) => {
      if (record.guilds) {
        record.guilds.forEach((guild: string) => guilds.add(guild))
      } else if (record.guild) {
        guilds.add(record.guild)
      }
    })
    // Mantém somente as principais (case-insensitive): Lollipop, Harvest, Chernobyl, Kiev
    const main = ['lollipop','harvest','chernobyl','kiev']
    const filtered = Array.from(guilds).filter(g => main.includes(g.toLowerCase()))
    // Ordena na ordem desejada
    const order = new Map<string, number>([
      ['lollipop', 0],
      ['harvest', 1],
      ['chernobyl', 2],
      ['kiev', 3],
    ])
    return filtered.sort((a,b)=> (order.get(a.toLowerCase()) ?? 99) - (order.get(b.toLowerCase()) ?? 99))
  }, [historyData])

  // Filter records based on selected guilds
  const filteredRecords = useMemo(() => {
    console.log('🔍 Filtrando registros. Total de registros:', historyData.length)
    console.log('🔍 Guildas selecionadas:', selectedGuilds)
    
    if (selectedGuilds.length === 0) {
      console.log('🔍 Sem filtro de guilda, retornando todos os registros')
      return historyData
    }
    
    const filtered = historyData.filter((record) => {
      if (record.guilds) {
        return record.guilds.some((guild: string) => selectedGuilds.includes(guild))
      }
      return selectedGuilds.includes(record.guild)
    })
    
    console.log('🔍 Registros filtrados:', filtered.length)
    return filtered
  }, [historyData, selectedGuilds])

  // Aggregate data by day
  const dayStats = useMemo(() => {
    const stats: Record<string, DayStats> = {}

    console.log('📅 Processando agrupamento por dia...')
    console.log('📅 Registros para processar:', filteredRecords.length)

    filteredRecords.forEach((record) => {
      const recordCreatedAt = record.created_at
      const recordEventDate = record.event_date
      const recordDate = record.date
      
      console.log('📅 Processando registro:', {
        id: record.id,
        created_at: recordCreatedAt,
        event_date: recordEventDate,
        date: recordDate
      })
      
      const date = (() => {
        // Prioridade: event_date > created_at > date
        let targetDate: string | null = null
        
        if (record.event_date) {
          targetDate = record.event_date
        } else if (record.created_at) {
          targetDate = record.created_at
        } else if (record.date) {
          targetDate = record.date
        }
        
        if (!targetDate) {
          console.warn('⚠️ Registro sem data:', record.id)
          return new Date().toISOString().split('T')[0] // Data atual como fallback
        }
        
        // Se a data já está no formato YYYY-MM-DD, usa diretamente
        if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
          return targetDate
        }
        
        // Se é uma data ISO com timezone, converte corretamente
        try {
          const dateObj = new Date(targetDate)
          // Ajusta para timezone local para evitar deslocamento
          const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
          return localDate.toISOString().split('T')[0]
        } catch (error) {
          console.warn('⚠️ Erro ao processar data:', targetDate, error)
          return new Date().toISOString().split('T')[0] // Data atual como fallback
        }
      })()
      
      console.log('📅 Data extraída:', date)
      
      if (!stats[date]) {
        stats[date] = {
          date,
          recordCount: 0,
          totalGeral: 0,
          guilds: [],
          killStats: {},
          deathStats: {},
          kdStats: {},
          killsMatrix: {},
          territorios: new Set(),
          nodes: new Set(),
        }
      }

      stats[date].recordCount++
      stats[date].totalGeral += record.total_geral || record.totalGeral

      const guilds = record.guilds || [record.guild]
      guilds.forEach((guild: string) => {
        if (!stats[date].guilds.includes(guild)) {
          stats[date].guilds.push(guild)
        }
      })

      // Adicionar território e node
      if (record.territorio) {
        stats[date].territorios.add(record.territorio)
      }
      if (record.node) {
        stats[date].nodes.add(record.node)
      }

      // Kill statistics
      if (record.kills_by_guild) {
        Object.entries(record.kills_by_guild).forEach(([guild, kills]) => {
          if (!stats[date].killStats) stats[date].killStats = {}
          stats[date].killStats![guild] = (stats[date].killStats![guild] || 0) + (kills as number)
        })
      }

      // Death statistics
      if (record.deaths_by_guild) {
        Object.entries(record.deaths_by_guild).forEach(([guild, deaths]) => {
          if (!stats[date].deathStats) stats[date].deathStats = {}
          stats[date].deathStats![guild] = (stats[date].deathStats![guild] || 0) + (deaths as number)
        })
      }

      // KD ratio statistics
      if (record.kd_ratio_by_guild) {
        Object.entries(record.kd_ratio_by_guild).forEach(([guild, kd]) => {
          if (!stats[date].kdStats) stats[date].kdStats = {}
          stats[date].kdStats![guild] = (stats[date].kdStats![guild] || 0) + (kd as number)
        })
      }

      // Kills matrix
      if (record.kills_matrix) {
        if (!stats[date].killsMatrix) stats[date].killsMatrix = {}
        Object.entries(record.kills_matrix).forEach(([killer, victims]) => {
          if (!stats[date].killsMatrix![killer]) stats[date].killsMatrix![killer] = {}
          Object.entries(victims as Record<string, number>).forEach(([victim, count]) => {
            stats[date].killsMatrix![killer][victim] = (stats[date].killsMatrix![killer][victim] || 0) + count
          })
        })
      }
    })

    console.log('📅 Estatísticas por dia criadas:', Object.keys(stats))
    console.log('📅 Detalhes das estatísticas:', stats)

    return Object.values(stats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [filteredRecords])

  // Aggregate data by guild
  const guildStats = useMemo(() => {
    const stats: Record<string, GuildStats> = {}

    filteredRecords.forEach((record) => {
      const guilds = record.guilds || [record.guild]
      guilds.forEach((guild: string) => {
        if (!stats[guild]) {
          stats[guild] = {
            guild,
            recordCount: 0,
            totalGeral: 0,
            totalKills: 0,
            totalDeaths: 0,
            averageKD: 0,
          }
        }

        stats[guild].recordCount++
        stats[guild].totalGeral += record.total_geral || record.totalGeral

        if (record.kills_by_guild?.[guild]) {
          stats[guild].totalKills += record.kills_by_guild[guild]
        }
        if (record.deaths_by_guild?.[guild]) {
          stats[guild].totalDeaths += record.deaths_by_guild[guild]
        }
      })
    })

    // Calculate average KD for each guild
    Object.values(stats).forEach((guildStat) => {
      if (guildStat.totalDeaths > 0) {
        guildStat.averageKD = guildStat.totalKills / guildStat.totalDeaths
      } else {
        guildStat.averageKD = guildStat.totalKills
      }
    })

    return Object.values(stats).sort((a, b) => b.averageKD - a.averageKD)
  }, [filteredRecords])

  const toggleKillStats = (date: string) => {
    setShowKillStats((prev) => ({ ...prev, [date]: !prev[date] }))
  }

  const viewCompleteRecord = (recordId: string) => {
    setViewingComplete(recordId)
    setSelectedGuildView("all")
  }

  const closeCompleteRecord = () => {
    setViewingComplete(null)
    setSelectedGuildView("all")
  }

  // Fechar modal com tecla Esc
  useEffect(() => {
    if (!viewingComplete) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCompleteRecord()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewingComplete])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-neutral-400">Carregando histórico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-100 mb-2">Histórico de Logs</h1>
        <p className="text-neutral-400">Visualize e analise todos os logs processados</p>
      </div>

      {error && (
        <div className="bg-yellow-950/50 border border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">{error}</p>
        </div>
      )}

      {/* Guild Filter */}
      <GuildFilterChips
        allGuilds={allGuilds}
        selectedGuilds={selectedGuilds}
        onGuildToggle={(guild, checked) => {
          if (checked) {
            setSelectedGuilds((prev) => [...prev, guild])
          } else {
            setSelectedGuilds((prev) => prev.filter((g) => g !== guild))
          }
        }}
        onClearAll={() => setSelectedGuilds([])}
      />

      {/* Guild Statistics */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center justify-between">
            <span className="flex items-center">
              <TrendingUpIcon className="h-5 w-5 mr-2" />
              Estatísticas por Guilda
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-300 hover:text-neutral-100"
              onClick={() => setShowAllGuildStats(v => !v)}
            >
              {showAllGuildStats ? 'Mostrar principais' : 'Mostrar todas'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const mainLower = new Set(['lollipop','harvest','chernobyl','kiev'])
              const order = new Map<string, number>([
                ['lollipop', 0],
                ['harvest', 1],
                ['chernobyl', 2],
                ['kiev', 3],
              ])
              const list = (showAllGuildStats
                ? guildStats
                : guildStats.filter(g => mainLower.has((g.guild || '').toLowerCase()))
              ).sort((a,b)=> (order.get((a.guild||'').toLowerCase()) ?? 99) - (order.get((b.guild||'').toLowerCase()) ?? 99))
              return list.map((guildStat) => (
              <div
                key={guildStat.guild}
                className={`rounded-lg p-4 border ${getGuildBadgeClasses(guildStat.guild)}`}
              >
                <h3 className="text-lg font-semibold mb-3">{guildStat.guild}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Registros:</span>
                    <span className="text-neutral-200">{guildStat.recordCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Geral:</span>
                    <span className="text-neutral-200">{guildStat.totalGeral}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Kills:</span>
                    <span className="text-green-400">{guildStat.totalKills}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Deaths:</span>
                    <span className="text-red-400">{guildStat.totalDeaths}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">KD Médio:</span>
                    <span className={`font-semibold ${guildStat.averageKD >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                      {guildStat.averageKD.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Daily Statistics */}
      <div className="space-y-6">
        {dayStats.map((dayStat) => (
          <Card key={dayStat.date} className="border-neutral-800 bg-neutral-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-blue-400" />
                  <div>
                    <CardTitle className="text-neutral-100">{new Date(dayStat.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</CardTitle>
                    <p className="text-sm text-neutral-400">
                      {dayStat.recordCount} registro(s) • {dayStat.totalGeral} jogadores
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-900/50 text-blue-300">
                    {dayStat.guilds.length} guilda(s)
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKillStats(dayStat.date)}
                    className="text-neutral-400 hover:text-neutral-200"
                  >
                    {showKillStats[dayStat.date] ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Território e Node */}
              <div className="flex flex-wrap gap-2">
                {Array.from(dayStat.territorios).map((territorio) => (
                  <Badge key={territorio} variant="outline" className="border-blue-700 text-blue-300">
                    <MapIcon className="h-3 w-3 mr-1" />
                    {territorio}
                  </Badge>
                ))}
                {Array.from(dayStat.nodes).map((node) => (
                  <Badge key={node} variant="outline" className="border-green-700 text-green-300">
                    <FlagIcon className="h-3 w-3 mr-1" />
                    {node}
                  </Badge>
                ))}
              </div>

              {/* Guild Summary */}
              <div className="flex flex-wrap gap-2">
                {dayStat.guilds.map((guild) => (
                  <Badge key={guild} variant="outline" className={`${getGuildBadgeClasses(guild)}`}>
                    {guild}
                  </Badge>
                ))}
              </div>

              {/* Kill/Death Statistics */}
              {showKillStats[dayStat.date] && (
                <div className="space-y-4 pt-4 border-t border-neutral-700">
                  {/* Kill Stats */}
                  {dayStat.killStats && Object.keys(dayStat.killStats).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-300 mb-2 flex items-center">
                        <SwordIcon className="h-4 w-4 mr-2 text-green-400" />
                        Estatísticas de Kills
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(dayStat.killStats).map(([guild, kills]) => (
                          <div key={guild} className={`rounded p-3 ${getGuildBadgeClasses(guild)}`}>
                            <div className="text-sm font-medium">{guild}</div>
                            <div className="text-lg font-semibold text-green-400">{kills}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Death Stats */}
                  {dayStat.deathStats && Object.keys(dayStat.deathStats).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-300 mb-2 flex items-center">
                        <SkullIcon className="h-4 w-4 mr-2 text-red-400" />
                        Estatísticas de Deaths
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(dayStat.deathStats).map(([guild, deaths]) => (
                          <div key={guild} className={`rounded p-3 ${getGuildBadgeClasses(guild)}`}>
                            <div className="text-sm font-medium">{guild}</div>
                            <div className="text-lg font-semibold text-red-400">{deaths}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KD Ratio Stats */}
                  {dayStat.kdStats && Object.keys(dayStat.kdStats).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-300 mb-2 flex items-center">
                        <TargetIcon className="h-4 w-4 mr-2 text-blue-400" />
                        KD Ratio
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(dayStat.kdStats).map(([guild, kd]) => (
                          <div key={guild} className={`rounded p-3 ${getGuildBadgeClasses(guild)}`}>
                            <div className="text-sm font-medium">{guild}</div>
                            <div className={`text-lg font-semibold ${kd >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                              {kd.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kills Matrix */}
                  {dayStat.killsMatrix && Object.keys(dayStat.killsMatrix).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-neutral-300 mb-2">Matriz de Kills</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-neutral-700">
                              <th className="text-left p-2 text-neutral-400">Killer</th>
                              {dayStat.killsMatrix && Object.keys(dayStat.killsMatrix).map((guild) => (
                                <th key={guild} className={`text-center p-2 ${getGuildBadgeClasses(guild)}`}>
                                  {guild}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dayStat.killsMatrix && Object.entries(dayStat.killsMatrix).map(([killer, victims]) => (
                              <tr key={killer} className="border-b border-neutral-800">
                                <td className={`p-2 font-medium ${getGuildBadgeClasses(killer)}`}>{killer}</td>
                                {dayStat.killsMatrix && Object.keys(dayStat.killsMatrix).map((victim) => (
                                  <td key={victim} className="text-center p-2">
                                    <span className="text-neutral-200">
                                      {victims[victim] || 0}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Records List */}
              <div className="space-y-3 pt-4 border-t border-neutral-700">
                <h4 className="text-sm font-medium text-neutral-300">Registros do Dia</h4>
                <div className="space-y-2">
                  {(() => {
                    const dayRecords = filteredRecords.filter((record) => {
                      // Usa a mesma lógica de processamento de data
                      const recordDate = (() => {
                        let targetDate: string | null = null
                        
                        if (record.event_date) {
                          targetDate = record.event_date
                        } else if (record.created_at) {
                          targetDate = record.created_at
                        } else if (record.date) {
                          targetDate = record.date
                        }
                        
                        if (!targetDate) return null
                        
                        // Se a data já está no formato YYYY-MM-DD, usa diretamente
                        if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
                          return targetDate
                        }
                        
                        // Se é uma data ISO com timezone, converte corretamente
                        try {
                          const dateObj = new Date(targetDate)
                          // Ajusta para timezone local para evitar deslocamento
                          const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
                          return localDate.toISOString().split('T')[0]
                        } catch (error) {
                          console.warn('⚠️ Erro ao processar data para filtro:', targetDate, error)
                          return null
                        }
                      })()
                      
                      return recordDate === dayStat.date
                    })
                    
                    console.log(`📅 Registros para ${dayStat.date}:`, dayRecords.length)
                    console.log(`📅 Dados dos registros:`, dayRecords.map(r => ({
                      id: r.id,
                      arquivo_nome: r.arquivo_nome,
                      guild: r.guild,
                      guilds: r.guilds,
                      created_at: r.created_at,
                      event_date: r.event_date
                    })))
                    
                    return dayRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between bg-neutral-800 rounded-lg p-3 hover:bg-neutral-750 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FileTextIcon className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-neutral-200 font-medium">{record.arquivo_nome || record.filename}</p>
                            <p className="text-sm text-neutral-400">
                              {record.guilds ? `${record.guilds.length} guilda(s)` : record.guild} • {record.total_geral || record.totalGeral} jogadores
                            </p>
                            {/* Território e Node */}
                            <div className="flex items-center space-x-2 mt-1">
                              {record.territorio && (
                                <Badge variant="outline" className="border-blue-700 text-blue-300 text-xs">
                                  <MapIcon className="h-3 w-3 mr-1" />
                                  {record.territorio}
                                </Badge>
                              )}
                              {record.node && (
                                <Badge variant="outline" className="border-green-700 text-green-300 text-xs">
                                  <FlagIcon className="h-3 w-3 mr-1" />
                                  {record.node}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewCompleteRecord(record.id)}
                          className="text-neutral-400 hover:text-neutral-200"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete Record View Modal */}
      {viewingComplete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {(() => {
                const record = historyData.find((r) => r.id === viewingComplete)
                if (!record) return null

                const processedData = record.processedData || record
                const guilds = processedData.guilds || [processedData.guild]
                
                // Usa a mesma lógica de processamento de data
                const eventDateIso = (() => {
                  let targetDate: string | null = null
                  
                  if (record.event_date) {
                    targetDate = record.event_date
                  } else if (record.created_at) {
                    targetDate = record.created_at
                  } else if (record.date) {
                    targetDate = record.date
                  }
                  
                  if (!targetDate) return null
                  
                  // Se a data já está no formato YYYY-MM-DD, usa diretamente
                  if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
                    return targetDate
                  }
                  
                  // Se é uma data ISO com timezone, converte corretamente
                  try {
                    const dateObj = new Date(targetDate)
                    // Ajusta para timezone local para evitar deslocamento
                    const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
                    return localDate.toISOString()
                  } catch (error) {
                    console.warn('⚠️ Erro ao processar data no modal:', targetDate, error)
                    return null
                  }
                })()
                
                const headerDate = eventDateIso ? new Date(eventDateIso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

                return (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-neutral-100">{headerDate || 'Registro Completo'}</h2>
                        {record.arquivo_nome && (
                          <p className="text-sm text-neutral-400 mt-1">Arquivo: {record.arquivo_nome}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={closeCompleteRecord}>
                        <XIcon className="h-5 w-5" />
                      </Button>
                    </div>

                    <Tabs defaultValue="resumo">
                      <TabsList className="bg-neutral-800 border border-neutral-700">
                        <TabsTrigger value="resumo">Resumo</TabsTrigger>
                        <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
                        <TabsTrigger value="matriz">Matriz</TabsTrigger>
                        <TabsTrigger value="kd-vs-guildas">KD vs Guildas</TabsTrigger>
                      </TabsList>

                      <TabsContent value="resumo" className="space-y-6 mt-4">
                        {/* Informações da Guerra */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {processedData.territorio && (
                            <StatsCard 
                              title="Território" 
                              value={processedData.territorio} 
                              icon={MapIcon} 
                              variant="info" 
                            />
                          )}
                          {processedData.node && (
                            <StatsCard 
                              title="Node" 
                              value={processedData.node} 
                              variant="info" 
                            />
                          )}
                          {processedData.guildasAdversarias && (
                            <StatsCard 
                              title="Guildas Adversárias" 
                              value={processedData.guildasAdversarias.length} 
                              variant="warning" 
                            />
                          )}
                        </div>

                        {/* Guild Selector */}
                        {guilds.length > 1 && (
                          <div className="flex items-center space-x-3">
                            <label className="text-neutral-300">Guilda:</label>
                            <Select value={selectedGuildView} onValueChange={setSelectedGuildView}>
                              <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas as Guildas</SelectItem>
                                {guilds.map((guild: string) => (
                                  <SelectItem key={guild} value={guild}>
                                    {guild}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <StatsCard
                            title="Guilda"
                            value={selectedGuildView === "all" ? guilds.join(", ") : selectedGuildView}
                            icon={UsersIcon}
                            variant="info"
                          />
                          <StatsCard
                            title="Total Geral"
                            value={processedData.total_geral || processedData.totalGeral}
                            variant="success"
                          />
                          {processedData.kills_by_guild && (
                            <StatsCard
                              title="Total Kills"
                              value={Object.values(processedData.kills_by_guild || {}).reduce((a: any, b: any) => (a || 0) + (b || 0), 0) as number}
                              icon={SwordIcon}
                              variant="success"
                            />
                          )}
                        </div>

                        {/* Classes Breakdown */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-neutral-100">Total por Classe</h3>
                          <div className="space-y-3">
                            {(processedData.total_por_classe || processedData.totalPorClasse).map(({ classe, count }: any) => {
                              const playersBase = selectedGuildView === "all" || !processedData.classes_by_guild
                                ? (processedData.classes || {})[classe] || []
                                : (processedData.classes_by_guild || {})[selectedGuildView]?.[classe] || []

                              // Enriquecer players com K/D do dia, se disponível
                              const players = playersBase.map((p: any) => {
                                const statsGuild = processedData.playerStatsByGuild || processedData.player_stats_by_guild || {}
                                let kdInfo: { kills?: number; deaths?: number } = {}
                                let killsVsChernobyl: number | undefined
                                if (selectedGuildView === 'all') {
                                  for (const [guildName, byNick] of Object.entries(statsGuild as any)) {
                                    if ((byNick as any)[p.nick]) {
                                      kdInfo = { kills: (byNick as any)[p.nick].kills, deaths: (byNick as any)[p.nick].deaths }
                                      if (typeof (byNick as any)[p.nick].kills_vs_chernobyl === 'number') {
                                        killsVsChernobyl = (byNick as any)[p.nick].kills_vs_chernobyl
                                      }
                                      break
                                    }
                                  }
                                } else {
                                  const byNick = (statsGuild as any)[selectedGuildView] || {}
                                  if (byNick[p.nick]) {
                                    kdInfo = { kills: byNick[p.nick].kills, deaths: byNick[p.nick].deaths }
                                    if (typeof byNick[p.nick].kills_vs_chernobyl === 'number') {
                                      killsVsChernobyl = byNick[p.nick].kills_vs_chernobyl
                                    }
                                  }
                                }
                                return { nick: p.nick, familia: p.familia, killsVsChernobyl, ...kdInfo }
                              })

                              return (
                                <CollapsibleClassItem
                                  key={classe}
                                  classe={classe}
                                  count={players.length}
                                  players={players}
                                  total={Number(processedData.total_geral || processedData.totalGeral)}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="jogadores" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <Label>Buscar jogador</Label>
                            <Input placeholder="nick..." value={modalSearch} onChange={(e)=>setModalSearch(e.target.value)} className="bg-neutral-800 border-neutral-700" />
                          </div>
                          <div>
                            <Label>Guilda</Label>
                            <Select value={selectedGuildView} onValueChange={setSelectedGuildView}>
                              <SelectTrigger className="bg-neutral-800 border-neutral-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {guilds.map((g: string)=>(<SelectItem key={g} value={g}>{g}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Classe</Label>
                            <Select value={modalClassFilter} onValueChange={setModalClassFilter}>
                              <SelectTrigger className="bg-neutral-800 border-neutral-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {Array.from(new Set(Object.values((processedData.playerStatsByGuild || processedData.player_stats_by_guild || {}) as any)
                                  .flatMap((byNick: any)=> Object.values(byNick as any).map((p:any)=> p.classe || 'Desconhecida')))).sort().map((c:any)=> (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Ordenar por</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                              <SelectTrigger className="bg-neutral-800 border-neutral-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kills">Kills (maior)</SelectItem>
                                <SelectItem value="kd">K/D (maior)</SelectItem>
                                <SelectItem value="kd_chernobyl">K/D vs Chernobyl (maior)</SelectItem>
                                <SelectItem value="deaths">Deaths (menor)</SelectItem>
                                <SelectItem value="nick">Nome (A-Z)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Resumo de composição por classe (da guilda selecionada ou todas) */}
                        {(() => {
                          const statsGuild = processedData.playerStatsByGuild || processedData.player_stats_by_guild || {}
                          const wantedGuilds = selectedGuildView === 'all' ? guilds : [selectedGuildView]
                          const classCounts: Record<string, number> = {}
                          for (const g of wantedGuilds) {
                            const byNick = (statsGuild as any)[g] || {}
                            for (const [, st] of Object.entries(byNick)) {
                              const classe = (st as any).classe || 'Desconhecida'
                              classCounts[classe] = (classCounts[classe] || 0) + 1
                            }
                          }
                          const summary = Object.entries(classCounts)
                            .sort((a,b)=> b[1]-a[1])
                            .map(([c,n])=> `${n} ${c}`)
                            .join('  •  ')
                          return (
                            <div className="text-sm text-neutral-300">
                              <span className="text-neutral-400 mr-2">Composição:</span>
                              {summary || '—'}
                            </div>
                          )
                        })()}

                        {(() => {
                          const statsGuild = processedData.playerStatsByGuild || processedData.player_stats_by_guild || {}
                          const wantedGuilds = selectedGuildView === 'all' ? guilds : [selectedGuildView]
                          const rows: Array<{nick:string; familia:string; guilda:string; classe:string; kills:number; deaths:number; kd:number; killsC:number; deathsC:number; kdC:number}> = []
                          for (const g of wantedGuilds) {
                            const byNick = (statsGuild as any)[g] || {}
                            for (const [nick, st] of Object.entries(byNick)) {
                              const classe = (st as any).classe || 'Desconhecida'
                              const kills = (st as any).kills || 0
                              const deaths = (st as any).deaths || 0
                              const killsC = (st as any).kills_vs_chernobyl || 0
                              const deathsC = (st as any).deaths_vs_chernobyl || 0
                              const kd = deaths>0? kills/deaths : (kills>0? Infinity:0)
                              const kdC = deathsC>0? killsC/deathsC : (killsC>0? Infinity:0)
                              rows.push({ nick, familia: (st as any).familia || '', guilda: g, classe, kills, deaths, kd, killsC, deathsC, kdC })
                            }
                          }
                          const filtered = rows.filter(r =>
                            (modalSearch ? r.nick.toLowerCase().includes(modalSearch.toLowerCase()) : true) &&
                            (modalClassFilter==='all' ? true : r.classe === modalClassFilter)
                          ).sort((a,b)=> {
                            if (sortBy === 'kills') return b.kills - a.kills
                            if (sortBy === 'kd') {
                              // Ordena Infinity no topo, depois por K/D decrescente
                              if (!isFinite(b.kd) && isFinite(a.kd)) return 1
                              if (!isFinite(a.kd) && isFinite(b.kd)) return -1
                              if (b.kd === a.kd) return b.kills - a.kills
                              return b.kd - a.kd
                            }
                            if (sortBy === 'kd_chernobyl') {
                              // Ordena Infinity no topo, depois por K/D vs Chernobyl decrescente
                              if (!isFinite(b.kdC) && isFinite(a.kdC)) return 1
                              if (!isFinite(a.kdC) && isFinite(b.kdC)) return -1
                              if (b.kdC === a.kdC) return b.killsC - a.killsC
                              return b.kdC - a.kdC
                            }
                            if (sortBy === 'deaths') return a.deaths - b.deaths
                            if (sortBy === 'nick') return a.nick.localeCompare(b.nick)
                            return 0
                          })

                          return (
                            <div className="overflow-x-auto border border-neutral-800 rounded-lg">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-neutral-700">
                                    <th className="text-left p-2 text-neutral-300">Jogador</th>
                                    <th className="text-left p-2 text-neutral-300">Família</th>
                                    <th className="text-left p-2 text-neutral-300">Guilda</th>
                                    <th className="text-left p-2 text-neutral-300">Classe</th>
                                    <th className="text-center p-2 text-neutral-300">Kills</th>
                                    <th className="text-center p-2 text-neutral-300">Deaths</th>
                                    <th className="text-center p-2 text-neutral-300">K/D</th>
                                    {selectedGuildView === 'Lollipop' && (
                                      <>
                                        <th className="text-center p-2 text-neutral-300">Kills vs Chernobyl</th>
                                        <th className="text-center p-2 text-neutral-300">Deaths vs Chernobyl</th>
                                        <th className="text-center p-2 text-neutral-300">K/D vs Chernobyl</th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {filtered.map((r,i)=> (
                                    <tr key={`${r.nick}-${i}`} className="border-b border-neutral-800 hover:bg-neutral-800">
                                      <td className="p-2 text-neutral-200 font-medium">{r.nick}</td>
                                      <td className="p-2 text-neutral-300">{r.familia}</td>
                                      <td className="p-2 text-neutral-300">{r.guilda}</td>
                                      <td className="p-2 text-neutral-300">{r.classe}</td>
                                      <td className="p-2 text-center text-green-400 font-medium">{r.kills}</td>
                                      <td className="p-2 text-center text-red-400 font-medium">{r.deaths}</td>
                                      <td className="p-2 text-center font-semibold">{r.kd===Infinity? '∞' : r.kd.toFixed(2)}</td>
                                      {selectedGuildView === 'Lollipop' && (
                                        <>
                                          <td className="p-2 text-center text-green-400">{r.killsC}</td>
                                          <td className="p-2 text-center text-red-400">{r.deathsC}</td>
                                          <td className="p-2 text-center font-semibold">{r.kdC===Infinity? '∞' : r.kdC.toFixed(2)}</td>
                                        </>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        })()}
                      </TabsContent>

                      <TabsContent value="matriz" className="mt-4">
                        {processedData.kills_matrix && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-neutral-700">
                                  <th className="text-left p-2 text-neutral-400">Killer</th>
                                  {Object.keys(processedData.kills_matrix).map((g:string)=> (
                                    <th key={g} className={`text-center p-2 ${getGuildBadgeClasses(g)}`}>{g}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(processedData.kills_matrix).map(([killer, victims]: any) => (
                                  <tr key={killer} className="border-b border-neutral-800">
                                    <td className={`p-2 font-medium ${getGuildBadgeClasses(killer)}`}>{killer}</td>
                                    {Object.keys(processedData.kills_matrix).map((victim:string)=> (
                                      <td key={victim} className="text-center p-2 text-neutral-200">{victims[victim] || 0}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="kd-vs-guildas" className="mt-4">
                        {(() => {
                          // Calcula K/D geral contra cada guilda
                          const statsGuild = processedData.playerStatsByGuild || processedData.player_stats_by_guild || {}
                          const guildStats: Record<string, { kills: number; deaths: number; kd: number; players: number }> = {}
                          
                          // Inicializa estatísticas para cada guilda
                          guilds.forEach((guild: string) => {
                            guildStats[guild] = { kills: 0, deaths: 0, kd: 0, players: 0 }
                          })
                          
                          // Soma kills e deaths por guilda
                          Object.entries(statsGuild).forEach(([guildName, byNick]: [string, any]) => {
                            Object.values(byNick).forEach((player: any) => {
                              const kills = player.kills || 0
                              const deaths = player.deaths || 0
                              
                              guildStats[guildName].kills += kills
                              guildStats[guildName].deaths += deaths
                              guildStats[guildName].players += 1
                            })
                          })
                          
                          // Calcula K/D para cada guilda
                          Object.values(guildStats).forEach(stats => {
                            if (stats.deaths > 0) {
                              stats.kd = stats.kills / stats.deaths
                            } else {
                              stats.kd = stats.kills > 0 ? Infinity : 0
                            }
                          })
                          
                          // Ordena guildas por K/D (maior primeiro)
                          const sortedGuilds = Object.entries(guildStats)
                            .sort(([,a], [,b]) => {
                              if (!isFinite(b.kd) && isFinite(a.kd)) return 1
                              if (!isFinite(a.kd) && isFinite(b.kd)) return -1
                              if (b.kd === a.kd) return b.kills - a.kills
                              return b.kd - a.kd
                            })
                          
                          return (
                            <div className="space-y-4">
                              <div className="text-sm text-neutral-400">
                                K/D geral da aliança contra cada guilda neste dia • {guilds.length} guildas analisadas
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedGuilds.map(([guildName, stats]) => (
                                  <Card key={guildName} className={`border bg-neutral-800 ${getGuildBadgeClasses(guildName)}`}>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                          <UsersIcon className="h-4 w-4 text-blue-400" />
                                          {guildName}
                                        </span>
                                        <Badge variant="outline" className="border-neutral-600 text-neutral-300 bg-neutral-800">
                                          {stats.players} jogadores
                                        </Badge>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                                          <div className="text-lg font-bold text-green-400">{stats.kills}</div>
                                          <div className="text-xs text-neutral-400">Kills</div>
                                        </div>
                                        <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                                          <div className="text-xs font-bold text-red-400">{stats.deaths}</div>
                                          <div className="text-xs text-neutral-400">Deaths</div>
                                        </div>
                                      </div>
                                      <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                                        <div className={`text-lg font-bold ${
                                          stats.kd >= 1 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {stats.kd === Infinity ? '∞' : stats.kd.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-neutral-400">K/D Geral</div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </TabsContent>
                    </Tabs>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

