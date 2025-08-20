import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Interface para dados de combate
interface CombatData {
  player: string;
  familia: string;
  guilda: string;
  kills: number;
  deaths: number;
  killsVsChernobyl: number;
  deathsVsChernobyl: number;
  killsVsOthers: number;
  deathsVsOthers: number;
}

// Função para calcular K/D específicos
function calculateSpecificKD(combatLog: string): Array<CombatData> {
  const lines = combatLog.split('\n');
  const playerStats = new Map<string, CombatData>();

  for (const line of lines) {
    // Padrão: [Killer] has killed [Victim] from [VictimGuild]
    const killMatch = line.match(/\] (.+?) has killed (.+?) from (.+?) /i);
    if (killMatch) {
      const killerNick = killMatch[1]?.trim() || '';
      const victimNick = killMatch[2]?.trim() || '';
      const victimGuild = killMatch[3]?.trim() || '';
      
      // Determina a guilda do killer (assume Lollipop se não especificado)
      const killerGuild = 'Lollipop'; // Para simplificar, assume que killers são da aliança
      
      // Atualiza estatísticas do killer
      if (!playerStats.has(killerNick)) {
        playerStats.set(killerNick, {
          player: killerNick,
          familia: '', // Será preenchido depois
          guilda: killerGuild,
          kills: 0,
          deaths: 0,
          killsVsChernobyl: 0,
          deathsVsChernobyl: 0,
          killsVsOthers: 0,
          deathsVsOthers: 0
        });
      }
      
      const killerStats = playerStats.get(killerNick)!;
      killerStats.kills++;
      
      if (victimGuild.toLowerCase() === 'chernobyl') {
        killerStats.killsVsChernobyl++;
      } else {
        killerStats.killsVsOthers++;
      }
    }
    
    // Padrão: [Victim] died to [Killer] from [KillerGuild]
    const deathMatch = line.match(/\] (.+?) died to (.+?) from (.+?) /i);
    if (deathMatch) {
      const victimNick = deathMatch[1]?.trim() || '';
      const killerNick = deathMatch[2]?.trim() || '';
      const killerGuild = deathMatch[3]?.trim() || '';
      
      // Determina a guilda da vítima (assume Lollipop se não especificado)
      const victimGuild = 'Lollipop'; // Para simplificar, assume que vítimas são da aliança
      
      // Atualiza estatísticas da vítima
      if (!playerStats.has(victimNick)) {
        playerStats.set(victimNick, {
          player: victimNick,
          familia: '', // Será preenchido depois
          guilda: victimGuild,
          kills: 0,
          deaths: 0,
          killsVsChernobyl: 0,
          deathsVsChernobyl: 0,
          killsVsOthers: 0,
          deathsVsOthers: 0
        });
      }
      
      const victimStats = playerStats.get(victimNick)!;
      victimStats.deaths++;
      
      if (killerGuild.toLowerCase() === 'chernobyl') {
        victimStats.deathsVsChernobyl++;
      } else {
        victimStats.deathsVsOthers++;
      }
    }
  }

  return Array.from(playerStats.values());
}

// Função para calcular K/D ratios
function calculateKDRatios(playerStats: CombatData[]) {
  return playerStats.map(player => ({
    ...player,
    kdOverall: player.deaths > 0 ? (player.kills / player.deaths) : player.kills > 0 ? Infinity : 0,
    kdVsChernobyl: player.deathsVsChernobyl > 0 ? (player.killsVsChernobyl / player.deathsVsChernobyl) : player.killsVsChernobyl > 0 ? Infinity : 0,
    kdVsOthers: player.deathsVsOthers > 0 ? (player.killsVsOthers / player.deathsVsOthers) : player.killsVsOthers > 0 ? Infinity : 0
  }));
}

// Função para filtrar por critérios específicos
function filterPlayers(playerStats: any[], filters: {
  minKills?: number;
  minKdOverall?: number;
  minKdVsChernobyl?: number;
  minKdVsOthers?: number;
  guilda?: string;
}) {
  return playerStats.filter(player => {
    if (filters.minKills && player.kills < filters.minKills) return false;
    if (filters.minKdOverall && player.kdOverall < filters.minKdOverall) return false;
    if (filters.minKdVsChernobyl && player.kdVsChernobyl < filters.minKdVsChernobyl) return false;
    if (filters.minKdVsOthers && player.kdVsOthers < filters.minKdVsOthers) return false;
    if (filters.guilda && player.guilda !== filters.guilda) return false;
    return true;
  });
}

// GET: Calcula K/D específicos baseado no log
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const combatLog = searchParams.get('combatLog');
  const minKills = searchParams.get('minKills');
  const minKdOverall = searchParams.get('minKdOverall');
  const minKdVsChernobyl = searchParams.get('minKdVsChernobyl');
  const minKdVsOthers = searchParams.get('minKdVsOthers');
  const guilda = searchParams.get('guilda');
  
  if (!combatLog) {
    return NextResponse.json({
      error: 'Parâmetro "combatLog" é obrigatório'
    }, { status: 400 });
  }

  try {
    // Calcula estatísticas base
    const playerStats = calculateSpecificKD(combatLog);
    
    // Calcula K/D ratios
    const playerStatsWithKD = calculateKDRatios(playerStats);
    
    // Aplica filtros
    const filters = {
      minKills: minKills ? parseInt(minKills) : undefined,
      minKdOverall: minKdOverall ? parseFloat(minKdOverall) : undefined,
      minKdVsChernobyl: minKdVsChernobyl ? parseFloat(minKdVsChernobyl) : undefined,
      minKdVsOthers: minKdVsOthers ? parseFloat(minKdVsOthers) : undefined,
      guilda: guilda || undefined
    };
    
    const filteredStats = filterPlayers(playerStatsWithKD, filters);
    
    // Ordena por K/D geral (decrescente)
    const sortedStats = filteredStats.sort((a, b) => b.kdOverall - a.kdOverall);
    
    return NextResponse.json({
      success: true,
      data: sortedStats,
      total: sortedStats.length,
      filters: filters,
      summary: {
        totalPlayers: playerStatsWithKD.length,
        filteredPlayers: filteredStats.length,
        topKillers: sortedStats.slice(0, 5).map(p => ({ player: p.player, kills: p.kills, kd: p.kdOverall })),
        topVsChernobyl: sortedStats
          .filter(p => p.killsVsChernobyl > 0)
          .sort((a, b) => b.kdVsChernobyl - a.kdVsChernobyl)
          .slice(0, 5)
          .map(p => ({ player: p.player, kills: p.killsVsChernobyl, kd: p.kdVsChernobyl }))
      }
    });
  } catch (error) {
    console.error('Erro ao calcular K/D específicos:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao calcular K/D específicos',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST: Processa log completo e retorna estatísticas
export async function POST(request: NextRequest) {
  try {
    const { combatLog, filters = {} } = await request.json();
    
    if (!combatLog) {
      return NextResponse.json({
        error: 'Campo "combatLog" é obrigatório'
      }, { status: 400 });
    }

    // Calcula estatísticas base
    const playerStats = calculateSpecificKD(combatLog);
    
    // Calcula K/D ratios
    const playerStatsWithKD = calculateKDRatios(playerStats);
    
    // Aplica filtros
    const filteredStats = filterPlayers(playerStatsWithKD, filters);
    
    // Ordena por K/D geral (decrescente)
    const sortedStats = filteredStats.sort((a, b) => b.kdOverall - a.kdOverall);
    
    return NextResponse.json({
      success: true,
      data: sortedStats,
      total: sortedStats.length,
      filters: filters,
      summary: {
        totalPlayers: playerStatsWithKD.length,
        filteredPlayers: filteredStats.length,
        topKillers: sortedStats.slice(0, 10).map(p => ({ player: p.player, kills: p.kills, kd: p.kdOverall })),
        topVsChernobyl: sortedStats
          .filter(p => p.killsVsChernobyl > 0)
          .sort((a, b) => b.kdVsChernobyl - a.kdVsChernobyl)
          .slice(0, 10)
          .map(p => ({ player: p.player, kills: p.killsVsChernobyl, kd: p.kdVsChernobyl }))
      }
    });
  } catch (error) {
    console.error('Erro ao processar log:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar log',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
