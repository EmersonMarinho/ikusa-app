import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

// URLs das guildas da aliança
const ALLIANCE_GUILDS = [
  'https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/GuildProfile?guildName=Manifest&region=SA',
  'https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/GuildProfile?guildName=Allyance&region=SA',
  'https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/GuildProfile?guildName=Grand_Order&region=SA'
];

// Cache em memória (em produção seria um banco de dados)
let allianceCache: Array<{
  familia: string;
  guilda: string;
  isMestre: boolean;
  lastSeen: Date;
}> = [];

let lastSuccessfulUpdate: Date | null = null;

// Função para extrair membros de uma guilda
async function extractGuildMembers(url: string, guildName: string): Promise<Array<{
  familia: string;
  guilda: string;
  isMestre: boolean;
}>> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const members: Array<{ familia: string; guilda: string; isMestre: boolean }> = [];

    // Procura por membros da guilda (tentativas com seletores alternativos)
    const pushMember = (familiaText: string, textContext: string) => {
      const familia = (familiaText || '').trim();
      const isMestre = (textContext || '').includes('Mestre');
      if (familia) {
        members.push({ familia, guilda: guildName, isMestre });
      }
    };

    // 1) seletor atual
    $('.guild_name').each((_, el) => pushMember($(el).find('a').first().text(), $(el).text()));

    // 2) fallback: dentro de tabelas conhecidas
    if (members.length === 0) {
      $('.adventure_list_table .guild_name').each((_, el) => pushMember($(el).find('a').first().text(), $(el).text()));
    }

    // 3) fallback genérico em tabelas
    if (members.length === 0) {
      $('table tbody tr').each((_, tr) => {
        const link = $(tr).find('a').first();
        const name = link.text();
        if (name) pushMember(name, $(tr).text());
      });
    }

    return members;
  } catch (error) {
    console.error(`Erro ao extrair membros da guilda ${guildName}:`, error);
    return [];
  }
}

// Função para atualizar o cache da aliança
async function updateAllianceCache() {
  console.log('🔄 Atualizando cache da aliança...');
  
  const newCache: Array<{
    familia: string;
    guilda: string;
    isMestre: boolean;
    lastSeen: Date;
  }> = [];

  // Processa cada guilda
  for (const url of ALLIANCE_GUILDS) {
    const guildName = url.includes('Manifest') ? 'Manifest' : 
                     url.includes('Allyance') ? 'Allyance' : 'Grand_Order';
    
    const members = await extractGuildMembers(url, guildName);
    
    members.forEach(member => {
      newCache.push({
        ...member,
        lastSeen: new Date()
      });
    });

    // Delay entre requisições para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Se raspagem resultou em 0, mantém o cache anterior para evitar apagar dados válidos
  if (newCache.length === 0 && allianceCache.length > 0) {
    console.warn('⚠️ Raspagem retornou 0 membros. Mantendo cache anterior.');
    return allianceCache;
  }

  allianceCache = newCache;
  lastSuccessfulUpdate = new Date();
  console.log(`✅ Cache atualizado: ${allianceCache.length} membros da aliança`);
  console.log('📊 Distribuição por guilda:');
  
  const guildCounts = allianceCache.reduce((acc, member) => {
    acc[member.guilda] = (acc[member.guilda] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(guildCounts).forEach(([guild, count]) => {
    console.log(`  ${guild}: ${count} membros`);
  });

  return allianceCache;
}

// GET: Retorna o cache atual
export async function GET() {
  return NextResponse.json({
    success: true,
    members: allianceCache,
    total: allianceCache.length,
    lastUpdate: lastSuccessfulUpdate,
    guilds: ['Manifest', 'Allyance', 'Grand_Order']
  });
}

// POST: Força atualização do cache
export async function POST() {
  try {
    const updatedCache = await updateAllianceCache();
    
    return NextResponse.json({
      success: true,
      message: 'Cache da aliança atualizado com sucesso',
      members: updatedCache,
      total: updatedCache.length,
      lastUpdate: lastSuccessfulUpdate || new Date()
    });
  } catch (error) {
    console.error('Erro ao atualizar cache da aliança:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar cache da aliança',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// Inicializa o cache na primeira execução
if (allianceCache.length === 0) {
  updateAllianceCache();
}

// Atualiza o cache a cada 2 horas (7200000ms)
setInterval(updateAllianceCache, 7200000);
