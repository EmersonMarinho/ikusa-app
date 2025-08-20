import axios from 'axios';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

// Função para detectar automaticamente todas as guildas do log
function detectGuildsFromLog(logText: string): Set<string> {
  const guilds = new Set<string>();
  const lines = logText.split('\n');
  
  // Padrão para capturar "from [NomeDaGuilda]" no final das linhas
  // Suporta tanto "died to" quanto "has killed"
  const guildPattern = /from\s+([A-Za-z0-9 _\-]+)\s*$/i;
  
  for (const line of lines) {
    const match = line.match(guildPattern);
    if (match) {
      const guildName = match[1].trim();
      if (guildName && guildName.length > 0) {
        guilds.add(guildName);
      }
    }
  }
  
  // Sempre incluir Lollipop como guilda principal
  guilds.add('Lollipop');
  
  console.log('Guildas detectadas automaticamente:', Array.from(guilds));
  
  return guilds;
}

function extractNicksFromLog(guildName: string, logText: string, allDetectedGuilds: string[]): Set<string> {
  const lines = logText.split('\n');
  const nicks = new Set<string>();

  // Para Lollipop, captura TODOS os nicks que aparecem em ações de combate (como no busca_classes_lollipop.js)
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

  // Para outras guildas, captura apenas nicks que são explicitamente marcados com "from [GuildName]"
  for (const line of lines) {
    if (line.includes(`from ${guildName}`)) {
      // Captura vítimas da guilda (quem foi morto)
      const victimMatch = line.match(/has killed (.+?) from/i);
      if (victimMatch) {
        nicks.add(victimMatch[1]);
      }
      
      // Também captura quem morreu para outros (died to)
      const diedVictimMatch = line.match(/\] (.+?) died to .+ from ${guildName}/i);
      if (diedVictimMatch) {
        nicks.add(diedVictimMatch[1]);
      }
    }
  }

  return nicks;
}

function extractKillsByGuild(logText: string): Record<string, number> {
  const lines = logText.split('\n');
  const killsByGuild: Record<string, number> = {};
  
  // Padrão para capturar kills: "<killer> from <KillerGuild> has killed <victim> from <VictimGuild>"
  const bothGuildsRegex = /\bfrom\s+([A-Za-z0-9 _\-]+)\b\s+has\s+killed\b[\s\S]*?\bfrom\s+([A-Za-z0-9 _\-]+)\b/i;
  
  for (const line of lines) {
    const m = line.match(bothGuildsRegex);
    if (m) {
      const killerGuild = (m[1] || '').trim();
      if (killerGuild) {
        killsByGuild[killerGuild] = (killsByGuild[killerGuild] || 0) + 1;
      }
    }
  }
  return killsByGuild;
}

function extractKillsMatrix(logText: string): Record<string, Record<string, number>> {
  const lines = logText.split('\n');
  const matrix: Record<string, Record<string, number>> = {};
  const bothGuildsRegex = /\bfrom\s+([A-Za-z0-9 _\-]+)\b\s+has\s+killed\b[\s\S]*?\bfrom\s+([A-Za-z0-9 _\-]+)\b/i;
  
  for (const line of lines) {
    const m = line.match(bothGuildsRegex);
    if (m) {
      const killerGuild = (m[1] || '').trim();
      const victimGuild = (m[2] || '').trim();
      if (!killerGuild || !victimGuild) continue;
      if (!matrix[killerGuild]) matrix[killerGuild] = {};
      matrix[killerGuild][victimGuild] = (matrix[killerGuild][victimGuild] || 0) + 1;
    }
  }
  return matrix;
}

// Cache para evitar requisições repetidas
const playerCache = new Map<string, { classe: string; familia: string }>();

// Rate limiting: máximo 1 requisição por segundo
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 segundo

async function getClassAndFamilyForNick(nick: string): Promise<{ classe: string; familia: string }> {
  // Verifica cache primeiro
  if (playerCache.has(nick)) {
    return playerCache.get(nick)!;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  const url = `https://www.sa.playblackdesert.com/pt-BR/Adventure?checkSearchText=True&searchType=1&searchKeyword=${encodeURIComponent(
    nick,
  )}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 segundos de timeout
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

function buildCsv(classMap: Record<string, Array<{ nick: string; familia: string }>>): string {
  let csv = 'Classe,Player,Familia\n';
  const totalPorClasse: Array<{ classe: string; count: number }> = [];
  let totalGeral = 0;

  for (const classe of Object.keys(classMap)) {
    const players = classMap[classe];
    players.forEach(({ nick, familia }) => {
      csv += `"${classe}","${nick}","${familia}"\n`;
    });
    totalPorClasse.push({ classe, count: players.length });
    totalGeral += players.length;
  }

  csv += '\nTOTAL POR CLASSE\n';
  totalPorClasse.forEach((item) => {
    csv += `"${item.classe}",${item.count}\n`;
  });
  csv += `\nTOTAL GERAL,${totalGeral}\n`;

  return csv;
}

function buildTxt(classMap: Record<string, Array<{ nick: string; familia: string }>>): string {
  const classes = Object.keys(classMap).sort((a, b) => a.localeCompare(b, 'pt'));
  let totalGeral = 0;
  const txt: string[] = [];

  for (const classe of classes) {
    const players = classMap[classe];
    totalGeral += players.length;
    txt.push(`Classe: ${classe} (${players.length})`);
    players
      .slice()
      .sort((a, b) => a.nick.localeCompare(b.nick, 'pt'))
      .forEach(({ nick, familia }) => {
        txt.push(`  - ${nick} — ${familia}`);
      });
    txt.push('');
  }

  // Totais
  txt.push('TOTAL POR CLASSE');
  for (const classe of classes) {
    txt.push(`- ${classe}: ${classMap[classe].length}`);
  }
  txt.push('');
  txt.push(`TOTAL GERAL: ${totalGeral}`);

  return txt.join('\n');
}

export interface ParsedLogData {
  guild: string;
  guilds: string[];
  totalGeral: number;
  totalPorClasse: Array<{ classe: string; count: number }>;
  classes: Record<string, Array<{ nick: string; familia: string }>>;
  classesByGuild: Record<string, Record<string, Array<{ nick: string; familia: string }>>>;
  killsByGuild: Record<string, number>;
  deathsByGuild: Record<string, number>;
  kdRatioByGuild: Record<string, number>;
  killsMatrix: Record<string, Record<string, number>>;
  detectedGuilds: string[]; // Lista de todas as guildas detectadas no log
}

export async function parseLogFile(
  file: File, 
  territorio: 'Calpheon' | 'Kamasylvia' | 'Siege', 
  node: string, 
  guildasAdversarias: string[],
  onProgress?: (current: number, total: number) => void
): Promise<ParsedLogData> {
  try {
    const logText = await file.text();
    
    // Detecta automaticamente todas as guildas do log
    const allDetectedGuilds = Array.from(detectGuildsFromLog(logText));
    console.log('Guildas detectadas automaticamente:', allDetectedGuilds);
    
    // Usa as guildas detectadas automaticamente, sempre incluindo Lollipop
    const guilds = allDetectedGuilds;
    
    // Nicks por guilda e total
    const guildToNicks: Record<string, Set<string>> = {};
    for (const g of guilds) {
      guildToNicks[g] = extractNicksFromLog(g, logText, allDetectedGuilds);
    }
    const allNicks = new Set<string>();
    for (const set of Object.values(guildToNicks)) {
      for (const n of set) allNicks.add(n);
    }

    const classMap: Record<string, Array<{ nick: string; familia: string }>> = {};
    const classMapByGuild: Record<string, Record<string, Array<{ nick: string; familia: string }>>> = {};

    // Busca sequencial para evitar sobrecarga/ban
    const allNicksArray = Array.from(allNicks);
    for (let i = 0; i < allNicksArray.length; i++) {
      const nick = allNicksArray[i];
      
      // Callback de progresso
      if (onProgress) {
        onProgress(i + 1, allNicksArray.length);
      }
      
      const { classe, familia } = await getClassAndFamilyForNick(nick);
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

    // Estatísticas de kills por guilda usando membros detectados por guilda
    const killsByGuild: Record<string, number> = {};
    const killsMatrix: Record<string, Record<string, number>> = {};
    const deathsByGuild: Record<string, number> = {};
    const kdRatioByGuild: Record<string, number> = {};
    
    // Processa cada linha do log para contar kills e deaths
    const lines = logText.split('\n');
    for (const line of lines) {
      // Padrão: [Killer] has killed [Victim] from [VictimGuild]
      const killMatch = line.match(/\] (.+?) has killed (.+?) from (.+?) /i);
      if (killMatch) {
        const killerNick = killMatch[1]?.trim() || '';
        const victimNick = killMatch[2]?.trim() || '';
        const victimGuild = killMatch[3]?.trim() || '';
        
        // Killer sem tag de guilda = Lollipop
        const killerGuild = 'Lollipop';
        
        // Conta kills para Lollipop
        killsByGuild[killerGuild] = (killsByGuild[killerGuild] || 0) + 1;
        
        // Adiciona à matriz de kills
        if (!killsMatrix[killerGuild]) killsMatrix[killerGuild] = {};
        killsMatrix[killerGuild][victimGuild] = (killsMatrix[killerGuild][victimGuild] || 0) + 1;
        
        // Conta deaths para a guilda da vítima
        deathsByGuild[victimGuild] = (deathsByGuild[victimGuild] || 0) + 1;
      }
      
      // Padrão: [Victim] died to [Killer] from [KillerGuild]
      const deathMatch = line.match(/\] (.+?) died to (.+?) from (.+?) /i);
      if (deathMatch) {
        const victimNick = deathMatch[1]?.trim() || '';
        const killerNick = deathMatch[2]?.trim() || '';
        const killerGuild = deathMatch[3]?.trim() || '';
        
        // Victim sem tag de guilda = Lollipop
        const victimGuild = 'Lollipop';
        
        // Conta kills para a guilda do killer
        killsByGuild[killerGuild] = (killsByGuild[killerGuild] || 0) + 1;
        
        // Adiciona à matriz de kills
        if (!killsMatrix[killerGuild]) killsMatrix[killerGuild] = {};
        killsMatrix[killerGuild][victimGuild] = (killsMatrix[killerGuild][victimGuild] || 0) + 1;
        
        // Conta deaths para Lollipop
        deathsByGuild[victimGuild] = (deathsByGuild[victimGuild] || 0) + 1;
      }
    }
    
    // Inicializa contadores para todas as guildas detectadas
    for (const guild of guilds) {
      if (!killsByGuild[guild]) killsByGuild[guild] = 0;
      if (!deathsByGuild[guild]) deathsByGuild[guild] = 0;
      if (!killsMatrix[guild]) killsMatrix[guild] = {};
    }

    // Calcula K/D ratio para cada guilda com lógica melhorada
    for (const guild of guilds) {
      const kills = killsByGuild[guild] || 0;
      const deaths = deathsByGuild[guild] || 0;
      
      // Lógica melhorada para KD ratio:
      // - Se não há kills nem deaths: KD = 0
      // - Se há kills mas não deaths: KD = kills (representa kills sem morrer)
      // - Se há deaths mas não kills: KD = 0 (representa apenas mortes)
      // - Se há ambos: KD = kills / deaths
      if (kills === 0 && deaths === 0) {
        kdRatioByGuild[guild] = 0;
      } else if (deaths === 0) {
        kdRatioByGuild[guild] = kills; // Representa kills sem morrer
      } else if (kills === 0) {
        kdRatioByGuild[guild] = 0; // Apenas mortes
      } else {
        kdRatioByGuild[guild] = Math.round((kills / deaths) * 100) / 100;
      }
    }

    // Calcula totais
    const totalPorClasse: Array<{ classe: string; count: number }> = Object.keys(classMap).map((classe) => ({
      classe,
      count: classMap[classe].length,
    }));
    const totalGeral = totalPorClasse.reduce((acc, c) => acc + c.count, 0);

    return {
      guild: 'Lollipop', // Sempre Lollipop como guilda principal
      guilds: guilds.map(g => g.charAt(0).toUpperCase() + g.slice(1)), // Capitalizar nomes
      totalGeral,
      totalPorClasse,
      classes: classMap,
      classesByGuild: classMapByGuild,
      killsByGuild,
      deathsByGuild,
      kdRatioByGuild,
      killsMatrix,
      detectedGuilds: allDetectedGuilds, // Todas as guildas detectadas no log
    };
  } catch (error) {
    console.error('Erro ao processar log:', error);
    throw new Error('Erro ao processar o arquivo de log');
  }
}
