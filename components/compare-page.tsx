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
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"
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
  CheckIcon,
} from "lucide-react"
import * as SelectPrimitive from "@radix-ui/react-select"

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
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [metric, setMetric] = useState<'overall' | 'vs_chernobyl' | 'vs_others'>("overall")

  // Ordenação das classes
  type ClassSortKey = 'classe' | 'A' | 'B' | 'diff'
  const [classSortKey, setClassSortKey] = useState<ClassSortKey>('diff')
  const [classSortDir, setClassSortDir] = useState<'asc' | 'desc'>('desc')
  const toggleClassSort = (key: ClassSortKey) => {
    if (key === classSortKey) {
      setClassSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setClassSortKey(key)
      setClassSortDir(key === 'classe' ? 'asc' : 'desc')
    }
  }

  // Load real data from Supabase
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const data = await getRealHistory()
        setHistoryData(data)
        setError(null)
        // Define mês padrão para o mais recente
        const dates = (data || []).map((r: any) => new Date(r.created_at || r.date || Date.now()))
        if (dates.length > 0) {
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
          const monthStr = maxDate.toISOString().slice(0,7)
          setSelectedMonth(prev => prev || monthStr)
        }
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

  // Filtra histórico por mês selecionado
  const filteredHistoryByMonth = useMemo(() => {
    if (!selectedMonth) return historyData
    return (historyData || []).filter((r: any) => {
      const d = new Date(r.created_at || r.date || Date.now()).toISOString().slice(0,7)
      return d === selectedMonth
    })
  }, [historyData, selectedMonth])

  // Get available guilds from selected record
  const availableGuilds = useMemo(() => {
    if (!selectedRecord) return []
    const record = filteredHistoryByMonth.find((r) => r.id === selectedRecord)
    if (!record) return []
    
    // Extrair guildas dos dados do Supabase ou mock
    if (record.guilds) {
      return record.guilds
    } else if (record.guild) {
      return [record.guild]
    }
    return []
  }, [selectedRecord, filteredHistoryByMonth])

  // Get comparison data
  const comparisonData = useMemo(() => {
    if (!selectedRecord || !guildA || !guildB) return null

    const record = filteredHistoryByMonth.find((r) => r.id === selectedRecord)
    if (!record) return null

    const classesByGuild = record.classes_by_guild || record.processedData?.classesByGuild
    if (!classesByGuild) return null

    return {
      guildA: classesByGuild[guildA] || {},
      guildB: classesByGuild[guildB] || {},
    }
  }, [selectedRecord, guildA, guildB, filteredHistoryByMonth])

  // Calculate guild statistics
  const guildStats = useMemo(() => {
    if (!comparisonData) return null

    const calculateStats = (guildName: string, classes: Record<string, Array<{ nick: string; familia: string }>>): GuildComparisonStats => {
      const totalPlayers = Object.values(classes).reduce((sum, players) => sum + players.length, 0)
      
      // Buscar dados de kills e deaths do record
      const record = filteredHistoryByMonth.find((r) => r.id === selectedRecord)
      const killsByGuild = record?.kills_by_guild || record?.processedData?.killsByGuild || {}
      const deathsByGuild = record?.deaths_by_guild || record?.processedData?.deathsByGuild || {}
      const killsMatrix = record?.kills_matrix || record?.processedData?.killsMatrix || {}

      let totalKills = 0
      let totalDeaths = 0
      if (metric === 'overall') {
        totalKills = killsByGuild[guildName] || 0
        totalDeaths = deathsByGuild[guildName] || 0
      } else if (metric === 'vs_chernobyl') {
        const target = 'Chernobyl'
        totalKills = killsMatrix[guildName]?.[target] || 0
        totalDeaths = killsMatrix[target]?.[guildName] || 0
      } else {
        // vs_others: soma contra todas as outras exceto Chernobyl e a própria
        const allGuilds = Object.keys(killsByGuild || {})
        const others = allGuilds.filter(g => g !== guildName && g !== 'Chernobyl')
        totalKills = others.reduce((sum, g) => sum + (killsMatrix[guildName]?.[g] || 0), 0)
        totalDeaths = others.reduce((sum, g) => sum + (killsMatrix[g]?.[guildName] || 0), 0)
      }
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
  }, [comparisonData, guildA, guildB, filteredHistoryByMonth, selectedRecord, metric])

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Mês:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-200 text-sm w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Métrica:</label>
              <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700">
                  <SelectValue placeholder="Selecione a métrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">K/D Geral</SelectItem>
                  <SelectItem value="vs_chernobyl">K/D vs Chernobyl</SelectItem>
                  <SelectItem value="vs_others">K/D vs Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Registro:</label>
            <Select value={selectedRecord} onValueChange={setSelectedRecord}>
              <SelectTrigger className="bg-neutral-800 border-neutral-700">
                <SelectValue placeholder="Selecione um registro para comparar" />
              </SelectTrigger>
              <SelectContent>
                {filteredHistoryByMonth.map((record) => {
                  const guilds = record.guilds || [record.guild]
                  const territorio = record.territorio
                  const node = record.node
                  const fileLabel = (record.arquivo_nome || record.filename || String(record.id))
                  return (
                    <SelectPrimitive.Item
                      key={record.id}
                      value={record.id}
                      textValue={fileLabel}
                      className="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <span className="absolute right-2 flex size-3.5 items-center justify-center">
                        <SelectPrimitive.ItemIndicator>
                          <CheckIcon className="h-4 w-4" />
                        </SelectPrimitive.ItemIndicator>
                      </span>
                      <div className="flex flex-col">
                        <SelectPrimitive.ItemText>{fileLabel}</SelectPrimitive.ItemText>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-neutral-400">
                            {guilds.length} guilda(s) • {record.total_geral || record.totalGeral} jogadores
                          </span>
                          {territorio && (
                            <span className="inline-flex items-center border border-blue-700 text-blue-300 text-xs rounded px-2 py-0.5">
                              <MapIcon className="h-3 w-3 mr-1" />
                              {territorio}
                            </span>
                          )}
                          {node && (
                            <span className="inline-flex items-center border border-green-700 text-green-300 text-xs rounded px-2 py-0.5">
                              <FlagIcon className="h-3 w-3 mr-1" />
                              {node}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectPrimitive.Item>
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
              Estatísticas das Guildas ({metric === 'overall' ? 'K/D Geral' : metric === 'vs_chernobyl' ? 'K/D vs Chernobyl' : 'K/D vs Outros'})
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
            {/* Gráfico de composição por classe */}
            {comparisonData && (
              <div className="mt-8">
                <h3 className="text-neutral-100 font-semibold mb-3">Composição por Classe</h3>
                {(() => {
                  const data = Array.from(new Set([...Object.keys(comparisonData.guildA), ...Object.keys(comparisonData.guildB)])).sort().map((classe) => ({
                    classe,
                    A: (comparisonData.guildA[classe]?.length || 0),
                    B: (comparisonData.guildB[classe]?.length || 0),
                  }))
                  return (
                    <ChartContainer
                      config={{ A: { label: guildA, color: '#60a5fa' }, B: { label: guildB, color: '#34d399' } }}
                      className="w-full h-80"
                    >
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="classe" interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="A" fill="var(--color-A)" />
                        <Bar dataKey="B" fill="var(--color-B)" />
                      </BarChart>
                    </ChartContainer>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison Controls */}
      {canCompare && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-neutral-100">Controles de Comparação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-3">
                <Button onClick={copyComparisonLink} className="bg-blue-600 hover:bg-blue-700">
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Copiar link
                </Button>
                <Button onClick={() => {
              const headers = ['classe','countA','countB','diff','playersA','playersB']
              const lines = [headers.join(',')]
              const buildRows = () => {
                const rows = (filteredClasses || []).map((classe) => {
                  const playersA = (comparisonData?.guildA?.[classe] || []) as Array<{ nick: string; familia: string }>
                  const playersB = (comparisonData?.guildB?.[classe] || []) as Array<{ nick: string; familia: string }>
                  const A = playersA.length
                  const B = playersB.length
                  const diff = A - B
                  const pa = playersA.map((p) => `${p.nick}(${p.familia})`).join('; ')
                  const pb = playersB.map((p) => `${p.nick}(${p.familia})`).join('; ')
                  return { classe, A, B, diff, pa, pb }
                })
                return rows
              }
              const rows = buildRows()
              rows.forEach(r => lines.push([r.classe, r.A, r.B, r.diff, `"${r.pa}"`, `"${r.pb}"`].join(',')))
              const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `comparacao_classes_${guildA}_vs_${guildB}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }} className="bg-green-700 hover:bg-green-800">
                  Exportar CSV (classes)
                </Button>
              </div>
            </div>
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
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-neutral-400">Ordenar por:
                    <button className="ml-2 text-blue-400 hover:underline" onClick={() => toggleClassSort('classe')}>Classe {classSortKey==='classe' ? (classSortDir==='asc'?'↑':'↓') : ''}</button>
                    <button className="ml-3 text-blue-400 hover:underline" onClick={() => toggleClassSort('A')}>{guildA} {classSortKey==='A' ? (classSortDir==='asc'?'↑':'↓') : ''}</button>
                    <button className="ml-3 text-blue-400 hover:underline" onClick={() => toggleClassSort('B')}>{guildB} {classSortKey==='B' ? (classSortDir==='asc'?'↑':'↓') : ''}</button>
                    <button className="ml-3 text-blue-400 hover:underline" onClick={() => toggleClassSort('diff')}>Diferença {classSortKey==='diff' ? (classSortDir==='asc'?'↑':'↓') : ''}</button>
                  </div>
                </div>
                {(() => {
                  const rows = filteredClasses.map((classe) => {
                    const playersA = comparisonData.guildA[classe] || []
                    const playersB = comparisonData.guildB[classe] || []
                    const A = playersA.length
                    const B = playersB.length
                    return { classe, A, B, diff: A - B, playersA, playersB }
                  }).sort((a, b) => {
                    const av = (a as any)[classSortKey]
                    const bv = (b as any)[classSortKey]
                    if (classSortKey === 'classe') {
                      const cmp = String(av).localeCompare(String(bv), 'pt', { sensitivity: 'base' })
                      return classSortDir === 'asc' ? cmp : -cmp
                    }
                    const cmp = classSortDir === 'asc' ? (Number(av) - Number(bv)) : (Number(bv) - Number(av))
                    if (cmp !== 0) return cmp
                    return a.classe.localeCompare(b.classe, 'pt', { sensitivity: 'base' })
                  })
                  return rows.map((row) => {
                    const hasDifference = row.A !== row.B
                    return (
                      <div
                        key={row.classe}
                        className={`border rounded-lg p-4 transition-colors ${
                          hasDifference
                            ? "border-yellow-600 bg-yellow-950/20"
                            : "border-neutral-700 bg-neutral-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-neutral-100">{row.classe}</h3>
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-400">{row.A}</div>
                              <div className="text-sm text-neutral-400">{guildA}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-400">{row.B}</div>
                              <div className="text-sm text-neutral-400">{guildB}</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${row.diff>0? 'text-blue-300': row.diff<0? 'text-green-300':'text-neutral-300'}`}>{row.diff>0? `+${row.diff}`: row.diff}</div>
                              <div className="text-sm text-neutral-400">diferença</div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Guild A Players */}
                          <div>
                            <h4 className="text-sm font-medium text-neutral-300 mb-2">{guildA}</h4>
                            <div className="space-y-2">
                              {row.playersA.length > 0 ? (
                                row.playersA.map((player: { nick: string; familia: string }, index: number) => (
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
                              {row.playersB.length > 0 ? (
                                row.playersB.map((player: { nick: string; familia: string }, index: number) => (
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
                  })
                })()}
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
