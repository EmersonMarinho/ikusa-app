"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
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
  RefreshCw,
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
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const handleSortClick = (col: string, defaultDir: 'asc' | 'desc' = 'desc') => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(defaultDir)
    }
  }
  const renderSortIcon = (col: string) => sortCol === col ? (
    sortDir === 'asc' ? <ChevronUpIcon className="inline h-3 w-3 ml-1" /> : <ChevronDownIcon className="inline h-3 w-3 ml-1" />
  ) : null
  const [showKillStats, setShowKillStats] = useState<Record<string, boolean>>({})
  const [historyData, setHistoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllGuildStats, setShowAllGuildStats] = useState(false)
  const [showChernModal, setShowChernModal] = useState(false) // legacy (não usado com popover)
  const [chernSearch, setChernSearch] = useState("")
  const [chernClassFilter, setChernClassFilter] = useState<string>('all')
  const [chernSortBy, setChernSortBy] = useState<'presence' | 'kd' | 'name'>('presence')

  // Formata data em relativo (hoje, há 1 dia, há N dias)
  const formatRelativeDay = (dateInput: string): string => {
    try {
      let targetDate: Date
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [y, m, d] = dateInput.split('-').map((v) => parseInt(v, 10))
        targetDate = new Date(y, m - 1, d)
      } else {
        const parsed = new Date(dateInput)
        targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
      }
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
      const diffDays = Math.floor((startOfToday.getTime() - startOfTarget.getTime()) / 86400000)
      if (diffDays <= 0) return 'hoje'
      if (diffDays === 1) return 'há 1 dia'
      return `há ${diffDays} dias`
    } catch {
      return dateInput
    }
  }

  // Converte qualquer string de data para YYYY-MM-DD no fuso LOCAL
  const toLocalYMD = (dateInput: string): string => {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput
      const d = new Date(dateInput)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    } catch {
      return dateInput
    }
  }

  // Estados para GS Lollipop
  const [lollipopGearscore, setLollipopGearscore] = useState<any[]>([])
  const [gsLoading, setGsLoading] = useState(false)
  const [gsError, setGsError] = useState<string | null>(null)

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

  // Função para buscar gearscore dos players da Lollipop que participaram da node
  const fetchLollipopGearscore = async (nodeData: any) => {
    if (!nodeData) {
      console.error('❌ nodeData é null ou undefined')
      return
    }
    
    setGsLoading(true)
    setGsError(null)
    
    try {
      console.log('🔍 ===== INÍCIO DA BUSCA DE GS =====')
      console.log('🔍 nodeData completo:', nodeData)
      console.log('🔍 nodeData.classes:', nodeData.classes)
      console.log('🔍 Tipo de nodeData.classes:', typeof nodeData.classes)
      
      // Verifica se existe uma estrutura de guildas
      console.log('🔍 nodeData.guilds:', nodeData.guilds)
      console.log('🔍 nodeData.guild:', nodeData.guild)
      
      if (!nodeData.classes) {
        console.error('❌ nodeData.classes não existe')
        setGsError('Estrutura de dados inválida: classes não encontradas')
        setGsLoading(false)
        return
      }
      
      const classKeys = Object.keys(nodeData.classes)
      console.log('🔍 Chaves das classes encontradas:', classKeys)
      
      // 1. Extrai APENAS os players da Lollipop que participaram da node
      const lollipopParticipants: Array<{
        familia: string
        nick: string
        classe: string
        hasGearscore: boolean
        gearscoreData?: any
      }> = []
      
      // Verifica se a guilda Lollipop está presente nos dados
      const hasLollipop = nodeData.guilds && nodeData.guilds.includes('Lollipop') || 
                          nodeData.guild === 'Lollipop' ||
                          (nodeData.guilds && nodeData.guilds.some((g: string) => g.toLowerCase().includes('lollipop')))
      
      console.log('🔍 Guilda Lollipop presente na node:', hasLollipop)
      
      if (hasLollipop) {
        // Se a Lollipop participou da node, precisa verificar INDIVIDUALMENTE cada player
        // para confirmar se ele realmente é da Lollipop (não apenas assumir)
        
        // Verifica se existe playerStatsByGuild para fazer a verificação individual
        if (nodeData.playerStatsByGuild && nodeData.playerStatsByGuild.Lollipop) {
          console.log('🔍 Usando playerStatsByGuild para verificação individual')
          
          // Pega apenas os players que estão na guilda Lollipop
          const lollipopPlayers = nodeData.playerStatsByGuild.Lollipop
          console.log('🔍 Players confirmados da Lollipop:', Object.keys(lollipopPlayers).length)
          
          Object.entries(lollipopPlayers).forEach(([nick, stats]: [string, any]) => {
            if (stats.familia && stats.familia.trim()) {
              lollipopParticipants.push({
                familia: stats.familia,
                nick: nick,
                classe: stats.classe || 'Classe não encontrada',
                hasGearscore: false
              })
            }
          })
        } else {
          console.log('🔍 playerStatsByGuild não encontrado, usando verificação alternativa')
          
          // Fallback: verifica se existe classes_by_guild para Lollipop
          if (nodeData.classes_by_guild && nodeData.classes_by_guild.Lollipop) {
            console.log('🔍 Usando classes_by_guild para verificação')
            
            Object.entries(nodeData.classes_by_guild.Lollipop).forEach(([classe, players]: [string, any]) => {
              if (Array.isArray(players)) {
                players.forEach((player: any) => {
                  if (player.familia && player.familia.trim()) {
                    lollipopParticipants.push({
                      familia: player.familia,
                      nick: player.nick || player.familia,
                      classe: classe,
                      hasGearscore: false
                    })
                  }
                })
              }
            })
          } else {
            console.warn('⚠️ Estrutura de dados não suporta verificação individual de guilda')
            console.log('🔍 Estruturas disponíveis:', {
              playerStatsByGuild: !!nodeData.playerStatsByGuild,
              classes_by_guild: !!nodeData.classes_by_guild,
              guilds: nodeData.guilds,
              guild: nodeData.guild
            })
          }
        }
      } else {
        console.warn('⚠️ Guilda Lollipop não encontrada nesta node')
        console.log('🔍 Guildas presentes:', nodeData.guilds || nodeData.guild)
      }
      
      console.log('🔍 Participants Lollipop encontrados:', lollipopParticipants.length)
      console.log('🔍 Lista de participants Lollipop:', lollipopParticipants.map(p => `${p.familia} (${p.classe})`))

      // Se não encontrou nenhum participant Lollipop, retorna
      if (lollipopParticipants.length === 0) {
        setGsError('Nenhum player da Lollipop encontrado nesta node')
        setGsLoading(false)
        return
      }

      console.log('🔍 ===== BUSCANDO GEARSCORE =====')
      
      // 2. Busca gearscore de todos os players da Lollipop
      const response = await fetch('/api/players-gearscore?guild=lollipop&limit=0', { cache: 'no-store' as RequestCache })
      const data = await response.json()

      if (data.success) {
        console.log('🔍 Total de players Lollipop com GS:', data.data.players.length)
        
        // 3. Cruza os dados: participants da Lollipop na node + gearscore atual
        const participantsWithGearscore: any[] = []
        const participantsWithoutGearscore: any[] = []
        
        lollipopParticipants.forEach(participant => {
          // Busca gearscore do participant
          const gearscorePlayer = data.data.players.find((player: any) => 
            player.family_name.toLowerCase() === participant.familia.toLowerCase()
          )
          
          if (gearscorePlayer && gearscorePlayer.gearscore > 0) {
            // Participant tem gearscore válido
            participantsWithGearscore.push({
              ...gearscorePlayer,
              main_class: participant.classe,
              character_name: participant.nick
            })
          } else {
            // Participant não tem gearscore
            participantsWithoutGearscore.push({
              family_name: participant.familia,
              character_name: participant.nick,
              main_class: participant.classe,
              ap: 0,
              aap: 0,
              dp: 0,
              gearscore: 0,
              last_updated: 'N/A'
            })
          }
        })
        
        console.log('🔍 Participants Lollipop com GS:', participantsWithGearscore.length)
        console.log('🔍 Participants Lollipop sem GS:', participantsWithoutGearscore.length)
        
        // 4. Combina ambos os arrays para mostrar todos os participants da Lollipop
        const allParticipants = [...participantsWithGearscore, ...participantsWithoutGearscore]
        
        setLollipopGearscore(allParticipants)
        console.log('🔍 ===== FINALIZADO COM SUCESSO =====')
      } else {
        setGsError(data.error || 'Erro ao buscar dados de gearscore')
      }
    } catch (err) {
      console.error('❌ Erro ao buscar gearscore:', err)
      setGsError('Erro ao buscar dados de gearscore')
    } finally {
      setGsLoading(false)
    }
  }

  // Função para buscar GS da node atual sendo visualizada
  const fetchCurrentNodeGearscore = () => {
    // Evita chamadas desnecessárias
    if (gsLoading) {
      console.log('⏳ Já está carregando, ignorando chamada')
      return
    }
    
    // Encontra o record atual que está sendo visualizado
    const currentRecord = historyData.find(record => 
      record.id === viewingComplete || 
      record.arquivo_nome === viewingComplete
    )
    
    if (currentRecord) {
      console.log('🔍 Buscando GS para node atual:', currentRecord.node)
      // Limpa dados anteriores para forçar recálculo da UI
      setLollipopGearscore([])
      fetchLollipopGearscore(currentRecord)
    } else {
      console.warn('⚠️ Nenhum record atual encontrado para buscar GS')
    }
  }

  // Carrega gearscore da Lollipop quando necessário
  useEffect(() => {
    if (viewingComplete && !gsLoading && lollipopGearscore.length === 0) {
      // Busca GS da node atual sendo visualizada
      fetchCurrentNodeGearscore()
    }
  }, [viewingComplete]) // Remove dependências que causam loop

  // Limpa dados de gearscore quando mudar de node
  useEffect(() => {
    setLollipopGearscore([])
    setGsError(null)
  }, [viewingComplete])

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
        // Prioridade: created_at > event_date > date (relativo ao upload)
        let targetDate: string | null = null
        if (record.created_at) {
          targetDate = record.created_at
        } else if (record.event_date) {
          targetDate = record.event_date
        } else if (record.date) {
          targetDate = record.date
        }
        
        if (!targetDate) {
          console.warn('⚠️ Registro sem data:', record.id)
          return new Date().toISOString().split('T')[0] // Data atual como fallback
        }
        
        // Normaliza para YYYY-MM-DD no fuso local
        return toLocalYMD(targetDate)
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

  // Participação de jogadores da Chernobyl nos registros filtrados
  const chernPlayersParticipation = useMemo(() => {
    const byNick = new Map<string, {
      nick: string
      familia: string
      classeCounts: Record<string, number>
      mainClass: string
      records: Set<string>
      kills: number
      deaths: number
    }>()

    filteredRecords.forEach((record) => {
      const stats = (record as any).player_stats_by_guild || (record as any).playerStatsByGuild || {}
      const recordId = (record as any).id

      Object.entries(stats as Record<string, any>).forEach(([guildName, byNickObj]: [string, any]) => {
        if ((guildName || '').toString().toLowerCase() !== 'chernobyl') return
        Object.entries(byNickObj || {}).forEach(([nick, st]: [string, any]) => {
          const familia = (st?.familia || '').toString()
          const classe = (st?.classe || 'Desconhecida').toString()
          const kills = Number(st?.kills || 0)
          const deaths = Number(st?.deaths || 0)

          if (!byNick.has(nick)) {
            byNick.set(nick, {
              nick,
              familia,
              classeCounts: {},
              mainClass: classe,
              records: new Set<string>(),
              kills: 0,
              deaths: 0,
            })
          }

          const ref = byNick.get(nick)!
          ref.records.add(recordId)
          ref.kills += kills
          ref.deaths += deaths
          ref.classeCounts[classe] = (ref.classeCounts[classe] || 0) + 1
          const entries = Object.entries(ref.classeCounts)
          entries.sort((a, b) => b[1] - a[1])
          ref.mainClass = entries[0]?.[0] || classe
        })
      })
    })

    const rows = Array.from(byNick.values()).map((p) => ({
      nick: p.nick,
      familia: p.familia,
      mainClass: p.mainClass,
      appearances: p.records.size,
      kills: p.kills,
      deaths: p.deaths,
      kd: p.deaths > 0 ? p.kills / p.deaths : (p.kills > 0 ? Infinity : 0),
    }))

    // Distribuição por classe considerando a classe principal dos jogadores
    const byClass: Record<string, number> = {}
    rows.forEach((r) => {
      byClass[r.mainClass] = (byClass[r.mainClass] || 0) + 1
    })

    const totalPlayers = rows.length
    const topByPresence = rows.sort((a, b) => {
      if (b.appearances === a.appearances) return b.kills - a.kills
      return b.appearances - a.appearances
    })

    return { totalPlayers, byClass, topByPresence }
  }, [filteredRecords])

  const chernClassOptions = useMemo(() => {
    return Object.keys(chernPlayersParticipation.byClass || {}).sort((a, b) => a.localeCompare(b, 'pt'))
  }, [chernPlayersParticipation])

  const chernRows = useMemo(() => {
    let rows = [...(chernPlayersParticipation.topByPresence || [])]
    // Filtro por busca
    if (chernSearch.trim()) {
      const q = chernSearch.toLowerCase()
      rows = rows.filter(r => r.nick.toLowerCase().includes(q) || (r.familia || '').toLowerCase().includes(q))
    }
    // Filtro por classe
    if (chernClassFilter !== 'all') {
      rows = rows.filter(r => (r.mainClass || '') === chernClassFilter)
    }
    // Ordenação
    rows.sort((a, b) => {
      if (chernSortBy === 'name') return a.nick.localeCompare(b.nick)
      if (chernSortBy === 'kd') {
        const ak = a.kd, bk = b.kd
        if (!isFinite(bk) && isFinite(ak)) return 1
        if (!isFinite(ak) && isFinite(bk)) return -1
        if (bk === ak) return b.appearances - a.appearances
        return bk - ak
      }
      // presence (default)
      if (b.appearances === a.appearances) return b.kd - a.kd
      return b.appearances - a.appearances
    })
    return rows
  }, [chernPlayersParticipation, chernSearch, chernClassFilter, chernSortBy])

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

      {/* Jogadores Chernobyl (resumo compacto com opção de expandir) */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center justify-between">
            <span className="flex items-center">
              <UsersIcon className="h-5 w-5 mr-2" />
              Jogadores da Chernobyl
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-neutral-700 text-neutral-300">
                {chernPlayersParticipation.totalPlayers} únicos
              </Badge>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-200">
                    Ver recorrência <span className="ml-1">▾</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[90vw] max-w-[1200px] p-0 bg-neutral-900 border-neutral-700">
                  <div className="p-3 border-b border-neutral-700 text-sm text-neutral-400">
                    {chernPlayersParticipation.totalPlayers} jogadores únicos nos registros filtrados
                  </div>
                  <div className="p-3">
                    <Tabs defaultValue="recorrencia" className="w-full">
                      <TabsList className="bg-neutral-800 border border-neutral-700">
                        <TabsTrigger value="recorrencia">Recorrência</TabsTrigger>
                        <TabsTrigger value="lista">Lista</TabsTrigger>
                      </TabsList>
                      <TabsContent value="recorrencia" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 md:col-span-1">
                            <h4 className="text-sm text-neutral-300 mb-3">Distribuição por Classe</h4>
                            <div className="space-y-2">
                              {Object.entries(chernPlayersParticipation.byClass).sort((a,b)=> b[1]-a[1]).map(([classe, count]) => {
                                const pct = (count/(chernPlayersParticipation.totalPlayers||1))*100
                                return (
                                  <div key={classe}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                      <span className="text-neutral-300">{classe}</span>
                                      <span className="text-neutral-100 font-medium">{count} ({pct.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-neutral-700 rounded">
                                      <div className="h-2 bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                )
                              })}
                              {Object.keys(chernPlayersParticipation.byClass).length === 0 && (
                                <div className="text-sm text-neutral-500">Sem dados de classe</div>
                              )}
                            </div>
                          </div>
                          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {chernRows.slice(0, 18).map((p, i) => (
                              <div
                                key={`${p.nick}-${i}`}
                                className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-780 transition-colors flex items-start justify-between min-h-[110px]"
                              >
                                <div className="pr-3">
                                  <div className="text-neutral-100 font-semibold text-base">{p.nick}</div>
                                  <div className="text-xs text-neutral-400 mt-1">{p.familia} • {p.mainClass}</div>
                                  <a
                                    href={`/history?familia=${encodeURIComponent(p.familia)}`}
                                    className="inline-block mt-3 text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline text-xs"
                                  >
                                    Ver histórico
                                  </a>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className="bg-neutral-700 text-neutral-200">{p.appearances}x</Badge>
                                  <Badge className={p.kd>=1? 'bg-green-900 text-green-300':'bg-red-900 text-red-300'}>
                                    {p.kd===Infinity? '∞' : p.kd.toFixed(2)} K/D
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {chernPlayersParticipation.topByPresence.length === 0 && (
                              <div className="text-sm text-neutral-500">Sem jogadores Chernobyl nos registros</div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="lista" className="mt-4">
                        <div className="bg-neutral-800 rounded-lg p-0 border border-neutral-700">
                          <div className="p-3 flex flex-col md:flex-row gap-3 items-start md:items-center border-b border-neutral-700">
                            <div className="flex items-center gap-2 w-full md:w-1/2">
                              <Input
                                placeholder="Buscar jogador/família..."
                                className="bg-neutral-850 border-neutral-700 text-neutral-200"
                                value={chernSearch}
                                onChange={(e)=>setChernSearch(e.target.value)}
                              />
                              <Select value={chernClassFilter} onValueChange={setChernClassFilter}>
                                <SelectTrigger className="w-48 bg-neutral-850 border-neutral-700 text-neutral-200">
                                  <SelectValue placeholder="Classe" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas as classes</SelectItem>
                                  {chernClassOptions.map(c=> (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={chernSortBy} onValueChange={(v)=>setChernSortBy(v as any)}>
                                <SelectTrigger className="w-44 bg-neutral-850 border-neutral-700 text-neutral-200">
                                  <SelectValue placeholder="Ordenar por" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="presence">Presença (maior)</SelectItem>
                                  <SelectItem value="kd">K/D (maior)</SelectItem>
                                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="sticky top-0 bg-neutral-850 border-b border-neutral-700 text-neutral-400">
                                <th className="text-left p-2 w-1/5">Jogador</th>
                                <th className="text-left p-2 w-1/5">Família</th>
                                <th className="text-left p-2 w-1/5">Classe</th>
                                <th className="text-center p-2 w-1/6">Presença</th>
                                <th className="text-center p-2 w-1/6">K/D</th>
                                <th className="text-center p-2 w-1/6">Histórico</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chernRows.map((p, i) => (
                                <tr key={`${p.nick}-${i}`} className="border-b border-neutral-800 hover:bg-neutral-800">
                                  <td className="p-2 text-neutral-200 font-medium">{p.nick}</td>
                                  <td className="p-2 text-neutral-300">{p.familia}</td>
                                  <td className="p-2 text-neutral-300">{p.mainClass}</td>
                                  <td className="p-2 text-center text-neutral-200">{p.appearances}</td>
                                  <td className="p-2 text-center font-semibold">{p.kd===Infinity? '∞' : p.kd.toFixed(2)}</td>
                                  <td className="p-2 text-center">
                                    <a href={`/history?familia=${encodeURIComponent(p.familia)}`} className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline">Ver</a>
                                  </td>
                                </tr>
                              ))}
                              {chernRows.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="p-3 text-center text-neutral-500">Sem jogadores Chernobyl nos registros</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Modal Chernobyl */}
      <Dialog open={showChernModal} onOpenChange={setShowChernModal}>
        <DialogContent className="w-[96vw] max-w-[1400px] max-h-[90vh] overflow-hidden bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">Jogadores da Chernobyl</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-1">
            <div className="text-sm text-neutral-400">{chernPlayersParticipation.totalPlayers} jogadores únicos nos registros filtrados</div>
            <Tabs defaultValue="recorrencia" className="w-full">
              <TabsList className="bg-neutral-800 border border-neutral-700">
                <TabsTrigger value="recorrencia">Recorrência</TabsTrigger>
                <TabsTrigger value="lista">Lista</TabsTrigger>
              </TabsList>
              <TabsContent value="recorrencia" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 md:col-span-1">
                    <h4 className="text-sm text-neutral-300 mb-3">Distribuição por Classe</h4>
                    <div className="space-y-2">
                      {Object.entries(chernPlayersParticipation.byClass).sort((a,b)=> b[1]-a[1]).map(([classe, count]) => {
                        const pct = (count/(chernPlayersParticipation.totalPlayers||1))*100
                        return (
                          <div key={classe}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-neutral-300">{classe}</span>
                              <span className="text-neutral-100 font-medium">{count} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full h-2 bg-neutral-700 rounded">
                              <div className="h-2 bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                      {Object.keys(chernPlayersParticipation.byClass).length === 0 && (
                        <div className="text-sm text-neutral-500">Sem dados de classe</div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chernRows.slice(0, 18).map((p, i) => (
                      <div
                        key={`${p.nick}-${i}`}
                        className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-780 transition-colors flex items-start justify-between min-h-[110px]"
                      >
                        <div className="pr-3">
                          <div className="text-neutral-100 font-semibold text-base">{p.nick}</div>
                          <div className="text-xs text-neutral-400 mt-1">{p.familia} • {p.mainClass}</div>
                          <a
                            href={`/history?familia=${encodeURIComponent(p.familia)}`}
                            className="inline-block mt-3 text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline text-xs"
                          >
                            Ver histórico
                          </a>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className="bg-neutral-700 text-neutral-200">{p.appearances}x</Badge>
                          <Badge className={p.kd>=1? 'bg-green-900 text-green-300':'bg-red-900 text-red-300'}>
                            {p.kd===Infinity? '∞' : p.kd.toFixed(2)} K/D
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {chernPlayersParticipation.topByPresence.length === 0 && (
                      <div className="text-sm text-neutral-500">Sem jogadores Chernobyl nos registros</div>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="lista" className="mt-4">
                <div className="bg-neutral-800 rounded-lg p-0 border border-neutral-700">
                  <div className="p-3 flex flex-col md:flex-row gap-3 items-start md:items-center border-b border-neutral-700">
                    <div className="flex items-center gap-2 w-full md:w-1/2">
                      <Input
                        placeholder="Buscar jogador/família..."
                        className="bg-neutral-850 border-neutral-700 text-neutral-200"
                        value={chernSearch}
                        onChange={(e)=>setChernSearch(e.target.value)}
                      />
                      <Select value={chernClassFilter} onValueChange={setChernClassFilter}>
                        <SelectTrigger className="w-48 bg-neutral-850 border-neutral-700 text-neutral-200">
                          <SelectValue placeholder="Classe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as classes</SelectItem>
                          {chernClassOptions.map(c=> (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={chernSortBy} onValueChange={(v)=>setChernSortBy(v as any)}>
                        <SelectTrigger className="w-44 bg-neutral-850 border-neutral-700 text-neutral-200">
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presence">Presença (maior)</SelectItem>
                          <SelectItem value="kd">K/D (maior)</SelectItem>
                          <SelectItem value="name">Nome (A-Z)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="sticky top-0 bg-neutral-850 border-b border-neutral-700 text-neutral-400">
                        <th className="text-left p-2 w-1/5">Jogador</th>
                        <th className="text-left p-2 w-1/5">Família</th>
                        <th className="text-left p-2 w-1/5">Classe</th>
                        <th className="text-center p-2 w-1/6">Presença</th>
                        <th className="text-center p-2 w-1/6">K/D</th>
                        <th className="text-center p-2 w-1/6">Histórico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chernRows.map((p, i) => (
                        <tr key={`${p.nick}-${i}`} className="border-b border-neutral-800 hover:bg-neutral-800">
                          <td className="p-2 text-neutral-200 font-medium">{p.nick}</td>
                          <td className="p-2 text-neutral-300">{p.familia}</td>
                          <td className="p-2 text-neutral-300">{p.mainClass}</td>
                          <td className="p-2 text-center text-neutral-200">{p.appearances}</td>
                          <td className="p-2 text-center font-semibold">{p.kd===Infinity? '∞' : p.kd.toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <a href={`/history?familia=${encodeURIComponent(p.familia)}`} className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline">Ver</a>
                          </td>
                        </tr>
                      ))}
                      {chernPlayersParticipation.topByPresence.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-neutral-500">Sem jogadores Chernobyl nos registros</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Daily Statistics */}
      <div className="space-y-6">
        {dayStats.map((dayStat) => (
          <Card key={dayStat.date} className="border-neutral-800 bg-neutral-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-blue-400" />
                  <div>
                    <CardTitle className="text-neutral-100">{formatRelativeDay(dayStat.date)}</CardTitle>
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
                        if (record.created_at) targetDate = record.created_at
                        else if (record.event_date) targetDate = record.event_date
                        else if (record.date) targetDate = record.date
                        if (!targetDate) return null
                        return toLocalYMD(targetDate)
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
                  // Prioriza created_at para título relativo
                  if (record.created_at) {
                    targetDate = record.created_at
                  } else if (record.event_date) {
                    targetDate = record.event_date
                  } else if (record.date) {
                    targetDate = record.date
                  }
                  
                  if (!targetDate) return null
                  return toLocalYMD(targetDate)
                })()
                
                const headerDate = eventDateIso ? formatRelativeDay(eventDateIso) : ''

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
                        <TabsTrigger value="gs-lollipop">GS Lollipop</TabsTrigger>
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

                        {/* Summary Cards (sem Total Geral e Total Kills) */}
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                          <StatsCard
                            title="Guilda"
                            value={selectedGuildView === "all" ? guilds.join(", ") : selectedGuildView}
                            icon={UsersIcon}
                            variant="info"
                          />
                        </div>

                        {/* Classes Breakdown */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-neutral-100">Composição por Classe</h3>
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

                              // Denominador para %: total de jogadores da guilda selecionada
                              const guildTotal = (selectedGuildView === 'all' || !processedData.classes_by_guild)
                                ? Number(processedData.total_geral || processedData.totalGeral)
                                : Object.values(((processedData.classes_by_guild || {})[selectedGuildView] || {}))
                                    .reduce((acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0), 0)

                              return (
                                <CollapsibleClassItem
                                  key={classe}
                                  classe={classe}
                                  count={players.length}
                                  players={players}
                                  total={guildTotal}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="jogadores" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label>Buscar família</Label>
                            <Input placeholder="família..." value={modalSearch} onChange={(e)=>setModalSearch(e.target.value)} className="bg-neutral-800 border-neutral-700" />
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
                            (modalSearch ? (r.familia || '').toLowerCase().includes(modalSearch.toLowerCase()) : true) &&
                            (modalClassFilter==='all' ? true : r.classe === modalClassFilter)
                          ).sort((a,b)=> {
                            const dir = sortDir === 'asc' ? 1 : -1
                            const cmpNum = (x: number, y: number) => (x - y) * dir
                            const cmpNumWithInf = (x: number, y: number) => {
                              const ax = isFinite(x), ay = isFinite(y)
                              if (ax && !ay) return sortDir === 'asc' ? -1 : 1
                              if (!ax && ay) return sortDir === 'asc' ? 1 : -1
                              if (x === y) return cmpNum(a.kills, b.kills) // desempate
                              return (x - y) * dir
                            }
                            const cmpStr = (x: string, y: string) => x.localeCompare(y) * (sortDir === 'asc' ? 1 : -1)
                            switch (sortCol) {
                              case 'nick': return cmpStr(a.nick, b.nick)
                              case 'familia': return cmpStr(a.familia || '', b.familia || '')
                              case 'guilda': return cmpStr(a.guilda, b.guilda)
                              case 'classe': return cmpStr(a.classe, b.classe)
                              case 'kills': return cmpNum(a.kills, b.kills)
                              case 'deaths': return cmpNum(a.deaths, b.deaths)
                              case 'kd': return cmpNumWithInf(a.kd, b.kd)
                              case 'killsC': return cmpNum(a.killsC, b.killsC)
                              case 'deathsC': return cmpNum(a.deathsC, b.deathsC)
                              case 'kdC': return cmpNumWithInf(a.kdC, b.kdC)
                              default: return 0
                            }
                          })

                          return (
                            <div className="overflow-x-auto border border-neutral-800 rounded-lg">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-neutral-700">
                                    <th className="text-left p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('nick','asc')}>Jogador {renderSortIcon('nick')}</th>
                                    <th className="text-left p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('familia','asc')}>Família {renderSortIcon('familia')}</th>
                                    <th className="text-left p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('guilda','asc')}>Guilda {renderSortIcon('guilda')}</th>
                                    <th className="text-left p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('classe','asc')}>Classe {renderSortIcon('classe')}</th>
                                    <th className="text-center p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('kills','desc')}>Kills {renderSortIcon('kills')}</th>
                                    <th className="text-center p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('deaths','asc')}>Deaths {renderSortIcon('deaths')}</th>
                                    <th className="text-center p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('kd','desc')}>K/D {renderSortIcon('kd')}</th>
                                    {selectedGuildView === 'Lollipop' && (
                                      <>
                                        <th className="text-center p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('killsC','desc')}>Kills vs Chernobyl {renderSortIcon('killsC')}</th>
                                        <th className="text-center p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('deathsC','asc')}>Deaths vs Chernobyl {renderSortIcon('deathsC')}</th>
                                        <th className="text-center p-2 text-neutral-300 cursor-pointer select-none" onClick={()=>handleSortClick('kdC','desc')}>K/D vs Chernobyl {renderSortIcon('kdC')}</th>
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
                          const killsByGuild = processedData.killsByGuild || processedData.kills_by_guild || {}
                          const deathsByGuild = processedData.deathsByGuild || processedData.deaths_by_guild || {}
                          const guildStats: Record<string, { kills: number; deaths: number; kd: number; players: number }> = {}
                          
                          // Inicializa estatísticas para cada guilda
                          guilds.forEach((guild: string) => {
                            guildStats[guild] = { kills: 0, deaths: 0, kd: 0, players: 0 }
                          })
                          
                          // Se houver totais por guilda, use como fonte primária pela consistência
                          if (Object.keys(killsByGuild).length > 0 || Object.keys(deathsByGuild).length > 0) {
                            Object.keys(guildStats).forEach((guildName) => {
                              guildStats[guildName].kills = killsByGuild[guildName] || 0
                              guildStats[guildName].deaths = deathsByGuild[guildName] || 0
                            })
                            // Número de players segue vindo do map por jogador
                            Object.entries(statsGuild).forEach(([guildName, byNick]: [string, any]) => {
                              guildStats[guildName].players = Object.keys(byNick || {}).length
                            })
                          } else {
                            // Fallback: soma a partir das estatísticas individuais
                            Object.entries(statsGuild).forEach(([guildName, byNick]: [string, any]) => {
                              Object.values(byNick).forEach((player: any) => {
                                const kills = player.kills || 0
                                const deaths = player.deaths || 0
                                guildStats[guildName].kills += kills
                                guildStats[guildName].deaths += deaths
                                guildStats[guildName].players += 1
                              })
                            })
                          }
                          
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

                      <TabsContent value="gs-lollipop" className="mt-4">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-neutral-100">GS dos Players da Lollipop na Node</h3>
                              <p className="text-sm text-neutral-400">
                                Gearscore atual apenas dos players que participaram desta node de guerra
                              </p>
                            </div>
                            <Button 
                              onClick={fetchCurrentNodeGearscore}
                              disabled={gsLoading}
                              variant="outline"
                              size="sm"
                            >
                              {gsLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Carregando...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Atualizar
                                </>
                              )}
                            </Button>
                          </div>

                          {gsError && (
                            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                              <p className="text-red-400 text-sm">{gsError}</p>
                            </div>
                          )}

                          {lollipopGearscore.length > 0 && (
                            <>
                              {/* Estatísticas Gerais */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-neutral-800 border-neutral-700">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-neutral-300">Total de Participants</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-2xl font-bold text-neutral-100">{lollipopGearscore.length}</div>
                                    <p className="text-xs text-neutral-400 mt-1">Todos os participants</p>
                                  </CardContent>
                                </Card>

                                <Card className="bg-neutral-800 border-neutral-700">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-neutral-300">Com Gearscore</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-2xl font-bold text-neutral-100">
                                      {(() => {
                                        // Filtra players com GS válido, excluindo Shai e players de defesa
                                        const playersWithGS = lollipopGearscore.filter(p => p.gearscore > 0)
                                        const validPlayers = playersWithGS.filter(player => {
                                          // Exclui classe Shai
                                          if (player.main_class === 'Shai') return false
                                          
                                          // Exclui players específicos de defesa
                                          const defensePlayers = [
                                            'Teste', 'Lagswitch', 'GarciaGil', 'OAT', 'Haleluya', 
                                            'Fberg', 'Dxvn', 'ZeDoBambu', 'KingThePower', "Faellz",
                                            "OverBlow", "Schwarzfang", "Vallimi", "Witte", "Miih",
                                          ]
                                          if (defensePlayers.includes(player.family_name)) return false
                                          
                                          return true
                                        })
                                        
                                        return validPlayers.length
                                      })()}
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1">Com GS válido (excluindo Shai e Defesa)</p>
                                  </CardContent>
                                </Card>

                                <Card className="bg-neutral-800 border-neutral-700">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-neutral-300">Sem Gearscore</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-2xl font-bold text-neutral-100">
                                      {lollipopGearscore.filter(p => p.gearscore === 0).length}
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1">Sem registro</p>
                                  </CardContent>
                                </Card>

                                <Card className="bg-neutral-800 border-neutral-700">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-neutral-300">GS Médio</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-2xl font-bold text-neutral-100">
                                      {(() => {
                                        // Filtra players com GS válido, excluindo Shai e players de defesa
                                        const playersWithGS = lollipopGearscore.filter(p => p.gearscore > 0)
                                        const validPlayers = playersWithGS.filter(player => {
                                          // Exclui classe Shai
                                          if (player.main_class === 'Shai') return false
                                          
                                          // Exclui players específicos de defesa
                                          const defensePlayers = [
                                            'Teste', 'Lagswitch', 'GarciaGil', 'OAT', 'Haleluya', 
                                            'Fberg', 'Dxvn', 'ZeDoBambu', 'KingThePower'
                                          ]
                                          if (defensePlayers.includes(player.family_name)) return false
                                          
                                          return true
                                        })
                                        
                                        if (validPlayers.length === 0) return 0
                                        return Math.round(
                                          validPlayers.reduce((sum, player) => sum + player.gearscore, 0) / 
                                          validPlayers.length
                                        )
                                      })()}
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1">Apenas com GS válido (excluindo Shai e Defesa)</p>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Tabela de Players */}
                              <Card className="bg-neutral-800 border-neutral-700">
                                <CardHeader>
                                  <CardTitle className="text-neutral-100">Todos os Participants da Node</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-neutral-700 text-neutral-400">
                                          <th className="w-12 text-left py-2 px-2">#</th>
                                          <th className="text-left py-2 px-2">Player</th>
                                          <th className="text-left py-2 px-2">Classe</th>
                                          <th className="text-center py-2 px-2">Status</th>
                                          <th className="text-center py-2 px-2">AP</th>
                                          <th className="text-center py-2 px-2">AAP</th>
                                          <th className="text-center py-2 px-2">DP</th>
                                          <th className="text-center py-2 px-2 font-bold">GS</th>
                                          <th className="text-left py-2 px-2">Última Atualização</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {lollipopGearscore
                                          .sort((a, b) => b.gearscore - a.gearscore)
                                          .map((player, index) => (
                                            <tr key={index} className={`border-b border-neutral-700 hover:bg-neutral-700/50 ${
                                              player.gearscore === 0 ? 'bg-red-900/20' : ''
                                            }`}>
                                              <td className="py-2 px-2 text-neutral-400">{index + 1}</td>
                                              <td className="py-2 px-2">
                                                <div>
                                                  <div className="font-medium text-neutral-100">{player.family_name}</div>
                                                  <div className="text-xs text-neutral-400">{player.character_name}</div>
                                                </div>
                                              </td>
                                              <td className="py-2 px-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {player.main_class}
                                                </Badge>
                                              </td>
                                              <td className="py-2 px-2 text-center">
                                                {player.gearscore > 0 ? (
                                                  <Badge className="bg-green-600 text-white text-xs">
                                                    Com GS
                                                  </Badge>
                                                ) : (
                                                  <Badge className="bg-red-600 text-white text-xs">
                                                    Sem GS
                                                  </Badge>
                                                )}
                                              </td>
                                              <td className="py-2 px-2 text-center font-mono text-neutral-300">
                                                {player.gearscore > 0 ? player.ap : '-'}
                                              </td>
                                              <td className="py-2 px-2 text-center font-mono text-neutral-300">
                                                {player.gearscore > 0 ? player.aap : '-'}
                                              </td>
                                              <td className="py-2 px-2 text-center font-mono text-neutral-300">
                                                {player.gearscore > 0 ? player.dp : '-'}
                                              </td>
                                              <td className="py-2 px-2 text-center font-bold font-mono text-lg">
                                                {player.gearscore > 0 ? (
                                                  <span className={
                                                    player.gearscore >= 850 ? 'text-green-400' :
                                                    player.gearscore >= 800 ? 'text-blue-400' :
                                                    player.gearscore >= 750 ? 'text-yellow-400' :
                                                    'text-red-400'
                                                  }>
                                                    {player.gearscore}
                                                  </span>
                                                ) : (
                                                  <span className="text-red-400">N/A</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-2 text-xs text-neutral-400">
                                                {player.gearscore > 0 ? (
                                                  new Date(player.last_updated).toLocaleDateString('pt-BR')
                                                ) : (
                                                  'N/A'
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          )}

                          {!gsLoading && lollipopGearscore.length === 0 && !gsError && (
                            <div className="text-center py-8">
                              <p className="text-neutral-400">Nenhum dado de gearscore encontrado para a guilda Lollipop.</p>
                            </div>
                          )}
                        </div>
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

