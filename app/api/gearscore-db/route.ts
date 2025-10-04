import { NextRequest, NextResponse } from 'next/server'
import { fetchExternalPlayers } from '@/lib/gearscore-external'
import { isValidForStats } from '@/lib/player-filters'

interface Player {
  user_id: string
  family_name: string
  character_name: string
  main_class: string
  ap: number
  aap: number
  dp: number
  gearscore: number
  link_gear?: string | null
  last_updated?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '0')
    const sortBy = (searchParams.get('sortBy') || 'gearscore').toLowerCase()
    const order = (searchParams.get('order') || 'desc').toLowerCase()
    const force = searchParams.get('force') === '1'

    const playersRaw = await fetchExternalPlayers(force)

    // Ordenação e limite
    const validSort: Array<keyof Player> = ['gearscore', 'family_name', 'main_class', 'ap', 'aap', 'dp']
    const s = validSort.includes(sortBy as keyof Player) ? (sortBy as keyof Player) : 'gearscore'

    const playersSorted = playersRaw
      .slice()
      .sort((a: any, b: any) => {
        const av = a[s]
        const bv = b[s]
        if (typeof av === 'string' && typeof bv === 'string') return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return order === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
      })

    const players: Player[] = limit === 0 ? (playersSorted as any) : (playersSorted as any).slice(0, Math.min(limit, 100))

    // Estatísticas básicas
    const playersForStats = players.filter(p => isValidForStats({
      familyName: p.family_name,
      characterName: p.character_name,
      mainClass: p.main_class,
    }))

    const totalPlayers = playersForStats.length
    const totalGearscore = playersForStats.reduce((sum, p) => sum + Number(p.gearscore || 0), 0)
    const averageGearscore = totalPlayers > 0 ? Math.round(totalGearscore / totalPlayers) : 0

    const classDistribution: Record<string, number> = {}
    playersForStats.forEach(p => {
      classDistribution[p.main_class] = (classDistribution[p.main_class] || 0) + 1
    })

    const gearscoreRanges = { '751-800': 0, '801-850': 0, '851-900': 0 }
    playersForStats.forEach(p => {
      const gs = Number(p.gearscore || 0)
      if (gs >= 751 && gs <= 800) gearscoreRanges['751-800']++
      else if (gs >= 801 && gs <= 850) gearscoreRanges['801-850']++
      else if (gs >= 851 && gs <= 900) gearscoreRanges['851-900']++
    })

    return NextResponse.json({
      success: true,
      data: {
        players,
        stats: {
          total_players: totalPlayers,
          average_gearscore: averageGearscore,
          class_distribution: classDistribution,
          gearscore_ranges: gearscoreRanges,
        },
        source: 'mysql'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erro ao consultar DB externo',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}


