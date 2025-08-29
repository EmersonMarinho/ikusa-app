import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Interface para os dados do player
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
}

// Interface para estatísticas da guilda
interface GuildStats {
  total_players: number
  average_gearscore: number
  top_players: PlayerGearscore[]
  class_distribution: Record<string, number>
  gearscore_ranges: {
    '700-750': number
    '751-800': number
    '801-850': number
    '851-900': number
  }
}

// Interface para histórico
interface GearscoreHistory {
  id: number
  user_id: string
  ap: number
  aap: number
  dp: number
  gearscore: number
  recorded_at: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guild = searchParams.get('guild') || 'lollipop'
    const limit = parseInt(searchParams.get('limit') || '0') // 0 = sem limite
    const sortBy = searchParams.get('sortBy') || 'gearscore'
    const order = searchParams.get('order') || 'desc'
    const includeHistory = searchParams.get('history') === 'true'
    const userId = searchParams.get('userId')

    // Busca players com gearscore mais recente
    let query = supabase
      .from('players')
      .select(`
        *,
        gearscore_history(
          ap,
          aap,
          dp,
          gearscore,
          recorded_at
        )
      `)

    // Aplica filtros
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Executa a query
    const { data: playersData, error } = await query

    if (error) {
      console.error('Erro ao buscar dados:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar dados dos players',
        message: error.message
      }, { status: 500 })
    }

    // Processa os dados para o formato esperado
    const players: PlayerGearscore[] = playersData?.map(player => {
      // Pega o gearscore mais recente do histórico
      const gearscoreHistory = player.gearscore_history || []
      const latestGearscore = gearscoreHistory.length > 0 
        ? gearscoreHistory.reduce((latest: any, current: any) => 
            new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
          )
        : null

      if (!latestGearscore) {
        // Se não há histórico, retorna valores padrão
        return {
          id: player.id,
          user_id: player.user_id.toString(),
          family_name: player.family_name,
          character_name: player.character_name,
          main_class: player.main_class,
          ap: 0,
          aap: 0,
          dp: 0,
          gearscore: 0,
          link_gear: player.link_gear,
          created_at: player.created_at,
          last_updated: player.updated_at
        }
      }

      return {
        id: player.id,
        user_id: player.user_id.toString(),
        family_name: player.family_name,
        character_name: player.character_name,
        main_class: player.main_class,
        ap: latestGearscore.ap,
        aap: latestGearscore.aap,
        dp: latestGearscore.dp,
        gearscore: latestGearscore.gearscore,
        link_gear: player.link_gear,
        created_at: player.created_at,
        last_updated: latestGearscore.recorded_at
      }
    }).filter(player => player.gearscore > 0) || [] // Remove players sem gearscore

    // Aplica ordenação
    const validSortFields = ['gearscore', 'family_name', 'main_class', 'ap', 'aap', 'dp']
    const validOrders = ['asc', 'desc']
    
    if (validSortFields.includes(sortBy)) {
      players.sort((a, b) => {
        const aValue = a[sortBy as keyof PlayerGearscore]
        const bValue = b[sortBy as keyof PlayerGearscore]
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue)
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return order === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        return 0
      })
    } else {
      // Ordenação padrão por gearscore decrescente
      players.sort((a, b) => b.gearscore - a.gearscore)
    }

    // Aplica limite
    const limitedPlayers = limit === 0 ? players : players.slice(0, Math.min(limit, 100))

    // Calcula estatísticas da guilda
    const validPlayers = players.filter(player => player.gearscore > 0)
    
    // Filtra players para estatísticas (exclui Shai e players específicos)
    const playersForStats = validPlayers.filter(player => {
      // Exclui classe Shai
      if (player.main_class.toLowerCase() === 'shai') return false
      
      // Exclui players específicos
      const excludedPlayers = [
        'teste', 'lagswitch', 'garciagil', 'oat', 'haleluya', 'fberg', 'dxvn', "ZeDoBambu", "KingThePower"
      ]
      if (excludedPlayers.some(name => 
        player.family_name.toLowerCase().includes(name.toLowerCase()) ||
        player.character_name.toLowerCase().includes(name.toLowerCase())
      )) return false
      
      return true
    })
    
    const totalPlayers = playersForStats.length
    const totalGearscore = playersForStats.reduce((sum, player) => sum + player.gearscore, 0)
    const averageGearscore = totalPlayers > 0 ? Math.round(totalGearscore / totalPlayers) : 0

    // Top 10 players (apenas dos players válidos para estatísticas)
    const topPlayers = playersForStats.slice(0, 10)

    // Distribuição por classe (apenas dos players válidos para estatísticas)
    const classDistribution: Record<string, number> = {}
    playersForStats.forEach(player => {
      classDistribution[player.main_class] = (classDistribution[player.main_class] || 0) + 1
    })

    // Distribuição por faixa de gearscore (apenas dos players válidos para estatísticas)
    const gearscoreRanges = {
      '700-750': 0,
      '751-800': 0,
      '801-850': 0,
      '851-900': 0,
    }

    playersForStats.forEach(player => {
      if (player.gearscore >= 700 && player.gearscore <= 750) gearscoreRanges['700-750']++
      else if (player.gearscore >= 751 && player.gearscore <= 800) gearscoreRanges['751-800']++
      else if (player.gearscore >= 801 && player.gearscore <= 850) gearscoreRanges['801-850']++
      else if (player.gearscore >= 851 && player.gearscore <= 900) gearscoreRanges['851-900']++
    })

    const guildStats: GuildStats = {
      total_players: totalPlayers,
      average_gearscore: averageGearscore,
      top_players: topPlayers,
      class_distribution: classDistribution,
      gearscore_ranges: gearscoreRanges
    }

    // Busca histórico se solicitado
    let history: GearscoreHistory[] = []
    if (includeHistory && userId) {
      const { data: historyData, error: historyError } = await supabase
        .from('gearscore_history')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(30)

      if (!historyError && historyData) {
        history = historyData.map(h => ({
          id: h.id,
          user_id: h.user_id.toString(),
          ap: h.ap,
          aap: h.aap,
          dp: h.dp,
          gearscore: h.gearscore,
          recorded_at: h.recorded_at
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        players: limitedPlayers,
        stats: guildStats,
        history: includeHistory ? history : undefined,
        query: {
          guild,
          limit,
          sortBy,
          order,
          includeHistory,
          userId
        }
      }
    })

  } catch (error) {
    console.error('Erro ao buscar dados dos players:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar dados dos players',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// POST para atualizar dados de um player ou fazer upload de arquivo JSON
export async function POST(request: NextRequest) {
  try {
    // Verifica se é um upload de arquivo ou dados individuais
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('multipart/form-data')) {
      // Upload de arquivo JSON
      const formData = await request.formData()
      const file = formData.get('file') as File
      const guild = formData.get('guild') as string || 'lollipop'
      
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'Arquivo não fornecido'
        }, { status: 400 })
      }

      // Lê o conteúdo do arquivo
      const fileContent = await file.text()
      let playersData: any[]
      
      try {
        playersData = JSON.parse(fileContent)
      } catch (parseError) {
        return NextResponse.json({
          success: false,
          error: 'Arquivo JSON inválido'
        }, { status: 400 })
      }

      if (!Array.isArray(playersData)) {
        return NextResponse.json({
          success: false,
          error: 'O arquivo deve conter um array de players'
        }, { status: 400 })
      }

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      // Processa cada player do arquivo
      for (const playerData of playersData) {
        try {
          const { user_id, family_name, character_name, main_class, ap, aap, dp, link_gear } = playerData
          
          if (!user_id || !family_name || !character_name || !main_class || !ap || !aap || !dp) {
            errorCount++
            errors.push(`Player ${family_name}: Dados obrigatórios faltando`)
            continue
          }

          const gearscore = Math.max(ap, aap) + dp

          // 1. Insere/atualiza player na tabela players
          const { data: player, error: playerError } = await supabase
            .from('players')
            .upsert({
              user_id: parseInt(user_id),
              family_name,
              character_name,
              main_class,
              link_gear: link_gear || null
            }, {
              onConflict: 'user_id'
            })
            .select()
            .single()

          if (playerError) {
            errorCount++
            errors.push(`Player ${family_name}: ${playerError.message}`)
            continue
          }

          // 2. Insere novo registro de gearscore no histórico
          const { error: historyError } = await supabase
            .from('gearscore_history')
            .insert({
              player_id: player.id,
              user_id: parseInt(user_id),
              ap,
              aap,
              dp,
              gearscore
            })

          if (historyError) {
            errorCount++
            errors.push(`Player ${family_name}: ${historyError.message}`)
            continue
          }

          successCount++
        } catch (playerError) {
          errorCount++
          errors.push(`Player ${playerData.family_name || 'Desconhecido'}: Erro de processamento`)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Upload concluído: ${successCount} players processados com sucesso, ${errorCount} erros`,
        data: {
          successCount,
          errorCount,
          errors: errors.length > 0 ? errors : undefined
        }
      })

    } else {
      // Dados individuais (comportamento original)
      const { user_id, family_name, character_name, main_class, ap, aap, dp, link_gear } = await request.json()
      
      if (!user_id || !family_name || !character_name || !main_class || !ap || !aap || !dp) {
        return NextResponse.json({
          success: false,
          error: 'Dados obrigatórios não fornecidos'
        }, { status: 400 })
      }

      const gearscore = Math.max(ap, aap) + dp

      // 1. Insere/atualiza player na tabela players
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .upsert({
          user_id: parseInt(user_id),
          family_name,
          character_name,
          main_class,
          link_gear: link_gear || null
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (playerError) {
        console.error('Erro ao inserir/atualizar player:', playerError)
        return NextResponse.json({
          success: false,
          error: 'Erro ao inserir/atualizar player',
          message: playerError.message
        }, { status: 500 })
      }

      // 2. Insere novo registro de gearscore no histórico
      const { error: historyError } = await supabase
        .from('gearscore_history')
        .insert({
          player_id: playerData.id,
          user_id: parseInt(user_id),
          ap,
          aap,
          dp,
          gearscore
        })

      if (historyError) {
        console.error('Erro ao inserir histórico:', historyError)
        return NextResponse.json({
          success: false,
          error: 'Erro ao inserir histórico de gearscore',
          message: historyError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Gearscore atualizado com sucesso',
        data: {
          player_id: playerData.id,
          gearscore,
          recorded_at: new Date().toISOString()
        }
      })
    }

  } catch (error) {
    console.error('Erro ao processar upload/atualização:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar dados',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
