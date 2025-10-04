import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para o banco de dados
export interface ProcessLogRecord {
  id: string
  created_at: string
  guild: string
  guilds: string[] | null
  total_geral: number
  total_por_classe: Array<{ classe: string; count: number }>
  classes: Record<string, Array<{ nick: string; familia: string }>>
  classes_by_guild: Record<string, Record<string, Array<{ nick: string; familia: string }>>> | null
  player_stats_by_guild?: Record<string, Record<string, {
    kills: number;
    deaths: number;
    classe: string;
    familia: string;
    kills_vs_chernobyl?: number;
    deaths_vs_chernobyl?: number;
    kills_vs_others?: number;
    deaths_vs_others?: number;
    events?: Array<{ t?: number; tick?: number; time?: string; type: 'kill' | 'death'; opponentNick?: string; opponentGuild?: string }>;
  }>> | null
  kills_by_guild: Record<string, number> | null
  deaths_by_guild: Record<string, number> | null
  kd_ratio_by_guild: Record<string, number> | null
  kills_matrix: Record<string, Record<string, number>> | null
  arquivo_nome: string
  // Novos campos
                territorio: 'Calpheon' | 'Kamasylvia' | 'Siege'
  node: string
  guildas_adversarias: string[]
  event_date?: string | null
  // Tempos (segundos)
  total_node_seconds?: number | null
  lollipop_occupancy_seconds?: number | null
  // Vitória/Derrota
  is_win?: boolean | null
  win_reason?: string | null
}

// Função para inserir log processado
export async function insertProcessedLog(data: Omit<ProcessLogRecord, 'id' | 'created_at'>) {
  try {
    const { data: result, error } = await supabase
      .from('process_logs')
      .insert([data])
      .select()
      .single()

    if (error) {
      console.error('[Supabase] Erro ao inserir em process_logs:', {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      throw error
    }

    return result
  } catch (err) {
    console.error('[Supabase] Exceção no insert process_logs:', err)
    throw err
  }
}

// Função para buscar histórico
export async function getProcessLogsHistory() {
  const { data, error } = await supabase
    .from('process_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar histórico:', error)
    throw error
  }

  return data
}

// Função para buscar log específico por ID
export async function getProcessLogById(id: string) {
  const { data, error } = await supabase
    .from('process_logs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar log:', error)
    throw error
  }

  return data
}

// Função para buscar logs por guilda
export async function getProcessLogsByGuild(guild: string) {
  const { data, error } = await supabase
    .from('process_logs')
    .select('*')
    .or(`guild.eq.${guild},guilds.cs.{${guild}}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar logs por guilda:', error)
    throw error
  }

  return data
}

// Função para buscar logs por território
export async function getProcessLogsByTerritorio(territorio: 'Calpheon' | 'Kamasylvia' | 'Siege') {
  const { data, error } = await supabase
    .from('process_logs')
    .select('*')
    .eq('territorio', territorio)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar logs por território:', error)
    throw error
  }

  return data
}

// Função para buscar logs por node
export async function getProcessLogsByNode(node: string) {
  const { data, error } = await supabase
    .from('process_logs')
    .select('*')
    .ilike('node', `%${node}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar logs por node:', error)
    throw error
  }

  return data
}
