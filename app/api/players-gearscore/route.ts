import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidForStats, computeGearscore } from '@/lib/player-filters'

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

// Helpers de Alliance Cache
function normalizeFamilia(name: string): string {
  return (name || '').toString().trim().toLowerCase()
}

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  if (envUrl) return envUrl
  const vercelHost = process.env.VERCEL_URL || ''
  if (vercelHost) return `https://${vercelHost}`
  return 'http://localhost:3000'
}

async function getAllianceFamiliesSet(): Promise<Set<string>> {
  // Busca famílias do cache persistido
  const { data, error } = await supabase
    .from('alliance_cache')
    .select('familia')

  let familias: string[] = []
  if (!error && Array.isArray(data) && data.length > 0) {
    familias = data.map(r => normalizeFamilia((r as any).familia)).filter(Boolean)
  }

  // Se vazio, tenta forçar atualização via API e buscar novamente
  if (familias.length === 0) {
    try {
      const baseUrl = getBaseUrl()
      await fetch(`${baseUrl}/api/alliance-cache`, { method: 'POST', cache: 'no-store' })
      const retry = await supabase
        .from('alliance_cache')
        .select('familia')
      if (!retry.error && Array.isArray(retry.data) && retry.data.length > 0) {
        familias = retry.data.map((r: any) => normalizeFamilia(r.familia)).filter(Boolean)
      }
    } catch {
      // Ignore e segue sem bloquear
    }
  }

  return new Set(familias)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guild = searchParams.get('guild') || 'lollipop'
    const limit = parseInt(searchParams.get('limit') || '0') // 0 = sem limite
    const sortBy = searchParams.get('sortBy') || 'gearscore'
    const order = searchParams.get('order') || 'desc'
    const includeHistory = searchParams.get('history') === 'true'
    const asOfParam = searchParams.get('asOf') // ISO date-time, usaremos para congelar GS
    const closest = searchParams.get('closest') === '1'
    const windowDays = Math.max(0, parseInt(searchParams.get('windowDays') || '7', 10) || 7)
    const skipAllianceFilter = searchParams.get('skipAllianceFilter') === '1'
    const userId = searchParams.get('userId')

    // Carrega famílias válidas da aliança
    const allianceFamilies = await getAllianceFamiliesSet()

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
    const asOf = asOfParam ? new Date(asOfParam) : null
    const playersUnfiltered: (PlayerGearscore & { prev_gearscore?: number | null; prev_recorded_at?: string | null })[] = playersData?.map(player => {
      // Ordena histórico e seleciona snapshot por data
      const gearscoreHistory = (player.gearscore_history || [])
        .filter((h: any) => h && h.recorded_at)
        .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())

      let latestGearscore = gearscoreHistory[0] || null
      let previousGearscore = gearscoreHistory[1] || null

      if (asOf && !isNaN(asOf.getTime())) {
        // Encontra o snapshot mais recente <= asOf
        let byAsOf = gearscoreHistory.find((h: any) => new Date(h.recorded_at).getTime() <= asOf.getTime()) || null
        if (!byAsOf && closest && windowDays > 0) {
          const windowMs = windowDays * 24 * 60 * 60 * 1000
          const candidates = gearscoreHistory.filter((h: any) => Math.abs(new Date(h.recorded_at).getTime() - asOf.getTime()) <= windowMs)
          if (candidates.length > 0) {
            // Escolhe o mais próximo por distância absoluta ao asOf
            candidates.sort((a: any, b: any) => Math.abs(new Date(a.recorded_at).getTime() - asOf.getTime()) - Math.abs(new Date(b.recorded_at).getTime() - asOf.getTime()))
            byAsOf = candidates[0]
          }
        }
        if (byAsOf) {
          latestGearscore = byAsOf
          const idx = gearscoreHistory.findIndex((h: any) => h === byAsOf)
          previousGearscore = idx >= 0 ? (gearscoreHistory[idx + 1] || null) : null
        } else {
          latestGearscore = null
          previousGearscore = null
        }
      }

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
        prev_gearscore: previousGearscore ? previousGearscore.gearscore : null,
        prev_recorded_at: previousGearscore ? previousGearscore.recorded_at : null,
        link_gear: player.link_gear,
        created_at: player.created_at,
        last_updated: latestGearscore.recorded_at
      }
    }) || []

    // Filtra: remove players sem gearscore e fora da aliança
    const players: PlayerGearscore[] = playersUnfiltered
      .filter(player => player.gearscore > 0)
      .filter(player => {
        if (skipAllianceFilter) return true
        // Se não conseguimos obter o cache (vazio), não bloqueia
        if (allianceFamilies.size === 0) return true
        return allianceFamilies.has(normalizeFamilia(player.family_name))
      })

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
    
    // Filtra players para estatísticas (exclui Shai e Defesa, centralizado)
    const playersForStats = validPlayers.filter(player =>
      isValidForStats({
        familyName: player.family_name,
        characterName: player.character_name,
        mainClass: player.main_class,
      })
    )
    
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
      '751-800': 0,
      '801-850': 0,
      '851-900': 0,
    }

    playersForStats.forEach(player => {
      if (player.gearscore >= 751 && player.gearscore <= 800) gearscoreRanges['751-800']++
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
        .limit(3)

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
      const dryRun = (() => {
        const v = String(formData.get('dryRun') || '').toLowerCase()
        return v === '1' || v === 'true'
      })()
      
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

      // Carrega famílias válidas
      const allianceFamilies = await getAllianceFamiliesSet()

      let successCount = 0
      let skippedCount = 0
      let errorCount = 0
      const errors: string[] = []
      const insertedFamilies: Array<{
        user_id: number;
        family_name: string;
        ap: number;
        aap: number;
        dp: number;
        gearscore: number;
        prev_ap?: number;
        prev_aap?: number;
        prev_dp?: number;
        prev_gearscore?: number;
        delta_ap?: number;
        delta_aap?: number;
        delta_dp?: number;
        delta_gearscore?: number;
      }> = []
      const skippedFamilies: Array<{
        user_id: number;
        family_name: string;
        ap: number;
        aap: number;
        dp: number;
        gearscore: number;
        prev_ap?: number;
        prev_aap?: number;
        prev_dp?: number;
        prev_gearscore?: number;
        delta_ap?: number;
        delta_aap?: number;
        delta_dp?: number;
        delta_gearscore?: number;
        reason?: string;
      }> = []
      const failedFamilies: Array<{ user_id?: number; family_name?: string; reason: string }> = []

      // Processa cada player do arquivo
      for (const playerData of playersData) {
        try {
          const { user_id, family_name, character_name, main_class, ap, aap, dp, link_gear } = playerData
          
          // Validação robusta: permite 0 e checa null/undefined
          if (
            user_id == null || user_id === '' ||
            family_name == null || family_name === '' ||
            character_name == null || character_name === '' ||
            main_class == null || main_class === '' ||
            ap == null || aap == null || dp == null
          ) {
            errorCount++
            const reason = 'Dados obrigatórios faltando'
            errors.push(`Player ${family_name}: ${reason}`)
            failedFamilies.push({ user_id: Number(user_id), family_name, reason })
            continue
          }

          // Ignora jogadores fora da aliança quando cache disponível
          if (allianceFamilies.size > 0 && !allianceFamilies.has(normalizeFamilia(family_name))) {
            errorCount++
            const reason = 'Fora da aliança'
            errors.push(`Player ${family_name}: ${reason}`)
            failedFamilies.push({ user_id: Number(user_id), family_name, reason })
            continue
          }

          const gearscore = Math.max(ap, aap) + dp

          // 1. Insere/atualiza player na tabela players
          // 1. Deduplicação: verifica último registro
          const { data: lastArr, error: lastErr } = await supabase
            .from('gearscore_history')
            .select('ap,aap,dp,recorded_at')
            .eq('user_id', parseInt(user_id))
            .order('recorded_at', { ascending: false })
            .limit(1)

          if (lastErr) {
            // Não bloqueia processamento por erro de leitura; segue para inserir
          }

          const last = Array.isArray(lastArr) && lastArr.length > 0 ? lastArr[0] : null
          const prev_ap = last ? Number(last.ap) : undefined
          const prev_aap = last ? Number(last.aap) : undefined
          const prev_dp = last ? Number(last.dp) : undefined
          const prev_gearscore = last ? Math.max(Number(last.ap), Number(last.aap)) + Number(last.dp) : undefined

          if (last && Number(last.ap) === Number(ap) && Number(last.aap) === Number(aap) && Number(last.dp) === Number(dp)) {
            // Sem mudanças -> ignora para manter a data de última atualização real
            skippedCount++
            skippedFamilies.push({
              user_id: Number(user_id),
              family_name,
              ap: Number(ap),
              aap: Number(aap),
              dp: Number(dp),
              gearscore: Number(gearscore),
              prev_ap,
              prev_aap,
              prev_dp,
              prev_gearscore,
              delta_ap: 0,
              delta_aap: 0,
              delta_dp: 0,
              delta_gearscore: 0,
              reason: 'sem mudança'
            })
            continue
          }

          if (dryRun) {
            // Não grava nada, apenas contabiliza como inserção potencial
            successCount++
            insertedFamilies.push({
              user_id: Number(user_id),
              family_name,
              ap: Number(ap),
              aap: Number(aap),
              dp: Number(dp),
              gearscore: Number(gearscore),
              prev_ap,
              prev_aap,
              prev_dp,
              prev_gearscore,
              delta_ap: prev_ap != null ? Number(ap) - prev_ap : undefined,
              delta_aap: prev_aap != null ? Number(aap) - prev_aap : undefined,
              delta_dp: prev_dp != null ? Number(dp) - prev_dp : undefined,
              delta_gearscore: prev_gearscore != null ? Number(gearscore) - prev_gearscore : undefined,
            })
            continue
          }

          // 2. Insere/atualiza player na tabela players
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
            failedFamilies.push({ user_id: Number(user_id), family_name, reason: playerError.message })
            continue
          }

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
            failedFamilies.push({ user_id: Number(user_id), family_name, reason: historyError.message })
            continue
          }

          successCount++
          insertedFamilies.push({ user_id: Number(user_id), family_name, ap: Number(ap), aap: Number(aap), dp: Number(dp), gearscore: Number(gearscore) })
        } catch (playerError) {
          errorCount++
          const reason = 'Erro de processamento'
          errors.push(`Player ${playerData.family_name || 'Desconhecido'}: ${reason}`)
          failedFamilies.push({ user_id: Number((playerData as any)?.user_id), family_name: (playerData as any)?.family_name, reason })
        }
      }

      return NextResponse.json({
        success: true,
        message: `${dryRun ? 'Prévia' : 'Upload'} concluído: ${successCount} inserções, ${skippedCount} sem mudança, ${errorCount} erros`,
        data: {
          dryRun: dryRun ? true : undefined,
          successCount,
          skippedCount,
          errorCount,
          errors: errors.length > 0 ? errors : undefined,
          inserted: insertedFamilies,
          skipped: skippedFamilies,
          failed: failedFamilies
        }
      })

    } else {
      // Dados individuais (comportamento original)
      const { user_id, family_name, character_name, main_class, ap, aap, dp, link_gear } = await request.json()
      
      // Validação robusta: permite 0 e checa null/undefined
      if (
        user_id == null || user_id === '' ||
        family_name == null || family_name === '' ||
        character_name == null || character_name === '' ||
        main_class == null || main_class === '' ||
        ap == null || aap == null || dp == null
      ) {
        return NextResponse.json({
          success: false,
          error: 'Dados obrigatórios não fornecidos'
        }, { status: 400 })
      }

      const gearscore = Math.max(ap, aap) + dp

      // Carrega famílias válidas e bloqueia fora da aliança, se possível
      const allianceFamilies = await getAllianceFamiliesSet()
      if (allianceFamilies.size > 0 && !allianceFamilies.has(normalizeFamilia(family_name))) {
        return NextResponse.json({
          success: false,
          error: 'Família fora da aliança',
          message: `A família "${family_name}" não pertence à aliança no momento`
        }, { status: 400 })
      }

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

      // 2. Deduplicação: verifica último registro e só insere se mudou
      const { data: lastArr, error: lastErr } = await supabase
        .from('gearscore_history')
        .select('ap,aap,dp,recorded_at')
        .eq('user_id', parseInt(user_id))
        .order('recorded_at', { ascending: false })
        .limit(1)

      if (!lastErr) {
        const last = Array.isArray(lastArr) && lastArr.length > 0 ? lastArr[0] : null
        if (last && Number(last.ap) === Number(ap) && Number(last.aap) === Number(aap) && Number(last.dp) === Number(dp)) {
          return NextResponse.json({
            success: true,
            message: 'Sem mudanças no gearscore; histórico não atualizado',
            data: {
              player_id: playerData.id,
              gearscore,
              recorded_at: null,
              skipped: true
            }
          })
        }
      }

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
