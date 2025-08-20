import { NextRequest, NextResponse } from 'next/server'
import { 
  getCurrentMonthConfig, 
  initializeNewMonth, 
  updatePlayerMonthlyKDA,
  getAllianceLogsByMonth,
  getAllPlayersMonthlyKDA,
  MonthlyKDARecord 
} from '@/lib/supabase-kda'
import { getProcessLogsHistory } from '@/lib/supabase'
import { supabase } from '@/lib/supabase-kda'

export const runtime = 'nodejs'

type FamiliaToGuildMap = Record<string, 'Manifest' | 'Allyance' | 'Grand_Order'>

function normalizeFamilia(name: string): string {
  return (name || '').toString().trim().toLowerCase()
}

async function getAllianceFamilyMap(baseUrl: string): Promise<FamiliaToGuildMap> {
  try {
    const res = await fetch(`${baseUrl}/api/alliance-cache`, { cache: 'no-store' })
    let data = await res.json()
    if (!data?.members || data.members.length === 0) {
      // força atualização se estiver vazio
      const postRes = await fetch(`${baseUrl}/api/alliance-cache`, { method: 'POST' })
      data = await postRes.json()
    }
    const map: FamiliaToGuildMap = {}
    if (data?.members && Array.isArray(data.members)) {
      for (const m of data.members) {
        const familia = normalizeFamilia(m.familia)
        const guilda = (m.guilda || '').toString().trim()
        if (familia && ['Manifest', 'Allyance', 'Grand_Order'].includes(guilda)) {
          map[familia] = guilda as FamiliaToGuildMap[keyof FamiliaToGuildMap]
        }
      }
    }
    return map
  } catch (e) {
    console.warn('Não foi possível obter cache da aliança, mapeamento vazio.', e)
    return {}
  }
}

// Interface para estatísticas por classe
interface ClassStats {
  classe: string
  kills: number
  deaths: number
  kills_vs_chernobyl: number
  deaths_vs_chernobyl: number
  kills_vs_others: number
  deaths_vs_others: number
  last_played: string
}

// Função para determinar se um jogador é da aliança
function isAlliancePlayer(playerNick: string, guildData: any): { isAlliance: boolean; guilda: string } {
  // Verifica se o jogador está nas guildas da aliança
  const allianceGuilds = ['Manifest', 'Allyance', 'Grand_Order']
  
  for (const guild of allianceGuilds) {
    if (guildData.classes_by_guild?.[guild]) {
      for (const classe in guildData.classes_by_guild[guild]) {
        const players = guildData.classes_by_guild[guild][classe]
        if (players.some((p: any) => p.nick === playerNick)) {
          return { isAlliance: true, guilda: guild }
        }
      }
    }
  }
  
  // Se não está nas guildas específicas, assume que é Lollipop (aliança principal)
  if (guildData.classes) {
    for (const classe in guildData.classes) {
      const players = guildData.classes[classe]
      if (players.some((p: any) => p.nick === playerNick)) {
        return { isAlliance: true, guilda: 'Lollipop' } // Guilda principal da aliança
      }
    }
  }
  
  return { isAlliance: false, guilda: '' }
}

// Função para processar um log e extrair estatísticas individuais
function processLogForMonthlyKDA(logData: any, familiaToGuild: FamiliaToGuildMap = {} as FamiliaToGuildMap): Map<string, MonthlyKDARecord> {
  const playerStats = new Map<string, MonthlyKDARecord>()
  const currentMonth = new Date(logData.created_at).toISOString().slice(0, 7)
  
  // Processa estatísticas por jogador das guildas da aliança
  if (logData.classes_by_guild) {
    for (const [guildName, guildClasses] of Object.entries(logData.classes_by_guild)) {
      if (['Manifest', 'Allyance', 'Grand_Order'].includes(guildName)) {
        for (const [className, players] of Object.entries(guildClasses as any)) {
          for (const player of players as any[]) {
            const playerKey = player.nick
            
            if (!playerStats.has(playerKey)) {
              playerStats.set(playerKey, {
                id: '',
                created_at: '',
                updated_at: '',
                month_year: currentMonth,
                player_nick: player.nick,
                player_familia: player.familia || '',
                guilda: guildName,
                classes_played: [],
                total_kills: 0,
                total_deaths: 0,
                total_kills_vs_chernobyl: 0,
                total_deaths_vs_chernobyl: 0,
                total_kills_vs_others: 0,
                total_deaths_vs_others: 0,
                kd_overall: 0,
                kd_vs_chernobyl: 0,
                kd_vs_others: 0,
                logs_processed: [],
                last_log_processed_at: logData.created_at
              })
            }
            
            const playerRecord = playerStats.get(playerKey)!
            
            // Adiciona/atualiza classe jogada
            let classRecord = playerRecord.classes_played.find(c => c.classe === className)
            if (!classRecord) {
              classRecord = {
                classe: className,
                kills: 0,
                deaths: 0,
                kills_vs_chernobyl: 0,
                deaths_vs_chernobyl: 0,
                kills_vs_others: 0,
                deaths_vs_others: 0,
                last_played: logData.created_at
              }
              playerRecord.classes_played.push(classRecord)
            }
            
            classRecord.last_played = logData.created_at
          }
        }
      }
    }
  }

  // Fallback: se não houver classes_by_guild, usa player_stats_by_guild (persistido)
  const persistedStats = (logData.player_stats_by_guild || logData.playerStatsByGuild)
  if (persistedStats) {
    for (const [guildName, playersByNick] of Object.entries(persistedStats as any)) {
      // Se vier como Lollipop, redistribui pela guilda real usando o mapa de famílias
      if (guildName === 'Lollipop') {
        for (const [nick, stats] of Object.entries(playersByNick as any)) {
          const familia = (stats as any).familia || ''
          const mappedGuild = familiaToGuild[normalizeFamilia(familia)]
          if (!mappedGuild) {
            // Sem correspondência -> ignora (não pertence à aliança rastreada)
            continue
          }
          const playerKey = nick
          if (!playerStats.has(playerKey)) {
            playerStats.set(playerKey, {
              id: '',
              created_at: '',
              updated_at: '',
              month_year: currentMonth,
              player_nick: playerKey,
              player_familia: familia,
              guilda: mappedGuild,
              classes_played: [],
              total_kills: 0,
              total_deaths: 0,
              total_kills_vs_chernobyl: 0,
              total_deaths_vs_chernobyl: 0,
              total_kills_vs_others: 0,
              total_deaths_vs_others: 0,
              kd_overall: 0,
              kd_vs_chernobyl: 0,
              kd_vs_others: 0,
              logs_processed: [],
              last_log_processed_at: logData.created_at
            })
          }
          const playerRecord = playerStats.get(playerKey)!
          const classeName = (stats as any).classe || 'Desconhecida'
          let classRecord = playerRecord.classes_played.find(c => c.classe === classeName)
          if (!classRecord) {
            classRecord = {
              classe: classeName,
              kills: (stats as any).kills || 0,
              deaths: (stats as any).deaths || 0,
              kills_vs_chernobyl: (stats as any).kills_vs_chernobyl || 0,
              deaths_vs_chernobyl: (stats as any).deaths_vs_chernobyl || 0,
              kills_vs_others: (stats as any).kills_vs_others || 0,
              deaths_vs_others: (stats as any).deaths_vs_others || 0,
              last_played: logData.created_at
            }
            playerRecord.classes_played.push(classRecord)
          } else {
            classRecord.kills += (stats as any).kills || 0
            classRecord.deaths += (stats as any).deaths || 0
            classRecord.kills_vs_chernobyl += (stats as any).kills_vs_chernobyl || 0
            classRecord.deaths_vs_chernobyl += (stats as any).deaths_vs_chernobyl || 0
            classRecord.kills_vs_others += (stats as any).kills_vs_others || 0
            classRecord.deaths_vs_others += (stats as any).deaths_vs_others || 0
            classRecord.last_played = logData.created_at
          }
          playerRecord.total_kills += (stats as any).kills || 0
          playerRecord.total_deaths += (stats as any).deaths || 0
          playerRecord.total_kills_vs_chernobyl += (stats as any).kills_vs_chernobyl || 0
          playerRecord.total_deaths_vs_chernobyl += (stats as any).deaths_vs_chernobyl || 0
          playerRecord.total_kills_vs_others += (stats as any).kills_vs_others || 0
          playerRecord.total_deaths_vs_others += (stats as any).deaths_vs_others || 0
        }
      } else if (['Manifest', 'Allyance', 'Grand_Order'].includes(guildName)) {
        for (const [nick, stats] of Object.entries(playersByNick as any)) {
          const playerKey = nick
          if (!playerStats.has(playerKey)) {
            playerStats.set(playerKey, {
              id: '',
              created_at: '',
              updated_at: '',
              month_year: currentMonth,
              player_nick: playerKey,
              player_familia: (stats as any).familia || '',
              guilda: guildName as 'Manifest' | 'Allyance' | 'Grand_Order',
              classes_played: [],
              total_kills: 0,
              total_deaths: 0,
              total_kills_vs_chernobyl: 0,
              total_deaths_vs_chernobyl: 0,
              total_kills_vs_others: 0,
              total_deaths_vs_others: 0,
              kd_overall: 0,
              kd_vs_chernobyl: 0,
              kd_vs_others: 0,
              logs_processed: [],
              last_log_processed_at: logData.created_at
            })
          }
          const playerRecord = playerStats.get(playerKey)!
          const classeName = (stats as any).classe || 'Desconhecida'
          let classRecord = playerRecord.classes_played.find(c => c.classe === classeName)
          if (!classRecord) {
            classRecord = {
              classe: classeName,
              kills: (stats as any).kills || 0,
              deaths: (stats as any).deaths || 0,
              kills_vs_chernobyl: (stats as any).kills_vs_chernobyl || 0,
              deaths_vs_chernobyl: (stats as any).deaths_vs_chernobyl || 0,
              kills_vs_others: (stats as any).kills_vs_others || 0,
              deaths_vs_others: (stats as any).deaths_vs_others || 0,
              last_played: logData.created_at
            }
            playerRecord.classes_played.push(classRecord)
          } else {
            classRecord.kills += (stats as any).kills || 0
            classRecord.deaths += (stats as any).deaths || 0
            classRecord.kills_vs_chernobyl += (stats as any).kills_vs_chernobyl || 0
            classRecord.deaths_vs_chernobyl += (stats as any).deaths_vs_chernobyl || 0
            classRecord.kills_vs_others += (stats as any).kills_vs_others || 0
            classRecord.deaths_vs_others += (stats as any).deaths_vs_others || 0
            classRecord.last_played = logData.created_at
          }
          playerRecord.total_kills += (stats as any).kills || 0
          playerRecord.total_deaths += (stats as any).deaths || 0
          playerRecord.total_kills_vs_chernobyl += (stats as any).kills_vs_chernobyl || 0
          playerRecord.total_deaths_vs_chernobyl += (stats as any).deaths_vs_chernobyl || 0
          playerRecord.total_kills_vs_others += (stats as any).kills_vs_others || 0
          playerRecord.total_deaths_vs_others += (stats as any).deaths_vs_others || 0
        }
      }
    }
  }
  
  // Não incluir jogadores fora das guildas da aliança (Manifest, Allyance, Grand_Order)
  // Bloco abaixo foi removido para evitar inclusão de Lollipop ou outras guildas
  
  // TODO: Aqui você precisaria reprocessar o log original para extrair K/D individuais
  // Por enquanto, vamos usar dados agregados se disponíveis
  
  return playerStats
}

// GET: Busca estatísticas mensais atuais
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthYear = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    
    // Busca logs do mês especificado
    const logs = await getAllianceLogsByMonth(monthYear)
    
    // Processa todos os logs do mês
    const allPlayerStats = new Map<string, MonthlyKDARecord>()
    
    // Mapa de família -> guilda usando cache atual
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
    const familiaToGuild = await getAllianceFamilyMap(baseUrl)

    for (const log of logs) {
      const logPlayerStats = processLogForMonthlyKDA(log, familiaToGuild)
      
      // Merge stats
      for (const [playerNick, stats] of logPlayerStats) {
        if (allPlayerStats.has(playerNick)) {
          const existing = allPlayerStats.get(playerNick)!
          
          // Merge classes
          for (const newClass of stats.classes_played) {
            const existingClass = existing.classes_played.find(c => c.classe === newClass.classe)
            if (existingClass) {
              existingClass.kills += newClass.kills
              existingClass.deaths += newClass.deaths
              existingClass.kills_vs_chernobyl += newClass.kills_vs_chernobyl
              existingClass.deaths_vs_chernobyl += newClass.deaths_vs_chernobyl
              existingClass.kills_vs_others += newClass.kills_vs_others
              existingClass.deaths_vs_others += newClass.deaths_vs_others
              existingClass.last_played = newClass.last_played
            } else {
              existing.classes_played.push(newClass)
            }
          }
          
          // Merge totals
          existing.total_kills += stats.total_kills
          existing.total_deaths += stats.total_deaths
          existing.total_kills_vs_chernobyl += stats.total_kills_vs_chernobyl
          existing.total_deaths_vs_chernobyl += stats.total_deaths_vs_chernobyl
          existing.total_kills_vs_others += stats.total_kills_vs_others
          existing.total_deaths_vs_others += stats.total_deaths_vs_others
          
          // Adiciona log processado
          if (!existing.logs_processed.includes(log.id)) {
            existing.logs_processed.push(log.id)
          }
          
        } else {
          stats.logs_processed = [log.id]
          allPlayerStats.set(playerNick, stats)
        }
      }
    }
    
    // Calcula K/D ratios
    for (const [, playerStats] of allPlayerStats) {
      playerStats.kd_overall = playerStats.total_deaths > 0 
        ? playerStats.total_kills / playerStats.total_deaths 
        : playerStats.total_kills
        
      playerStats.kd_vs_chernobyl = playerStats.total_deaths_vs_chernobyl > 0 
        ? playerStats.total_kills_vs_chernobyl / playerStats.total_deaths_vs_chernobyl 
        : playerStats.total_kills_vs_chernobyl
        
      playerStats.kd_vs_others = playerStats.total_deaths_vs_others > 0 
        ? playerStats.total_kills_vs_others / playerStats.total_deaths_vs_others 
        : playerStats.total_kills_vs_others
    }
    
    return NextResponse.json({
      success: true,
      month_year: monthYear,
      total_players: allPlayerStats.size,
      total_logs_processed: logs.length,
      players: Array.from(allPlayerStats.values()).sort((a, b) => b.total_kills - a.total_kills)
    })
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas mensais:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar estatísticas mensais',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// POST: Processa logs e salva/atualiza KDA mensal
export async function POST(request: NextRequest) {
  try {
    const { forceReprocess = false, monthYear, cleanInactivePlayers = true } = await request.json()
    
    // Verifica/inicializa configuração do mês
    let config = await getCurrentMonthConfig()
    if (!config) {
      config = await initializeNewMonth()
    }
    
    const targetMonth = monthYear || config.month_year
    
    // Busca todos os logs do mês
    const logs = await getAllianceLogsByMonth(targetMonth)
    
    if (logs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum log encontrado para o mês especificado',
        month_year: targetMonth
      })
    }
    
    let processedPlayers = 0
    let updatedRecords = 0
    let removedInactivePlayers = 0

    // Prepara mapa família -> guilda (uma vez) para redistribuir Lollipop
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
    const familiaToGuild = await getAllianceFamilyMap(baseUrl)
    
    // Se for reprocessamento completo, limpa jogadores inativos
    if (forceReprocess && cleanInactivePlayers) {
      try {
        // Busca todos os jogadores atualmente no KDA mensal
        const existingPlayers = await getAllPlayersMonthlyKDA(targetMonth)
        
        // Cria set de jogadores ativos da aliança
        const activeAlliancePlayers = new Set<string>()
        
        for (const log of logs) {
          const logPlayerStats = processLogForMonthlyKDA(log, familiaToGuild)
          for (const [playerNick] of logPlayerStats) {
            activeAlliancePlayers.add(playerNick)
          }
        }
        
        // Remove jogadores que não estão mais ativos
        for (const existingPlayer of existingPlayers) {
          if (!activeAlliancePlayers.has(existingPlayer.player_nick)) {
            try {
              // Remove jogador inativo
              await supabase
                .from('monthly_kda')
                .delete()
                .eq('id', existingPlayer.id)
              
              removedInactivePlayers++
              console.log(`🗑️ Removido jogador inativo: ${existingPlayer.player_nick}`)
            } catch (deleteError) {
              console.error(`Erro ao remover jogador inativo ${existingPlayer.player_nick}:`, deleteError)
            }
          }
        }
        
        console.log(`🧹 Limpeza concluída: ${removedInactivePlayers} jogadores inativos removidos`)
      } catch (cleanError) {
        console.warn('⚠️ Erro na limpeza de jogadores inativos:', cleanError)
      }
    }
    
    // Processa cada log
    for (const log of logs) {
      const playerStats = processLogForMonthlyKDA(log, familiaToGuild)
      
      // Salva/atualiza cada jogador
      for (const [playerNick, stats] of playerStats) {
        try {
          await updatePlayerMonthlyKDA(stats)
          updatedRecords++
        } catch (error) {
          console.error(`Erro ao atualizar KDA do jogador ${playerNick}:`, error)
        }
      }
      
      processedPlayers += playerStats.size
    }
    
    return NextResponse.json({
      success: true,
      message: 'KDA mensal processado com sucesso',
      month_year: targetMonth,
      total_logs_processed: logs.length,
      total_players_processed: processedPlayers,
      records_updated: updatedRecords,
      removed_inactive_players: removedInactivePlayers
    })
    
  } catch (error) {
    console.error('Erro ao processar KDA mensal:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar KDA mensal',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
