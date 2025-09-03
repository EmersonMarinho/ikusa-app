import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface NodeGearscoreStats {
  node_name: string
  event_date: string
  total_participants: number
  average_gearscore: number
  gearscore_distribution: {
    '751-800': number
    '801-850': number
    '851-900': number
  }
  participants_with_gearscore: Array<{
    family_name: string
    character_name: string
    main_class: string
    gearscore: number
    ap: number
    aap: number
    dp: number
  }>
  participants_without_gearscore: string[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nodeName = searchParams.get('node')
    const eventDate = searchParams.get('date')
    const guild = searchParams.get('guild') || 'lollipop'

    if (!nodeName) {
      return NextResponse.json({
        success: false,
        error: 'Nome da node é obrigatório'
      }, { status: 400 })
    }

    // 1. Busca o log da node específica
    let nodeQuery = supabase
      .from('process_logs')
      .select('*')
      .ilike('node', `%${nodeName}%`)
      .eq('guild', guild)

    if (eventDate) {
      nodeQuery = nodeQuery.eq('event_date', eventDate)
    }

    const { data: nodeLogs, error: nodeError } = await nodeQuery

    if (nodeError) {
      console.error('Erro ao buscar logs da node:', nodeError)
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar logs da node',
        message: nodeError.message
      }, { status: 500 })
    }

    if (!nodeLogs || nodeLogs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum log encontrado para esta node'
      }, { status: 404 })
    }

    // Pega o log mais recente se não especificou data
    const nodeLog = eventDate ? nodeLogs[0] : nodeLogs[0]

    // 2. Extrai todos os nicks que participaram da node
    const participants = new Set<string>()
    
    // Adiciona nicks de todas as classes
    const classesObj = (nodeLog.classes || {}) as Record<string, Array<{ familia: string }>>
    Object.values(classesObj).forEach((classPlayers: Array<{ familia: string }>) => {
      classPlayers.forEach((player: { familia: string }) => {
        participants.add(player.familia)
      })
    })

    // 3. Busca gearscore atual de todos os participants
    const { data: gearscoreData, error: gearscoreError } = await supabase
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

    if (gearscoreError) {
      console.error('Erro ao buscar dados de gearscore:', gearscoreError)
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar dados de gearscore',
        message: gearscoreError.message
      }, { status: 500 })
    }

    // 4. Processa dados de gearscore dos participants
    const participantsWithGearscore: Array<{
      family_name: string
      character_name: string
      main_class: string
      gearscore: number
      ap: number
      aap: number
      dp: number
    }> = []

    const participantsWithoutGearscore: string[] = []

    participants.forEach(familyName => {
      const playerData = gearscoreData?.find(player => 
        player.family_name.toLowerCase() === familyName.toLowerCase()
      )

      if (playerData && playerData.gearscore_history && playerData.gearscore_history.length > 0) {
        // Pega o gearscore mais recente
        const latestGearscore = playerData.gearscore_history.reduce((latest: any, current: any) => 
          new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
        )

        if (latestGearscore.gearscore > 0) {
          participantsWithGearscore.push({
            family_name: playerData.family_name,
            character_name: playerData.character_name,
            main_class: playerData.main_class,
            gearscore: latestGearscore.gearscore,
            ap: latestGearscore.ap,
            aap: latestGearscore.aap,
            dp: latestGearscore.dp
          })
        } else {
          participantsWithoutGearscore.push(familyName)
        }
      } else {
        participantsWithoutGearscore.push(familyName)
      }
    })

    // 5. Calcula estatísticas
    const totalParticipants = participantsWithGearscore.length
    const totalGearscore = participantsWithGearscore.reduce((sum, player) => sum + player.gearscore, 0)
    const averageGearscore = totalParticipants > 0 ? Math.round(totalGearscore / totalParticipants) : 0

    // Distribuição por faixa de gearscore
    const gearscoreDistribution = {
      '751-800': 0,
      '801-850': 0,
      '851-900': 0
    }

    participantsWithGearscore.forEach(player => {
      if (player.gearscore >= 751 && player.gearscore <= 800) gearscoreDistribution['751-800']++
      else if (player.gearscore >= 801 && player.gearscore <= 850) gearscoreDistribution['801-850']++
      else if (player.gearscore >= 851 && player.gearscore <= 900) gearscoreDistribution['851-900']++
    })

    const stats: NodeGearscoreStats = {
      node_name: nodeName,
      event_date: nodeLog.event_date || nodeLog.created_at,
      total_participants: totalParticipants,
      average_gearscore: averageGearscore,
      gearscore_distribution: gearscoreDistribution,
      participants_with_gearscore: participantsWithGearscore.sort((a, b) => b.gearscore - a.gearscore),
      participants_without_gearscore: participantsWithoutGearscore
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Erro ao calcular GS da node:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao calcular GS da node',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
