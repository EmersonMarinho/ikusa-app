import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

// Cache para dados de família
const familyCache = new Map<string, {
  familia: string;
  classes: Array<{
    nick: string;
    classe: string;
    lastSeen: Date;
  }>;
  lastUpdate: Date;
}>();

// Função para buscar dados de uma família
async function getFamilyData(familia: string): Promise<{
  familia: string;
  classes: Array<{
    nick: string;
    classe: string;
    lastSeen: Date;
  }>;
}> {
  try {
    const url = `https://www.sa.playblackdesert.com/pt-BR/Adventure?checkSearchText=True&searchType=1&searchKeyword=${encodeURIComponent(familia)}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const classes: Array<{ nick: string; classe: string; lastSeen: Date }> = [];

    // Procura por personagens da família
    $('.adventure_list_table li').each((index, element) => {
      const nickElement = $(element).find('.character_name a');
      const classeElement = $(element).find('.character_class .name');
      
      if (nickElement.length > 0 && classeElement.length > 0) {
        const nick = nickElement.text().trim();
        const classe = classeElement.text().trim();
        
        if (nick && classe) {
          classes.push({
            nick,
            classe,
            lastSeen: new Date()
          });
        }
      }
    });

    return {
      familia,
      classes
    };
  } catch (error) {
    console.error(`Erro ao buscar dados da família ${familia}:`, error);
    return {
      familia,
      classes: []
    };
  }
}

// Função para buscar dados de múltiplas famílias
async function getMultipleFamiliesData(familias: string[]): Promise<Array<{
  familia: string;
  classes: Array<{
    nick: string;
    classe: string;
    lastSeen: Date;
  }>;
}>> {
  const results: Array<{
    familia: string;
    classes: Array<{
      nick: string;
      classe: string;
      lastSeen: Date;
    }>;
  }> = [];

  // Processa em lotes para não sobrecarregar
  const BATCH_SIZE = 8;
  
  for (let i = 0; i < familias.length; i += BATCH_SIZE) {
    const batch = familias.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (familia) => {
      // Verifica cache primeiro
      if (familyCache.has(familia)) {
        const cached = familyCache.get(familia)!;
        const cacheAge = Date.now() - cached.lastUpdate.getTime();
        
        // Cache válido por 1 hora
        if (cacheAge < 3600000) {
          return cached;
        }
      }
      
      // Busca dados novos
      const data = await getFamilyData(familia);
      
      // Salva no cache
      familyCache.set(familia, {
        ...data,
        lastUpdate: new Date()
      });
      
      return data;
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Sem delay entre lotes para reduzir latência
  }

  return results;
}

// GET: Busca dados de famílias específicas
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const familias = searchParams.get('familias');
  
  if (!familias) {
    return NextResponse.json({
      error: 'Parâmetro "familias" é obrigatório (separado por vírgula)'
    }, { status: 400 });
  }

  const familiaList = familias.split(',').map(f => f.trim()).filter(f => f.length > 0);
  
  if (familiaList.length === 0) {
    return NextResponse.json({
      error: 'Nenhuma família válida fornecida'
    }, { status: 400 });
  }

  try {
    const data = await getMultipleFamiliesData(familiaList);
    
    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      lastUpdate: new Date()
    });
  } catch (error) {
    console.error('Erro ao buscar dados das famílias:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar dados das famílias',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST: Atualiza dados de famílias específicas
export async function POST(request: NextRequest) {
  try {
    const { familias } = await request.json();
    
    if (!Array.isArray(familias)) {
      return NextResponse.json({
        error: 'Campo "familias" deve ser um array'
      }, { status: 400 });
    }

    const data = await getMultipleFamiliesData(familias);
    
    return NextResponse.json({
      success: true,
      message: 'Dados das famílias atualizados com sucesso',
      data,
      total: data.length,
      lastUpdate: new Date()
    });
  } catch (error) {
    console.error('Erro ao atualizar dados das famílias:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao atualizar dados das famílias',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
