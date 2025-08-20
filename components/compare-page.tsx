"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { getRealHistory, getMockHistory, type ProcessedLog } from "@/lib/mock-data"
import { CollapsibleClassItem } from "@/components/shared/collapsible-class-item"
import { StatsCard } from "@/components/shared/stats-card"
import {
  UsersIcon,
  CopyIcon,
  TrendingUpIcon,
  SwordIcon,
  SkullIcon,
  TargetIcon,
  MapIcon,
  FlagIcon,
  AlertCircleIcon,
} from "lucide-react"

interface GuildComparisonStats {
  guild: string
  totalPlayers: number
  totalKills: number
  totalDeaths: number
  kdRatio: number
  classes: Record<string, Array<{ nick: string; familia: string }>>
}

export function ComparePage() {
  const [selectedRecord, setSelectedRecord] = useState<string>("")
  const [guildA, setGuildA] = useState<string>("")
  const [guildB, setGuildB] = useState<string>("")
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false)
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

  // Get available guilds from selected record
  const availableGuilds = useMemo(() => {
    if (!selectedRecord) return []
    const record = historyData.find((r) => r.id === selectedRecord)
    if (!record) return []
    
    // Extrair guildas dos dados do Supabase ou mock
    if (record.guilds) {
      return record.guilds
    } else if (record.guild) {
      return [record.guild]
    }
    return []
  }, [selectedRecord, historyData])

  // Get comparison data
  const comparisonData = useMemo(() => {
    if (!selectedRecord || !guildA || !guildB) return null

    const record = historyData.find((r) => r.id === selectedRecord)
    if (!record) return null

    const classesByGuild = record.classes_by_guild || record.processedData?.classesByGuild
    if (!classesByGuild) return null

    return {
      guildA: classesByGuild[guildA] || {},
      guildB: classesByGuild[guildB] || {},
    }
  }, [selectedRecord, guildA, guildB, historyData])

  // Calculate guild statistics
  const guildStats = useMemo(() => {
    if (!comparisonData) return null

    const calculateStats = (guildName: string, classes: Record<string, Array<{ nick: string; familia: string }>>): GuildComparisonStats => {
      const totalPlayers = Object.values(classes).reduce((sum, players) => sum + players.length, 0)
      
      // Buscar dados de kills e deaths do record
      const record = historyData.find((r) => r.id === selectedRecord)
      const killsByGuild = record?.kills_by_guild || record?.processedData?.killsByGuild || {}
      const deathsByGuild = record?.deaths_by_guild || record?.processedData?.deathsByGuild || {}
      
      const totalKills = killsByGuild[guildName] || 0
      const totalDeaths = deathsByGuild[guildName] || 0
      const kdRatio = totalDeaths > 0 ? totalKills / totalDeaths : totalKills

      return {
        guild: guildName,
        totalPlayers,
        totalKills,
        totalDeaths,
        kdRatio,
        classes,
      }
    }

    return {
      guildA: calculateStats(guildA, comparisonData.guildA),
      guildB: calculateStats(guildB, comparisonData.guildB),
    }
  }, [comparisonData, guildA, guildB, historyData, selectedRecord])

  // Get all classes for comparison
  const allClasses = useMemo(() => {
    if (!comparisonData) return []
    
    const classesA = Object.keys(comparisonData.guildA)
    const classesB = Object.keys(comparisonData.guildB)
    const allClassesSet = new Set([...classesA, ...classesB])
    
    return Array.from(allClassesSet).sort()
  }, [comparisonData])

  // Filter classes based on showOnlyDifferences
  const filteredClasses = useMemo(() => {
    if (!showOnlyDifferences || !comparisonData) return allClasses

    return allClasses.filter((classe) => {
      const countA = comparisonData.guildA[classe]?.length || 0
      const countB = comparisonData.guildB[classe]?.length || 0
      return countA !== countB
    })
  }, [allClasses, showOnlyDifferences, comparisonData])

  const copyComparisonLink = () => {
    const params = new URLSearchParams()
    if (selectedRecord) params.set("r", selectedRecord)
    if (guildA) params.set("a", guildA)
    if (guildB) params.set("b", guildB)
    if (showOnlyDifferences) params.set("d", "1")

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    navigator.clipboard.writeText(url)

    // Show toast or feedback
    alert("Link copiado para a área de transferência!")
  }

  const canCompare = selectedRecord && guildA && guildB && guildA !== guildB

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
        <h1 className="text-3xl font-bold text-neutral-100 mb-2">Comparar Guildas</h1>
        <p className="text-neutral-400">Compare composições e estatísticas entre guildas</p>
      </div>

      {error && (
        <div className="bg-yellow-950/50 border border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">{error}</p>
        </div>
      )}

      {/* Record Selection */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Seleção de Registro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Registro:</label>
            <Select value={selectedRecord} onValueChange={setSelectedRecord}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700">
                <SelectValue placeholder="Selecione um registro para comparar" />
              </SelectTrigger>
              <SelectContent>
                {historyData.map((record) => {
                  const guilds = record.guilds || [record.guild]
                  const territorios = record.territorio ? [record.territorio] : []
                  const nodes = record.node ? [record.node] : []
                  
                  return (
                    <SelectItem key={record.id} value={record.id}>
                      <div className="flex flex-col">
                        <span>{record.arquivo_nome || record.filename}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-neutral-400">
                            {guilds.length} guilda(s) • {record.total_geral || record.totalGeral} jogadores
                          </span>
                          {territorios.length > 0 && (
                            <Badge variant="outline" className="border-blue-700 text-blue-300 text-xs">
                              <MapIcon className="h-3 w-3 mr-1" />
                              {territorios[0]}
                            </Badge>
                          )}
                          {nodes.length > 0 && (
                            <Badge variant="outline" className="border-green-700 text-green-300 text-xs">
                              <FlagIcon className="h-3 w-3 mr-1" />
                              {nodes[0]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedRecord && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Guilda A:</label>
                <Select value={guildA} onValueChange={setGuildA}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700">
                    <SelectValue placeholder="Selecione a primeira guilda" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuilds.map((guild: string) => (
                      <SelectItem key={guild} value={guild}>
                        {guild}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Guilda B:</label>
                <Select value={guildB} onValueChange={setGuildB}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700">
                    <SelectValue placeholder="Selecione a segunda guilda" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuilds.map((guild: string) => (
                      <SelectItem key={guild} value={guild}>
                        {guild}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guild Statistics Comparison */}
      {guildStats && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-neutral-100 flex items-center">
              <TrendingUpIcon className="h-5 w-5 mr-2" />
              Estatísticas das Guildas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Guild A Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-100 text-center">{guildStats.guildA.guild}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatsCard
                    title="Total Players"
                    value={guildStats.guildA.totalPlayers}
                    icon={UsersIcon}
                    variant="info"
                  />
                  <StatsCard
                    title="Total Kills"
                    value={guildStats.guildA.totalKills}
                    icon={SwordIcon}
                    variant="success"
                  />
                  <StatsCard
                    title="Total Deaths"
                    value={guildStats.guildA.totalDeaths}
                    icon={SkullIcon}
                    variant="danger"
                  />
                  <StatsCard
                    title="KD Ratio"
                    value={guildStats.guildA.kdRatio.toFixed(2)}
                    icon={TargetIcon}
                    variant={guildStats.guildA.kdRatio >= 1 ? "success" : "danger"}
                  />
                </div>
              </div>

              {/* Guild B Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-100 text-center">{guildStats.guildB.guild}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatsCard
                    title="Total Players"
                    value={guildStats.guildB.totalPlayers}
                    icon={UsersIcon}
                    variant="info"
                  />
                  <StatsCard
                    title="Total Kills"
                    value={guildStats.guildB.totalKills}
                    icon={SwordIcon}
                    variant="success"
                  />
                  <StatsCard
                    title="Total Deaths"
                    value={guildStats.guildB.totalDeaths}
                    icon={SkullIcon}
                    variant="danger"
                  />
                  <StatsCard
                    title="KD Ratio"
                    value={guildStats.guildB.kdRatio.toFixed(2)}
                    icon={TargetIcon}
                    variant={guildStats.guildB.kdRatio >= 1 ? "success" : "danger"}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Controls */}
      {canCompare && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-neutral-100">Controles de Comparação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-differences"
                checked={showOnlyDifferences}
                onCheckedChange={(checked) => setShowOnlyDifferences(checked as boolean)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label htmlFor="show-differences" className="text-sm text-neutral-200">
                Mostrar apenas diferenças
              </label>
            </div>

            <Button onClick={copyComparisonLink} className="bg-blue-600 hover:bg-blue-700">
              <CopyIcon className="h-4 w-4 mr-2" />
              Copiar link
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {canCompare && comparisonData && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-neutral-100">
              Resultados da Comparação
              {showOnlyDifferences && (
                <Badge variant="outline" className="ml-2 border-blue-700 text-blue-300">
                  Apenas diferenças
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredClasses.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircleIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-400">
                  {showOnlyDifferences
                    ? "Nenhuma diferença encontrada entre as guildas selecionadas."
                    : "Nenhuma classe encontrada para comparação."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredClasses.map((classe) => {
                  const playersA = comparisonData.guildA[classe] || []
                  const playersB = comparisonData.guildB[classe] || []
                  const countA = playersA.length
                  const countB = playersB.length
                  const hasDifference = countA !== countB

                  return (
                    <div
                      key={classe}
                      className={`border rounded-lg p-4 transition-colors ${
                        hasDifference
                          ? "border-yellow-600 bg-yellow-950/20"
                          : "border-neutral-700 bg-neutral-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-neutral-100">{classe}</h3>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{countA}</div>
                            <div className="text-sm text-neutral-400">{guildA}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{countB}</div>
                            <div className="text-sm text-neutral-400">{guildB}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Guild A Players */}
                        <div>
                          <h4 className="text-sm font-medium text-neutral-300 mb-2">{guildA}</h4>
                          <div className="space-y-2">
                                                         {playersA.length > 0 ? (
                               playersA.map((player: { nick: string; familia: string }, index: number) => (
                                 <div
                                   key={index}
                                   className="text-sm text-neutral-300 bg-neutral-700 rounded p-2"
                                 >
                                   <span className="font-medium">{player.nick}</span>
                                   <span className="text-neutral-500 ml-2">({player.familia})</span>
                                 </div>
                               ))
                             ) : (
                               <p className="text-sm text-neutral-500 italic">Nenhum jogador</p>
                             )}
                          </div>
                        </div>

                        {/* Guild B Players */}
                        <div>
                          <h4 className="text-sm font-medium text-neutral-300 mb-2">{guildB}</h4>
                          <div className="space-y-2">
                                                         {playersB.length > 0 ? (
                               playersB.map((player: { nick: string; familia: string }, index: number) => (
                                 <div
                                   key={index}
                                   className="text-sm text-neutral-300 bg-neutral-700 rounded p-2"
                                 >
                                   <span className="font-medium">{player.nick}</span>
                                   <span className="text-neutral-500 ml-2">({player.familia})</span>
                                 </div>
                               ))
                             ) : (
                               <p className="text-sm text-neutral-500 italic">Nenhum jogador</p>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!canCompare && selectedRecord && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardContent className="p-8 text-center">
            <AlertCircleIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-400">
              Selecione duas guildas diferentes para começar a comparação.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
