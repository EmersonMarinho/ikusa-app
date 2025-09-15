import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Interface para KDA mensal por jogador
export interface MonthlyKDARecord {
  id: string
  created_at: string
  updated_at: string
  month_year: string // formato: "2024-12", "2025-01"
  player_nick: string
  player_familia: string
  guilda: string // Manifest, Allyance, Grand_Order
  
  // Estatísticas por classe
  classes_played: Array<{
    classe: string
    kills: number
    deaths: number
    kills_vs_chernobyl: number
    deaths_vs_chernobyl: number
    kills_vs_others: number
    deaths_vs_others: number
    last_played: string
  }>
  
  // Totais consolidados
  total_kills: number
  total_deaths: number
  total_kills_vs_chernobyl: number
  total_deaths_vs_chernobyl: number
  total_kills_vs_others: number
  total_deaths_vs_others: number
  
  // K/D ratios calculados
  kd_overall: number
  kd_vs_chernobyl: number
  kd_vs_others: number
  
  // Metadados
  logs_processed: string[] // IDs dos logs processados para este mês
  last_log_processed_at: string
}

// Interface para configuração mensal
export interface MonthlyConfig {
  id: string
  month_year: string
  is_active: boolean
  reset_date: string
  total_logs_processed: number
  alliance_members_tracked: number
}

// Função para obter configuração do mês atual
export async function getCurrentMonthConfig(): Promise<MonthlyConfig | null> {
  const currentMonth = new Date().toISOString().slice(0, 7) // "2024-12"
  
  const { data, error } = await supabase
    .from('monthly_kda_config')
    .select('*')
    .eq('month_year', currentMonth)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Erro ao buscar configuração mensal:', error)
    throw error
  }

  return data
}

// Função para iniciar novo mês
export async function initializeNewMonth(): Promise<MonthlyConfig> {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const resetDate = new Date().toISOString()
  
  // Desativa mês anterior se existir
  await supabase
    .from('monthly_kda_config')
    .update({ is_active: false })
    .neq('month_year', currentMonth)

  const newConfig = {
    month_year: currentMonth,
    is_active: true,
    reset_date: resetDate,
    total_logs_processed: 0,
    alliance_members_tracked: 0
  }

  const { data, error } = await supabase
    .from('monthly_kda_config')
    .upsert([newConfig])
    .select()
    .single()

  if (error) {
    console.error('Erro ao inicializar novo mês:', error)
    throw error
  }

  return data
}

// Função para buscar KDA mensal de um jogador
export async function getPlayerMonthlyKDA(
  playerNick: string, 
  monthYear?: string
): Promise<MonthlyKDARecord | null> {
  const targetMonth = monthYear || new Date().toISOString().slice(0, 7)
  
  const { data, error } = await supabase
    .from('monthly_kda')
    .select('*')
    .eq('player_nick', playerNick)
    .eq('month_year', targetMonth)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar KDA do jogador:', error)
    throw error
  }

  return data
}

// Função para atualizar KDA mensal de um jogador
export async function updatePlayerMonthlyKDA(
  playerData: Omit<MonthlyKDARecord, 'id' | 'created_at' | 'updated_at'>
): Promise<MonthlyKDARecord> {
  // Garante que campos proibidos não sejam enviados ao banco
  const { id: _omitId, created_at: _omitCreated, updated_at: _omitUpdated, ...cleanData } = playerData as any

  const existingRecord = await getPlayerMonthlyKDA(cleanData.player_nick, cleanData.month_year)
  
  if (existingRecord) {
    // Atualiza registro existente
    const updatedData = {
      ...cleanData,
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('monthly_kda')
      .update(updatedData)
      .eq('id', existingRecord.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar KDA:', error)
      throw error
    }

    return data
  } else {
    // Cria novo registro
    const newData = {
      ...cleanData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('monthly_kda')
      .insert([newData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar KDA:', error)
      throw error
    }

    return data
  }
}

// Função para buscar KDA de todos os jogadores do mês
export async function getAllPlayersMonthlyKDA(monthYear?: string): Promise<MonthlyKDARecord[]> {
  const targetMonth = monthYear || new Date().toISOString().slice(0, 7)
  
  const { data, error } = await supabase
    .from('monthly_kda')
    .select('*')
    .eq('month_year', targetMonth)
    .order('total_kills', { ascending: false })

  if (error) {
    console.error('Erro ao buscar KDA de todos os jogadores:', error)
    throw error
  }

  return data || []
}

// Função para buscar histórico de meses
export async function getMonthlyHistory(): Promise<MonthlyConfig[]> {
  const { data, error } = await supabase
    .from('monthly_kda_config')
    .select('*')
    .order('month_year', { ascending: false })

  if (error) {
    console.error('Erro ao buscar histórico mensal:', error)
    throw error
  }

  return data || []
}

// Função para buscar logs da aliança por período
export async function getAllianceLogsByMonth(
  monthYear: string,
  options?: { includeSiege?: boolean }
): Promise<any[]> {
  // Calcula início e fim reais do mês (evita datas inválidas como dia 31 em meses com 30 dias)
  let startDate = `${monthYear}-01T00:00:00Z`
  let endDate = `${monthYear}-31T23:59:59Z`
  try {
    const [yearStr, monthStr] = monthYear.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr) // 1-12
    if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59))
      startDate = start.toISOString()
      endDate = end.toISOString()
    }
  } catch {}
  
  let query = supabase
    .from('process_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (options?.includeSiege === false) {
    query = query.neq('territorio', 'Siege')
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar logs da aliança:', error)
    throw error
  }

  return data || []
}
