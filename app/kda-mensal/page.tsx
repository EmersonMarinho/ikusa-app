"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  UsersIcon, 
  SwordIcon, 
  SkullIcon, 
  RefreshCwIcon,
  TrendingUpIcon,
  ShieldIcon,
  HomeIcon,
  BuildingIcon
} from "lucide-react"
import { FamilyCard } from "@/components/shared/family-card"

interface AllianceMember {
  familia: string
  guilda: string
  isMestre: boolean
  lastSeen: Date
}

interface FamilyData {
  familia: string
  classes: Array<{
    nick: string
    classe: string
    lastSeen: Date
  }>
}

// Interface para dados agrupados por família
interface FamilyGroupedData {
  familia: string
  guilda: string
  classes: Array<{
    classe: string
    kills: number
    deaths: number
    kills_vs_chernobyl: number
    deaths_vs_chernobyl: number
    kills_vs_others: number
    deaths_vs_others: number
    last_played: string
  }>
  total_kills: number
  total_deaths: number
  total_kills_vs_chernobyl: number
  total_deaths_vs_chernobyl: number
  total_kills_vs_others: number
  total_deaths_vs_others: number
  kd_overall: number
  kd_vs_chernobyl: number
  kd_vs_others: number
}

// Removido: interface KDAStats e recursos associados

interface MonthlyKDAData {
  id: string
  month_year: string
  player_nick: string
  player_familia: string
  guilda: string
  classes_played: Array<{
    classe: string
    kills: number
    deaths: number
    kills_vs_chernobyl: number
    deaths_vs_chernobyl: number
    kills_vs_others: number
    deaths_vs_others: number
    last_played: string
  }>
  total_kills: number
  total_deaths: number
  total_kills_vs_chernobyl: number
  total_deaths_vs_chernobyl: number
  total_kills_vs_others: number
  total_deaths_vs_others: number
  kd_overall: number
  kd_vs_chernobyl: number
  kd_vs_others: number
  logs_processed: string[]
  last_log_processed_at: string
}

interface MonthCard {
  month_year: string
  total_players: number
  total_logs: number
  total_kills: number
  is_current: boolean
}

export default function KDAMensalPage() {
  const [allianceMembers, setAllianceMembers] = useState<AllianceMember[]>([])
  const [familyData, setFamilyData] = useState<FamilyData[]>([])
  // Removido: cálculo manual de K/D via log de combate
  const [monthlyKDAData, setMonthlyKDAData] = useState<MonthlyKDAData[]>([])
  const [monthCards, setMonthCards] = useState<MonthCard[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  // Removido: input de log de combate manual
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Dados agrupados por família
  const [familyGroupedData, setFamilyGroupedData] = useState<FamilyGroupedData[]>([])
  
  // Filtros
  const [filters, setFilters] = useState({
    guilda: 'all',
    metric: 'overall' as 'overall' | 'vs_chernobyl' | 'vs_others',
    familyName: '',
  })

  // Ranking por classe
  const [classFilter, setClassFilter] = useState<string>('all')
  const [topN, setTopN] = useState<number>(10)
  // Filtro de classe na tabela principal
  const [tableClass, setTableClass] = useState<string>('all')

  // Carrega membros da aliança
  const loadAllianceMembers = async () => {
    try {
      const response = await fetch('/api/alliance-cache')
      const data = await response.json()
      
      if (data.success) {
        setAllianceMembers(data.members)
        setLastUpdate(new Date(data.lastUpdate))
      }
    } catch (error) {
      console.error('Erro ao carregar membros da aliança:', error)
    }
  }

  // Força atualização do cache
  const updateAllianceCache = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/alliance-cache', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setAllianceMembers(data.members)
        setLastUpdate(new Date())
        alert('Cache da aliança atualizado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao atualizar cache:', error)
      alert('Erro ao atualizar cache da aliança')
    } finally {
      setIsLoading(false)
    }
  }

  // Carrega dados das famílias
  const loadFamilyData = async () => {
    if (allianceMembers.length === 0) return
    
    try {
      const familias = allianceMembers.map(m => m.familia).join(',')
      const response = await fetch(`/api/family-tracking?familias=${familias}`)
      const data = await response.json()
      
      if (data.success) {
        setFamilyData(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados das famílias:', error)
    }
  }

  // Carrega dados mensais do banco
  const loadMonthlyKDAData = async (month?: string) => {
    const targetMonth = month || selectedMonth
    setIsLoading(true)
    
    try {
      // Força recarregamento sem cache na Vercel
      const response = await fetch(`/api/process-monthly-kda?month=${targetMonth}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setMonthlyKDAData(data.players)
        setLastUpdate(new Date())
        console.log(`✅ KDA mensal carregado: ${data.players.length} jogadores`)
        
        // Agrupa dados por família
        groupDataByFamily(data.players)
      } else {
        console.error('Erro ao carregar KDA mensal:', data.message)
        setMonthlyKDAData([])
        setFamilyGroupedData([])
        // Mostra erro mais amigável
        if (data.message?.includes('Nenhum log encontrado')) {
          setError('Nenhum log encontrado para este mês. Processe alguns logs primeiro.')
        } else {
          setError(`Erro ao carregar dados: ${data.message}`)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar KDA mensal:', error)
      setMonthlyKDAData([])
      setFamilyGroupedData([])
      setError(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Função para agrupar dados por família
  const groupDataByFamily = (players: MonthlyKDAData[]) => {
    const familyMap = new Map<string, FamilyGroupedData>()
    
    for (const player of players) {
      const familia = player.player_familia
      
      if (!familyMap.has(familia)) {
        familyMap.set(familia, {
          familia,
          guilda: player.guilda,
          classes: [],
          total_kills: 0,
          total_deaths: 0,
          total_kills_vs_chernobyl: 0,
          total_deaths_vs_chernobyl: 0,
          total_kills_vs_others: 0,
          total_deaths_vs_others: 0,
          kd_overall: 0,
          kd_vs_chernobyl: 0,
          kd_vs_others: 0
        })
      }
      
      const familyData = familyMap.get(familia)!
      
      // Adiciona classes do jogador
      for (const classData of player.classes_played) {
        const existingClass = familyData.classes.find(c => c.classe === classData.classe)
        if (existingClass) {
          // Soma estatísticas se a classe já existe
          existingClass.kills += classData.kills
          existingClass.deaths += classData.deaths
          existingClass.kills_vs_chernobyl += classData.kills_vs_chernobyl
          existingClass.deaths_vs_chernobyl += classData.deaths_vs_chernobyl
          existingClass.kills_vs_others += classData.kills_vs_others
          existingClass.deaths_vs_others += classData.deaths_vs_others
          existingClass.last_played = new Date(Math.max(
            new Date(existingClass.last_played).getTime(),
            new Date(classData.last_played).getTime()
          )).toISOString()
        } else {
          // Adiciona nova classe
          familyData.classes.push({
            classe: classData.classe,
            kills: classData.kills,
            deaths: classData.deaths,
            kills_vs_chernobyl: classData.kills_vs_chernobyl,
            deaths_vs_chernobyl: classData.deaths_vs_chernobyl,
            kills_vs_others: classData.kills_vs_others,
            deaths_vs_others: classData.deaths_vs_others,
            last_played: classData.last_played
          })
        }
      }
      
      // Soma totais
      familyData.total_kills += player.total_kills
      familyData.total_deaths += player.total_deaths
      familyData.total_kills_vs_chernobyl += player.total_kills_vs_chernobyl
      familyData.total_deaths_vs_chernobyl += player.total_deaths_vs_chernobyl
      familyData.total_kills_vs_others += player.total_kills_vs_others
      familyData.total_deaths_vs_others += player.total_deaths_vs_others
    }
    
    // Calcula K/D ratios para cada família
    for (const familyData of familyMap.values()) {
      familyData.kd_overall = familyData.total_deaths > 0 
        ? familyData.total_kills / familyData.total_deaths 
        : (familyData.total_kills > 0 ? Infinity : 0)
        
      familyData.kd_vs_chernobyl = familyData.total_deaths_vs_chernobyl > 0 
        ? familyData.total_kills_vs_chernobyl / familyData.total_deaths_vs_chernobyl 
        : (familyData.total_kills_vs_chernobyl > 0 ? Infinity : 0)
        
      familyData.kd_vs_others = familyData.total_deaths_vs_others > 0 
        ? familyData.total_kills_vs_others / familyData.total_deaths_vs_others 
        : (familyData.total_kills_vs_others > 0 ? Infinity : 0)
    }
    
    // Converte para array e ordena por K/D geral
    const sortedFamilies = Array.from(familyMap.values()).sort((a, b) => {
      if (!isFinite(b.kd_overall) && isFinite(a.kd_overall)) return 1
      if (!isFinite(a.kd_overall) && isFinite(b.kd_overall)) return -1
      if (b.kd_overall === a.kd_overall) return b.total_kills - a.total_kills
      return b.kd_overall - a.kd_overall
    })
    
    setFamilyGroupedData(sortedFamilies)
  }

  // Processa logs mensais e salva no banco
  const processMonthlyKDA = async () => {
    setIsLoading(true)
    setError(null) // Limpa erros anteriores
    
    try {
      const response = await fetch('/api/process-monthly-kda', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          monthYear: selectedMonth,
          forceReprocess: true,
          cleanInactivePlayers: true // Remove jogadores que não são mais da aliança
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        let message = `✅ KDA processado! ${data.total_logs_processed} logs, ${data.total_players_processed} jogadores`
        if (data.removed_inactive_players > 0) {
          message += `\n🗑️ ${data.removed_inactive_players} jogadores inativos removidos`
        }
        alert(message)
        
        // Recarrega dados atualizados
        await loadMonthlyKDAData()
      } else {
        alert(`❌ Erro: ${data.message}`)
        setError(data.message)
      }
    } catch (error) {
      console.error('Erro ao processar KDA mensal:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert(`❌ Erro ao processar KDA mensal: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // setupKDATables removido: dependia de service role

  // Carrega dados iniciais
  useEffect(() => {
    loadAllianceMembers()
    loadMonthlyKDAData() // Carrega dados mensais do banco
  }, [])

  useEffect(() => {
    if (allianceMembers.length > 0) {
      loadFamilyData()
    }
  }, [allianceMembers])

  useEffect(() => {
    loadMonthlyKDAData(selectedMonth)
  }, [selectedMonth])

  // Estatísticas da aliança
  const allianceStats = {
    total: allianceMembers.length,
    byGuild: allianceMembers.reduce((acc, member) => {
      acc[member.guilda] = (acc[member.guilda] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    mestres: allianceMembers.filter(m => m.isMestre).length
  }

  // Removido: filteredKDA (não usamos mais cálculos manuais por log)

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-100 mb-2">KDA Mensal da Aliança Lollipop</h1>
        <p className="text-neutral-400">Dashboard completo de performance da aliança</p>
      </div>

      {/* Status da Aliança */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Total da Aliança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neutral-100">{allianceStats.total}</div>
            <p className="text-xs text-neutral-500">membros ativos</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Manifest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{allianceStats.byGuild.Manifest || 0}</div>
            <p className="text-xs text-neutral-500">membros</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Allyance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{allianceStats.byGuild.Allyance || 0}</div>
            <p className="text-xs text-neutral-500">membros</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Grand_Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{allianceStats.byGuild.Grand_Order || 0}</div>
            <p className="text-xs text-neutral-500">membros</p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas das Famílias */}
      {familyGroupedData.length > 0 && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-neutral-100 text-lg flex items-center gap-2">
              <BuildingIcon className="h-4 w-4 text-blue-400" />
              Estatísticas das Famílias
            </CardTitle>
            <CardDescription className="text-sm">
              Resumo das {familyGroupedData.length} famílias ativas com dados de KDA
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="text-center p-3 bg-neutral-800 rounded border border-neutral-700">
                <div className="text-lg font-bold text-green-400">
                  {familyGroupedData.reduce((sum, f) => sum + f.total_kills, 0).toLocaleString()}
                </div>
                <div className="text-xs text-neutral-400">Total de Kills</div>
              </div>
              <div className="text-center p-3 bg-neutral-800 rounded border border-neutral-700">
                <div className="text-lg font-bold text-red-400">
                  {familyGroupedData.reduce((sum, f) => sum + f.total_deaths, 0).toLocaleString()}
                </div>
                <div className="text-xs text-neutral-400">Total de Deaths</div>
              </div>
              <div className="text-center p-3 bg-neutral-800 rounded border border-neutral-700">
                <div className="text-lg font-bold text-blue-400">
                  {familyGroupedData.reduce((sum, f) => sum + f.classes.length, 0)}
                </div>
                <div className="text-xs text-neutral-400">Total de Classes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center">
            <RefreshCwIcon className="h-5 w-5 mr-2" />
            Controles da Aliança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={updateAllianceCache}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCwIcon className="h-4 w-4 mr-2" />
              )}
              Atualizar Cache
            </Button>
            
            {/* Botão de setup removido (dependia de service role) */}
            
            <Button
              onClick={processMonthlyKDA}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <SwordIcon className="h-4 w-4 mr-2" />
              Processar KDA Mensal
            </Button>
            
            <Button
              onClick={async () => {
                if (confirm('🧹 Limpar jogadores que não são mais da aliança?\n\nIsso removerá jogadores que não estão mais ativos nas guildas Manifest, Allyance e Grand_Order.')) {
                  setIsLoading(true)
                  try {
                    const response = await fetch('/api/process-monthly-kda', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        monthYear: selectedMonth,
                        forceReprocess: false,
                        cleanInactivePlayers: true
                      })
                    })
                    
                    const data = await response.json()
                    if (data.success) {
                      alert(`🧹 Limpeza concluída!\n\n${data.removed_inactive_players || 0} jogadores inativos removidos`)
                      await loadMonthlyKDAData() // Recarrega dados
                    }
                  } catch (error) {
                    console.error('Erro na limpeza:', error)
                    alert('❌ Erro na limpeza')
                  } finally {
                    setIsLoading(false)
                  }
                }
              }}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <SkullIcon className="h-4 w-4 mr-2" />
              Limpar Jogadores Inativos
            </Button>
            
            <div className="flex items-center">
              <Label htmlFor="month-select" className="mr-2 text-sm text-neutral-300">Mês:</Label>
              <input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-200 text-sm"
              />
            </div>
          </div>
          
          <div className="text-sm text-neutral-400">
            Última atualização: {lastUpdate ? lastUpdate.toLocaleString('pt-BR') : 'Nunca'}
          </div>
          {error && (
            <div className="text-red-400 text-sm mt-2">{error}</div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Log de Combate removida */}

      {/* Dados KDA Mensais */}
      {monthlyKDAData.length > 0 && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-neutral-100">KDA Mensal - {selectedMonth}</CardTitle>
            <CardDescription>
              {monthlyKDAData.length} jogadores da aliança com dados de combate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="players" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-neutral-800">
                <TabsTrigger value="players" className="data-[state=active]:bg-neutral-700">
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Por Jogador
                </TabsTrigger>
                <TabsTrigger value="families" className="data-[state=active]:bg-neutral-700">
                  <BuildingIcon className="h-4 w-4 mr-2" />
                  Por Família
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="players" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-700">
                        <th className="text-left p-2 text-neutral-300">Jogador</th>
                        <th className="text-left p-2 text-neutral-300">Família</th>
                        <th className="text-left p-2 text-neutral-300">Guilda</th>
                        <th className="text-center p-2 text-neutral-300">Classes</th>
                        <th className="text-center p-2 text-neutral-300">Kills</th>
                        <th className="text-center p-2 text-neutral-300">Deaths</th>
                        <th className="text-center p-2 text-neutral-300">K/D Geral</th>
                        <th className="text-center p-2 text-neutral-300">K/D vs Chernobyl</th>
                        <th className="text-center p-2 text-neutral-300">K/D vs Outros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyKDAData
                        .filter(player => {
                          if (tableClass !== 'all') {
                            const hasClass = player.classes_played.some(c => c.classe === tableClass)
                            if (!hasClass) return false
                          }
                          if (filters.guilda === 'Alliance') {
                            return ['Manifest', 'Allyance', 'Grand_Order'].includes(player.guilda)
                          }
                          if (filters.guilda !== 'all' && player.guilda !== filters.guilda) return false
                          return true
                        })
                        .sort((a, b) => {
                          const pick = (p: any) => filters.metric === 'overall' ? p.kd_overall : filters.metric === 'vs_chernobyl' ? p.kd_vs_chernobyl : p.kd_vs_others
                          const ka = pick(a)
                          const kb = pick(b)
                          if (ka === kb) return b.total_kills - a.total_kills
                          // Ordena Infinity no topo
                          if (!isFinite(kb) && isFinite(ka)) return 1
                          if (!isFinite(ka) && isFinite(kb)) return -1
                          return kb - ka
                        })
                        .map((player, index) => (
                        <tr key={index} className="border-b border-neutral-800 hover:bg-neutral-800">
                          <td className="p-2 text-neutral-200 font-medium">{player.player_nick}</td>
                          <td className="p-2 text-neutral-300">{player.player_familia}</td>
                          <td className="p-2">
                            <Badge variant="outline" className={
                              player.guilda === 'Manifest' ? 'border-blue-700 text-blue-300' :
                              player.guilda === 'Allyance' ? 'border-green-700 text-green-300' :
                              player.guilda === 'Grand_Order' ? 'border-purple-700 text-purple-300' :
                              'border-yellow-700 text-yellow-300'
                            }>
                              {player.guilda}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex flex-wrap gap-1">
                              {player.classes_played.slice(0, 3).map((cls, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {cls.classe}
                                </Badge>
                              ))}
                              {player.classes_played.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{player.classes_played.length - 3}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center text-green-400 font-medium">{player.total_kills}</td>
                          <td className="p-2 text-center text-red-400 font-medium">{player.total_deaths}</td>
                          <td className="p-2 text-center font-semibold">
                            <span className={player.kd_overall >= 1 ? 'text-green-400' : 'text-red-400'}>
                              {player.kd_overall === Infinity ? '∞' : player.kd_overall.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2 text-center font-semibold">
                            <span className={player.kd_vs_chernobyl >= 1 ? 'text-green-400' : 'text-red-400'}>
                              {player.kd_vs_chernobyl === Infinity ? '∞' : player.kd_vs_chernobyl.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2 text-center font-semibold">
                            <span className={player.kd_vs_others >= 1 ? 'text-green-400' : 'text-red-400'}>
                              {player.kd_vs_others === Infinity ? '∞' : player.kd_vs_others.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              
              <TabsContent value="families" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-neutral-400">
                      Visualização agrupada por família • {(() => {
                        const filteredFamilies = familyGroupedData.filter(family => {
                          if (filters.guilda !== 'all' && family.guilda !== filters.guilda) return false
                          if (filters.familyName && !family.familia.toLowerCase().includes(filters.familyName.toLowerCase())) return false
                          return true
                        })
                        return `${filteredFamilies.length} de ${familyGroupedData.length} famílias`
                      })()} ativas
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Buscar por nome da família..."
                        className="w-64 bg-neutral-800 border-neutral-700 text-neutral-200"
                        value={filters.familyName || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, familyName: e.target.value }))}
                      />
                      <Select
                        value={filters.guilda}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, guilda: value }))}
                      >
                        <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
                          <SelectValue placeholder="Filtrar por guilda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Guildas</SelectItem>
                          <SelectItem value="Manifest">Manifest</SelectItem>
                          <SelectItem value="Allyance">Allyance</SelectItem>
                          <SelectItem value="Grand_Order">Grand_Order</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {familyGroupedData.length > 0 ? (
                                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {familyGroupedData
                         .filter(family => {
                           // Filtro por guilda
                           if (filters.guilda !== 'all' && family.guilda !== filters.guilda) return false
                           
                           // Filtro por nome da família
                           if (filters.familyName && !family.familia.toLowerCase().includes(filters.familyName.toLowerCase())) return false
                           
                           return true
                         })
                         .map((family, index) => (
                          <FamilyCard
                            key={`${family.familia}-${index}`}
                            familia={family.familia}
                            guilda={family.guilda}
                            classes={family.classes}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-neutral-400">
                      Nenhuma família encontrada com dados de KDA
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Detalhes por Classe */}
      {monthlyKDAData.length > 0 && (
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-neutral-100">Detalhes por Classe - {selectedMonth}</CardTitle>
                <CardDescription>
                  Performance individual por classe de cada jogador
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <Label>Classe</Label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-48 bg-neutral-800 border-neutral-700 text-neutral-200">
                      <SelectValue placeholder="Selecione a classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {Array.from(new Set(
                        monthlyKDAData.flatMap(p => p.classes_played.map(c => c.classe))
                      ))
                        .sort((a, b) => a.localeCompare(b, 'pt'))
                        .map((cls) => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Top N</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={topN}
                    onChange={(e) => setTopN(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                    className="w-24 bg-neutral-800 border-neutral-700 text-neutral-200"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              // Monta ranking por classe (por métrica selecionada)
              const metric = filters.metric
              const rows: Array<{ nick: string; familia: string; guilda: string; classe: string; kills: number; deaths: number; kd: number }>
                = []

              for (const p of monthlyKDAData) {
                for (const c of p.classes_played) {
                  if (classFilter !== 'all' && c.classe !== classFilter) continue
                  const kd = metric === 'overall'
                    ? (c.deaths > 0 ? c.kills / c.deaths : (c.kills > 0 ? Infinity : 0))
                    : metric === 'vs_chernobyl'
                      ? (c.deaths_vs_chernobyl > 0 ? c.kills_vs_chernobyl / c.deaths_vs_chernobyl : (c.kills_vs_chernobyl > 0 ? Infinity : 0))
                      : (c.deaths_vs_others > 0 ? c.kills_vs_others / c.deaths_vs_others : (c.kills_vs_others > 0 ? Infinity : 0))
                  rows.push({ nick: p.player_nick, familia: p.player_familia, guilda: p.guilda, classe: c.classe, kills: c.kills, deaths: c.deaths, kd })
                }
              }

              rows.sort((a, b) => {
                if (!isFinite(b.kd) && isFinite(a.kd)) return 1
                if (!isFinite(a.kd) && isFinite(b.kd)) return -1
                if (b.kd === a.kd) return b.kills - a.kills
                return b.kd - a.kd
              })

              const topRows = rows.slice(0, topN)

              return (
                <div className="space-y-3">
                  <div className="text-sm text-neutral-400">Ranking por classe • Métrica: {metric === 'overall' ? 'K/D Geral' : metric === 'vs_chernobyl' ? 'K/D vs Chernobyl' : 'K/D vs Outros'}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {topRows.map((row, i) => (
                      <div key={`${row.nick}-${row.classe}-${i}`} className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-neutral-200">{row.nick}</div>
                          <Badge variant="outline" className={
                            row.guilda === 'Manifest' ? 'border-blue-700 text-blue-300' :
                            row.guilda === 'Allyance' ? 'border-green-700 text-green-300' :
                            row.guilda === 'Grand_Order' ? 'border-purple-700 text-purple-300' :
                            'border-yellow-700 text-yellow-300'
                          }>
                            {row.guilda}
                          </Badge>
                        </div>
                        <div className="text-xs text-neutral-400 mb-2">{row.familia} • {row.classe}</div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-400">K: {row.kills}</span>
                          <span className="text-red-400">D: {row.deaths}</span>
                          <span className={`font-semibold ${
                            row.kd >= 1 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            K/D: {row.kd === Infinity ? '∞' : row.kd.toFixed(2)}
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
      )}

      {/* Membros da Aliança */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">Membros da Aliança</CardTitle>
          <CardDescription>
            Lista completa de membros ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Label>Filtrar:</Label>
            <Select
              value={filters.guilda}
              onValueChange={(value) => setFilters(prev => ({ ...prev, guilda: value }))}
            >
              <SelectTrigger className="w-52 bg-neutral-800 border-neutral-700 text-neutral-200">
                <SelectValue placeholder="Selecione a guilda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Manifest">Manifest</SelectItem>
                <SelectItem value="Allyance">Allyance</SelectItem>
                <SelectItem value="Grand_Order">Grand_Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Accordion type="multiple" className="w-full">
            {(['Manifest', 'Allyance', 'Grand_Order'] as const)
              .filter(g => filters.guilda === 'all' ? true : g === filters.guilda)
              .map(guildName => (
              <AccordionItem key={guildName} value={guildName}>
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      <span className="text-neutral-200 font-semibold">{guildName}</span>
                    </div>
                    <Badge variant="outline">
                      {allianceMembers.filter(m => m.guilda === guildName).length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {allianceMembers
                      .filter(member => member.guilda === guildName)
                      .sort((a, b) => a.familia.localeCompare(b.familia))
                      .map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-neutral-800 rounded-lg border border-neutral-700">
                          <span className="text-neutral-200 truncate">{member.familia}</span>
                          {member.isMestre && (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-700">Mestre</Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
