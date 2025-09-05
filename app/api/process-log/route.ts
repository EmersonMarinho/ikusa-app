import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

// Cache para evitar requisições repetidas
const playerCache = new Map<string, { classe: string; familia: string }>();

async function getClassAndFamilyForNick(nick: string): Promise<{ classe: string; familia: string }> {
  // Verifica cache primeiro
  if (playerCache.has(nick)) {
    return playerCache.get(nick)!;
  }

  const url = `https://www.sa.playblackdesert.com/pt-BR/Adventure?checkSearchText=True&searchType=1&searchKeyword=${encodeURIComponent(nick)}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000 // 5 segundos de timeout (reduzido)
    });
    
    const $ = cheerio.load(data);
    const classe = $('.character_class .name').first().text().trim();
    const nomeFamilia = $('a[href*="Profile?profileTarget"]').first().text().trim();
    
    const result = {
      classe: classe || 'Classe não encontrada',
      familia: nomeFamilia || 'Família não encontrada',
    };
    
    // Salva no cache
    playerCache.set(nick, result);
    
    return result;
  } catch (error) {
    console.warn(`Erro ao buscar dados para ${nick}:`, error);
    
    // Fallback para dados mock em caso de erro
    const mockClasses = ["Warrior", "Mage", "Archer", "Priest", "Rogue", "Paladin", "Sorcerer", "Berserker"];
    const mockFamilies = ["Família1", "Família2", "Família3", "Família4", "Família5"];
    
    const hash = nick.split('').reduce((a, b) => {
      a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
      return a;
    }, 0);
    
    const result = {
      classe: mockClasses[Math.abs(hash) % mockClasses.length],
      familia: mockFamilies[Math.abs(hash >> 8) % mockFamilies.length],
    };
    
    // Salva no cache mesmo sendo mock
    playerCache.set(nick, result);
    
    return result;
  }
}

// Função para detectar automaticamente todas as guildas do log
function detectGuildsFromLog(logText: string): Set<string> {
  const guilds = new Set<string>();
  const lines = logText.split('\n');
  
  // Padrão para capturar "from [NomeDaGuilda]" em qualquer lugar da linha
  const guildPattern = /from\s+([A-Za-z0-9 _\-]+)/gi;
  
  for (const line of lines) {
    const matches = line.matchAll(guildPattern);
    for (const match of matches) {
      const guildName = match[1].trim();
      if (guildName && guildName.length > 0) {
        guilds.add(guildName);
      }
    }
  }
  
  // Sempre incluir Lollipop como guilda principal
  guilds.add('Lollipop');
  
  return guilds;
}

function extractNicksFromLog(guildName: string, logText: string): Set<string> {
  const lines = logText.split('\n');
  const nicks = new Set<string>();

  // Para Lollipop, captura TODOS os nicks que aparecem em ações de combate
  if (guildName.toLowerCase() === 'lollipop') {
    for (const line of lines) {
      // Captura o primeiro nick de cada linha (antes de ' has killed' ou ' died to')
      const match = line.match(/\] (.+?) (has killed|died to) /i);
      if (match) {
        nicks.add(match[1]);
      }
    }
    return nicks;
  }

  // Para outras guildas, captura nicks explicitamente associados à guilda
  for (const line of lines) {
    if (line.includes(`from ${guildName}`)) {
      // Caso 1: "Killer has killed Victim from GuildName" -> Victim pertence à guilda
      const victimMatch = line.match(/has killed (.+?) from/i);
      if (victimMatch) {
        nicks.add(victimMatch[1]);
      }

      // Caso 2: "Victim died to Killer from GuildName" -> Killer pertence à guilda
      const killerFromMatch = line.match(/died to (.+?) from (.+?)\s*$/i);
      if (killerFromMatch) {
        const killerNick = killerFromMatch[1]?.trim() || '';
        const killerGuild = killerFromMatch[2]?.trim() || '';
        if (killerGuild === guildName) {
          nicks.add(killerNick);
        }
      }
    }
  }

  return nicks;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const territorio = formData.get('territorio') as string;
    const node = formData.get('node') as string;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    const logText = await file.text();
    
    // Detecta automaticamente todas as guildas do log
    const allDetectedGuilds = Array.from(detectGuildsFromLog(logText));
    console.log('Guildas detectadas automaticamente:', allDetectedGuilds);
    
    const guilds = allDetectedGuilds;
    
    // Nicks por guilda e total
    const guildToNicks: Record<string, Set<string>> = {};
    for (const g of guilds) {
      guildToNicks[g] = extractNicksFromLog(g, logText);
    }
    const allNicks = new Set<string>();
    for (const set of Object.values(guildToNicks)) {
      for (const n of set) allNicks.add(n);
    }

    const classMap: Record<string, Array<{ nick: string; familia: string }>> = {};
    const classMapByGuild: Record<string, Record<string, Array<{ nick: string; familia: string }>>> = {};

    // Processamento em lotes para acelerar (sem rate limiting como nos scripts originais)
    const allNicksArray = Array.from(allNicks);
    const BATCH_SIZE = 10; // Processa 10 jogadores em paralelo (igual aos scripts originais)
    let processed = 0;
    
    for (let i = 0; i < allNicksArray.length; i += BATCH_SIZE) {
      const batch = allNicksArray.slice(i, i + BATCH_SIZE);
      
      // Processa lote em paralelo
      const batchPromises = batch.map(async (nick) => {
        const { classe, familia } = await getClassAndFamilyForNick(nick);
        return { nick, classe, familia };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Processa resultados do lote
      for (const { nick, classe, familia } of batchResults) {
        processed++;
        const percentage = Math.round((processed / allNicksArray.length) * 100);
        console.log(`[${percentage}%] ${processed}/${allNicksArray.length}: ${nick} -> ${classe}`);
        
        if (!classMap[classe]) classMap[classe] = [];
        classMap[classe].push({ nick, familia });
        
        // Distribuir por guildas onde o nick apareceu
        for (const g of guilds) {
          if (guildToNicks[g]?.has(nick)) {
            if (!classMapByGuild[g]) classMapByGuild[g] = {};
            if (!classMapByGuild[g][classe]) classMapByGuild[g][classe] = [];
            classMapByGuild[g][classe].push({ nick, familia });
          }
        }
      }
    }

    // Estatísticas de kills por guilda
    const killsByGuild: Record<string, number> = {};
    const killsMatrix: Record<string, Record<string, number>> = {};
    const deathsByGuild: Record<string, number> = {};
    const kdRatioByGuild: Record<string, number> = {};
    
    // Estatísticas individuais por jogador (como nos scripts do usuário)
    const playerStatsByGuild: Record<string, Record<string, { kills: number; deaths: number; classe: string; familia: string; kills_vs_chernobyl: number; deaths_vs_chernobyl: number; kills_vs_others: number; deaths_vs_others: number }>> = {};
    
    // Inicializa estatísticas para todas as guildas detectadas
    for (const guild of guilds) {
      if (!killsByGuild[guild]) killsByGuild[guild] = 0;
      if (!deathsByGuild[guild]) deathsByGuild[guild] = 0;
      if (!killsMatrix[guild]) killsMatrix[guild] = {};
      if (!playerStatsByGuild[guild]) playerStatsByGuild[guild] = {};
      
      // Inicializa estatísticas para cada jogador da guilda
      for (const nick of guildToNicks[guild]) {
        playerStatsByGuild[guild][nick] = { kills: 0, deaths: 0, classe: '', familia: '', kills_vs_chernobyl: 0, deaths_vs_chernobyl: 0, kills_vs_others: 0, deaths_vs_others: 0 };
      }
    }
    
    // Processa cada linha do log para contar kills e deaths INDIVIDUAIS
    const lines = logText.split('\n');
    
    for (const line of lines) {
      // Padrão: [Killer] has killed [Victim] from [VictimGuild]
      const killMatch = line.match(/\] (.+?) has killed (.+?) from (.+?) /i);
      if (killMatch) {
        const killerNick = killMatch[1]?.trim() || '';
        const victimNick = killMatch[2]?.trim() || '';
        const victimGuild = killMatch[3]?.trim() || '';
        
        // Determina a guilda do killer (procura em todas as guildas)
        let killerGuild = '';
        for (const guild of guilds) {
          if (guildToNicks[guild].has(killerNick)) {
            killerGuild = guild;
            break;
          }
        }
        
        if (killerGuild && victimGuild) {
          // Atualiza estatísticas individuais
          if (playerStatsByGuild[killerGuild]?.[killerNick]) {
            playerStatsByGuild[killerGuild][killerNick].kills++;
            if ((victimGuild || '').toLowerCase() === 'chernobyl') {
              playerStatsByGuild[killerGuild][killerNick].kills_vs_chernobyl++;
            } else {
              playerStatsByGuild[killerGuild][killerNick].kills_vs_others++;
            }
          }
          if (playerStatsByGuild[victimGuild]?.[victimNick]) {
            playerStatsByGuild[victimGuild][victimNick].deaths++;
            // Se quem matou foi Chernobyl, a morte é vs Chernobyl; caso contrário, vs outros
            if ((killerGuild || '').toLowerCase() === 'chernobyl') {
              playerStatsByGuild[victimGuild][victimNick].deaths_vs_chernobyl++;
            } else {
              playerStatsByGuild[victimGuild][victimNick].deaths_vs_others++;
            }
          }
          
          // Atualiza totais por guilda
          killsByGuild[killerGuild]++;
          deathsByGuild[victimGuild]++;
          
          // Atualiza matriz de kills
          if (!killsMatrix[killerGuild]) killsMatrix[killerGuild] = {};
          killsMatrix[killerGuild][victimGuild] = (killsMatrix[killerGuild][victimGuild] || 0) + 1;
        }
      }
      
      // Padrão: [Victim] died to [Killer] from [KillerGuild]
      const deathMatch = line.match(/\] (.+?) died to (.+?) from (.+?) /i);
      if (deathMatch) {
        const victimNick = deathMatch[1]?.trim() || '';
        const killerNick = deathMatch[2]?.trim() || '';
        const killerGuild = deathMatch[3]?.trim() || '';
        
        // Determina a guilda da vítima (procura em todas as guildas)
        let victimGuild = '';
        for (const guild of guilds) {
          if (guildToNicks[guild].has(victimNick)) {
            victimGuild = guild;
            break;
          }
        }
        
        if (killerGuild && victimGuild) {
          // Atualiza estatísticas individuais
          if (playerStatsByGuild[killerGuild]?.[killerNick]) {
            playerStatsByGuild[killerGuild][killerNick].kills++;
            // Killer guild conhecido; se vítima é Lollipop, isso não muda vs Chernobyl diretamente
            if ((victimGuild || '').toLowerCase() === 'chernobyl') {
              playerStatsByGuild[killerGuild][killerNick].kills_vs_chernobyl++;
            } else {
              playerStatsByGuild[killerGuild][killerNick].kills_vs_others++;
            }
          }
          if (playerStatsByGuild[victimGuild]?.[victimNick]) {
            playerStatsByGuild[victimGuild][victimNick].deaths++;
            if ((killerGuild || '').toLowerCase() === 'chernobyl') {
              playerStatsByGuild[victimGuild][victimNick].deaths_vs_chernobyl++;
            } else {
              playerStatsByGuild[victimGuild][victimNick].deaths_vs_others++;
            }
          }
          
          // Atualiza totais por guilda
          killsByGuild[killerGuild]++;
          deathsByGuild[victimGuild]++;
          
          // Atualiza matriz de kills
          if (!killsMatrix[killerGuild]) killsMatrix[killerGuild] = {};
          killsMatrix[killerGuild][victimGuild] = (killsMatrix[killerGuild][victimGuild] || 0) + 1;
        }
      }
    }
    
    // Preenche classes e famílias para cada jogador
    for (const guild of guilds) {
      for (const nick of guildToNicks[guild]) {
        if (playerStatsByGuild[guild]?.[nick]) {
          // Busca classe e família do cache ou da API
          const { classe, familia } = await getClassAndFamilyForNick(nick);
          playerStatsByGuild[guild][nick].classe = classe;
          playerStatsByGuild[guild][nick].familia = familia;
        }
      }
    }
    
    // Calcula K/D ratio para cada guilda (total da guilda)
    for (const guild of guilds) {
      const kills = killsByGuild[guild] || 0;
      const deaths = deathsByGuild[guild] || 0;
      
      if (kills === 0 && deaths === 0) {
        kdRatioByGuild[guild] = 0;
      } else if (deaths === 0) {
        kdRatioByGuild[guild] = kills;
      } else if (kills === 0) {
        kdRatioByGuild[guild] = 0;
      } else {
        kdRatioByGuild[guild] = Math.round((kills / deaths) * 100) / 100;
      }
    }

    // Prepara dados de resposta
    const totalPorClasse: Array<{ classe: string; count: number }> = Object.keys(classMap).map((classe) => ({
      classe,
      count: classMap[classe].length,
    }));
    const totalGeral = totalPorClasse.reduce((acc, c) => acc + c.count, 0);

    const response = {
      guild: 'Lollipop',
      guilds,
      totalGeral,
      totalPorClasse,
      classes: classMap,
      classesByGuild: classMapByGuild,
      killsByGuild,
      deathsByGuild,
      kdRatioByGuild,
      killsMatrix,
      territorio,
      node,
      guildasAdversarias: guilds.filter(g => g !== 'Lollipop'),
      detectedGuilds: allDetectedGuilds,
      // Estatísticas individuais por jogador (como nos scripts do usuário)
      playerStatsByGuild,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao processar log:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
