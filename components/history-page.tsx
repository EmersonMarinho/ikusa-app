"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getRealHistory, getMockHistory, type ProcessedLog } from "@/lib/mock-data"
import { CollapsibleClassItem } from "@/components/shared/collapsible-class-item"
import { GuildFilterChips } from "@/components/shared/guild-filter-chips"
import { StatsCard } from "@/components/shared/stats-card"
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
  const [showKillStats, setShowKillStats] = useState<Record<string, boolean>>({})
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load real data from Supabase
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const data = await getRealHistory()
        setHistoryData(data)
        setError(null)
      } catch (err) {
        console.error('Erro ao carregar histórico:', err)
        // Fallback para dados mock
        const mockData = getMockHistory()
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
    return Array.from(guilds).sort()
  }, [historyData])

  // Filter records based on selected guilds
  const filteredRecords = useMemo(() => {
    if (selectedGuilds.length === 0) return historyData
    return historyData.filter((record) => {
      if (record.guilds) {
        return record.guilds.some((guild: string) => selectedGuilds.includes(guild))
      }
      return selectedGuilds.includes(record.guild)
    })
  }, [historyData, selectedGuilds])

  // Aggregate data by day
  const dayStats = useMemo(() => {
    const stats: Record<string, DayStats> = {}

    filteredRecords.forEach((record) => {
      const date = record.created_at ? record.created_at.split('T')[0] : record.date
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
        onGuildToggle={(guild) => {
          setSelectedGuilds((prev) =>
            prev.includes(guild) ? prev.filter((g) => g !== guild) : [...prev, guild]
          )
        }}
        onClearAll={() => setSelectedGuilds([])}
      />

      {/* Guild Statistics */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center">
            <TrendingUpIcon className="h-5 w-5 mr-2" />
            Estatísticas por Guilda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guildStats.map((guildStat) => (
              <div
                key={guildStat.guild}
                className="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
              >
                <h3 className="text-lg font-semibold text-neutral-100 mb-3">{guildStat.guild}</h3>
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
            ))}
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
                    <CardTitle className="text-neutral-100">{dayStat.date}</CardTitle>
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
                  <Badge key={guild} variant="outline" className="border-neutral-700 text-neutral-300">
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
                          <div key={guild} className="bg-neutral-800 rounded p-3">
                            <div className="text-sm text-neutral-400">{guild}</div>
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
                          <div key={guild} className="bg-neutral-800 rounded p-3">
                            <div className="text-sm text-neutral-400">{guild}</div>
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
                          <div key={guild} className="bg-neutral-800 rounded p-3">
                            <div className="text-sm text-neutral-400">{guild}</div>
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
                                <th key={guild} className="text-center p-2 text-neutral-400">
                                  {guild}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dayStat.killsMatrix && Object.entries(dayStat.killsMatrix).map(([killer, victims]) => (
                              <tr key={killer} className="border-b border-neutral-800">
                                <td className="p-2 text-neutral-300 font-medium">{killer}</td>
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
                  {filteredRecords
                    .filter((record) => {
                      const recordDate = record.created_at ? record.created_at.split('T')[0] : record.date
                      return recordDate === dayStat.date
                    })
                    .map((record) => (
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
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete Record View Modal */}
      {viewingComplete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-100">Registro Completo</h2>
                <Button variant="ghost" size="sm" onClick={closeCompleteRecord}>
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>

              {(() => {
                const record = historyData.find((r) => r.id === viewingComplete)
                if (!record) return null

                const processedData = record.processedData || record
                const guilds = processedData.guilds || [processedData.guild]

                return (
                  <div className="space-y-6">
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

