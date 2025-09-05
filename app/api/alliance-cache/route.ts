import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Cliente Supabase para cache persistente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// URLs das guildas da aliança
const ALLIANCE_GUILDS = [
  'https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/GuildProfile?guildName=Manifest&region=SA',
  'https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/GuildProfile?guildName=Allyance&region=SA',
  'https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/GuildProfile?guildName=Grand_Order&region=SA'
];

// Interface para membro da aliança
interface AllianceMember {
  familia: string;
  guilda: string;
  isMestre: boolean;
  lastSeen: Date;
}

// Deduplica por família+guilda mantendo o registro mais recente e mestrias
function dedupeMembers(members: AllianceMember[]): AllianceMember[] {
  const map = new Map<string, AllianceMember>();
  for (const m of members) {
    const key = `${(m.familia || '').trim().toLowerCase()}|${(m.guilda || '').trim()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, m);
      continue;
    }
    const newer = (existing.lastSeen?.getTime?.() || 0) < (m.lastSeen?.getTime?.() || 0) ? m : existing;
    map.set(key, {
      ...newer,
      isMestre: Boolean(existing.isMestre || m.isMestre),
    });
  }
  const unique = Array.from(map.values());
  unique.sort((a, b) => (b.lastSeen?.getTime?.() || 0) - (a.lastSeen?.getTime?.() || 0));
  return unique;
}

// Função para obter cache do Supabase
async function getCacheFromSupabase(): Promise<AllianceMember[]> {
  try {
    const { data, error } = await supabase
      .from('alliance_cache')
      .select('*');

    if (error) {
      console.warn('Erro ao buscar cache do Supabase:', error);
      return [];
    }

    const mapped = (data || []).map((item: any) => ({
      familia: item.familia,
      guilda: item.guilda,
      isMestre: Boolean(item.ismestre ?? item.isMestre ?? false),
      lastSeen: new Date(item.lastseen ?? item.lastSeen ?? new Date().toISOString()),
    }));

    // Deduplica e ordena por lastSeen desc
    return dedupeMembers(mapped)
  } catch (error) {
    console.warn('Erro ao buscar cache do Supabase:', error);
    return [];
  }
}

// Função para salvar cache no Supabase
async function saveCacheToSupabase(members: AllianceMember[]): Promise<void> {
  try {
    // Limpa cache antigo
    await supabase.from('alliance_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const unique = dedupeMembers(members);

    // Monta payloads para ambos esquemas de coluna
    const cacheDataSnake = unique.map(member => ({
      familia: member.familia,
      guilda: member.guilda,
      ismestre: member.isMestre,
      lastseen: member.lastSeen.toISOString()
    }));
    const cacheDataCamel = unique.map(member => ({
      familia: member.familia,
      guilda: member.guilda,
      isMestre: member.isMestre,
      lastSeen: member.lastSeen.toISOString()
    }));

    // Tenta snake_case primeiro
    let { error } = await supabase
      .from('alliance_cache')
      .insert(cacheDataSnake);

    if (error) {
      console.warn('Falha ao salvar com snake_case, tentando camelCase...', error)
      const retry = await supabase
        .from('alliance_cache')
        .insert(cacheDataCamel)
      error = retry.error
    }

    if (error) {
      console.error('Erro ao salvar cache no Supabase:', error);
    } else {
      console.log('✅ Cache salvo no Supabase:', unique.length, 'membros');
    }
  } catch (error) {
    console.error('Erro ao salvar cache no Supabase:', error);
  }
}

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
      timeout: 15000 // Aumentado para 15s na Vercel
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
async function updateAllianceCache(): Promise<AllianceMember[]> {
  console.log('🔄 Atualizando cache da aliança...');
  
  const newCache: AllianceMember[] = [];

  // Processa cada guilda
  for (const url of ALLIANCE_GUILDS) {
    const guildName = url.includes('Manifest') ? 'Manifest' : 
                     url.includes('Allyance') ? 'Allyance' : 'Grand_Order';
    
    console.log(`📋 Processando guilda: ${guildName}`);
    const members = await extractGuildMembers(url, guildName);
    
    members.forEach(member => {
      newCache.push({
        ...member,
        lastSeen: new Date()
      });
    });

    console.log(`✅ ${guildName}: ${members.length} membros encontrados`);

    // Delay entre requisições para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aumentado para 2s
  }

  // Se raspagem resultou em 0, tenta usar cache anterior
  if (newCache.length === 0) {
    console.warn('⚠️ Raspagem retornou 0 membros. Tentando usar cache anterior...');
    const previousCache = await getCacheFromSupabase();
    if (previousCache.length > 0) {
      console.log('✅ Usando cache anterior:', previousCache.length, 'membros');
      return previousCache;
    }
  }

  // Deduplica antes de salvar
  const uniqueCache = dedupeMembers(newCache);

  // Salva novo cache no Supabase
  if (uniqueCache.length > 0) {
    await saveCacheToSupabase(uniqueCache);
  }

  console.log(`✅ Cache atualizado: ${uniqueCache.length} membros da aliança`);
  console.log('📊 Distribuição por guilda:');
  
  const guildCounts = uniqueCache.reduce((acc, member) => {
    acc[member.guilda] = (acc[member.guilda] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(guildCounts).forEach(([guild, count]) => {
    console.log(`  ${guild}: ${count} membros`);
  });

  return uniqueCache;
}

// GET: Retorna o cache atual
export async function GET() {
  try {
    // Tenta buscar do Supabase primeiro
    let members = await getCacheFromSupabase();
    
    // Se não há cache ou está muito antigo (mais de 1 hora), força atualização
    const cacheAge = members.length > 0 ? Date.now() - new Date(members[0]?.lastSeen).getTime() : Infinity;
    const isCacheStale = cacheAge > 60 * 60 * 1000; // 1 hora
    
    if (members.length === 0 || isCacheStale) {
      console.log('🔄 Cache vazio ou antigo, forçando atualização...');
      try {
        members = await updateAllianceCache();
      } catch (error) {
        console.error('Erro ao atualizar cache:', error);
        // Retorna cache antigo se disponível
        if (members.length === 0) {
          return NextResponse.json({
            success: false,
            message: 'Erro ao carregar cache da aliança',
            members: [],
            total: 0,
            lastUpdate: null,
            guilds: ['Manifest', 'Allyance', 'Grand_Order']
          }, { status: 500 });
        }
      }
    }

    const unique = dedupeMembers(members);
    return NextResponse.json({
      success: true,
      members: unique,
      total: unique.length,
      lastUpdate: unique.length > 0 ? unique[0].lastSeen : null,
      guilds: ['Manifest', 'Allyance', 'Grand_Order']
    });
  } catch (error) {
    console.error('Erro no GET /api/alliance-cache:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      members: [],
      total: 0,
      lastUpdate: null,
      guilds: ['Manifest', 'Allyance', 'Grand_Order']
    }, { status: 500 });
  }
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
      lastUpdate: new Date()
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
