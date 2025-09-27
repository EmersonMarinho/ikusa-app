// Mock data utilities for the Ikusa app
import { insertProcessedLog, getProcessLogsHistory, getProcessLogById, type ProcessLogRecord } from './supabase'
import { parseLogFile, type ParsedLogData } from './log-parser'

export interface Player {
  nick: string
  familia: string
}

export interface ClassData {
  classe: string
  count: number
}

export interface ProcessedLog {
  guild: string
  guilds?: string[]
  totalGeral: number
  totalPorClasse: ClassData[]
  classes: Record<string, Player[]>
  classesByGuild?: Record<string, Record<string, Player[]>>
  // Estatísticas individuais por guilda → { guild: { nick: { kills, deaths, classe, familia } } }
  playerStatsByGuild?: Record<string, Record<string, { kills: number; deaths: number; classe: string; familia: string }>>
  killsByGuild?: Record<string, number>
  deathsByGuild?: Record<string, number>
  kdRatioByGuild?: Record<string, number>
  killsMatrix?: Record<string, Record<string, number>>
  // Novos campos
  territorio: 'Calpheon' | 'Kamasylvia' | 'Siege'
  node: string
  guildasAdversarias: string[]
  detectedGuilds?: string[] // Guildas detectadas automaticamente no log
  // Tempo de node e ocupação (segundos)
  totalNodeSeconds?: number
  lollipopOccupancySeconds?: number
}

export interface HistoryRecord {
  id: string
  filename: string
  date: string
  guilds: string[]
  totalGeral: number
  processedData: ProcessedLog
}

// Função principal para processar logs - tenta usar parser real, fallback para mock
export async function processLogFile(
  file: File, 
  territorio: 'Calpheon' | 'Kamasylvia' | 'Siege', 
  node: string, 
  guildasAdversarias: string[],
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedLog> {
  try {
    // Tenta usar o parser real primeiro
    console.log('Tentando processar com parser real...')
    const parsedData = await parseLogFile(file, territorio, node, guildasAdversarias, onProgress)
    
    // Converte os dados do parser real para o formato ProcessedLog
    const processedLog: ProcessedLog = {
      guild: parsedData.guild,
      guilds: parsedData.guilds,
      totalGeral: parsedData.totalGeral,
      totalPorClasse: parsedData.totalPorClasse,
      classes: parsedData.classes,
      classesByGuild: parsedData.classesByGuild,
      killsByGuild: parsedData.killsByGuild,
      deathsByGuild: parsedData.deathsByGuild,
      kdRatioByGuild: parsedData.kdRatioByGuild,
      killsMatrix: parsedData.killsMatrix,
      playerStatsByGuild: (parsedData as any).playerStatsByGuild,
      territorio,
      node,
      guildasAdversarias,
      detectedGuilds: parsedData.detectedGuilds,
    }
    
    console.log('Log processado com sucesso usando parser real!')
    console.log('Guildas detectadas:', parsedData.detectedGuilds)
    return processedLog
    
  } catch (error) {
    console.warn('Parser real falhou, usando dados mock:', error)
    
    // Fallback para dados mock
    return await processLogFileMock(file, territorio, node, guildasAdversarias)
  }
}

// Função mock como fallback
async function processLogFileMock(file: File, territorio: 'Calpheon' | 'Kamasylvia' | 'Siege', node: string, guildasAdversarias: string[]): Promise<ProcessedLog> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const mockClasses = ["Warrior", "Mage", "Archer", "Priest", "Rogue", "Paladin"]
  
  // Sempre incluir Lollipop como guilda principal
  const guilds = ['Lollipop', ...guildasAdversarias]
  
  // Multi-guild log sempre
  const classesByGuild: Record<string, Record<string, Player[]>> = {}
  const killsByGuild: Record<string, number> = {}
  const deathsByGuild: Record<string, number> = {}
  const kdRatioByGuild: Record<string, number> = {}
  const killsMatrix: Record<string, Record<string, number>> = {}

  let totalGeral = 0
  const totalPorClasse: ClassData[] = []
  const allClasses: Record<string, Player[]> = {}

  guilds.forEach((guild) => {
    classesByGuild[guild] = {}
    
    // Lollipop sempre tem mais kills (sua guilda)
    if (guild === 'Lollipop') {
      killsByGuild[guild] = Math.floor(Math.random() * 80) + 40 // 40-120 kills
      deathsByGuild[guild] = Math.floor(Math.random() * 30) + 10 // 10-40 deaths
    } else {
      // Outras guildas têm menos kills
      killsByGuild[guild] = Math.floor(Math.random() * 40) + 5 // 5-45 kills
      deathsByGuild[guild] = Math.floor(Math.random() * 60) + 20 // 20-80 deaths
    }
    
    kdRatioByGuild[guild] = killsByGuild[guild] / deathsByGuild[guild]
    killsMatrix[guild] = {}

    // Lollipop só mata outras guildas, outras guildas só matam Lollipop
    guilds.forEach((otherGuild) => {
      if (guild !== otherGuild) {
        if (guild === 'Lollipop') {
          // Lollipop mata outras guildas
          killsMatrix[guild][otherGuild] = Math.floor(Math.random() * 30) + 10
        } else if (otherGuild === 'Lollipop') {
          // Outras guildas matam Lollipop
          killsMatrix[guild][otherGuild] = Math.floor(Math.random() * 20) + 5
        } else {
          // Não há interação entre outras guildas
          killsMatrix[guild][otherGuild] = 0
        }
      }
    })

    mockClasses.forEach((classe) => {
      const count = Math.floor(Math.random() * 15) + 1
      const players: Player[] = []

      for (let i = 0; i < count; i++) {
        players.push({
          nick: `Player${i + 1}`,
          familia: `Family${Math.floor(Math.random() * 5) + 1}`,
        })
      }

      classesByGuild[guild][classe] = players

      if (!allClasses[classe]) {
        allClasses[classe] = []
      }
      allClasses[classe].push(...players)
    })
  })

  // Calculate totals
  mockClasses.forEach((classe) => {
    const count = allClasses[classe]?.length || 0
    totalPorClasse.push({ classe, count })
    totalGeral += count
  })

  return {
    guild: 'Lollipop', // Sempre Lollipop como guilda principal
    guilds,
    totalGeral,
    totalPorClasse,
    classes: allClasses,
    classesByGuild,
    killsByGuild,
    deathsByGuild,
    kdRatioByGuild,
    killsMatrix,
    territorio,
    node,
    guildasAdversarias,
    detectedGuilds: guilds, // No mock, usamos as guildas selecionadas
  }
}

// Real function to save to Supabase database
export async function saveToDatabase(data: ProcessedLog & { event_date?: string }, filename: string): Promise<ProcessLogRecord> {
  try {
    const recordData = {
      guild: data.guild,
      guilds: data.guilds || null,
      total_geral: data.totalGeral,
      total_por_classe: data.totalPorClasse,
      classes: data.classes,
      classes_by_guild: data.classesByGuild || null,
      player_stats_by_guild: data.playerStatsByGuild || null,
      kills_by_guild: data.killsByGuild || null,
      deaths_by_guild: data.deathsByGuild || null,
      kd_ratio_by_guild: data.kdRatioByGuild || null,
      kills_matrix: data.killsMatrix || null,
      arquivo_nome: filename,
      // Novos campos
      territorio: data.territorio,
      node: data.node,
      guildas_adversarias: data.guildasAdversarias,
      event_date: data.event_date || null,
      total_node_seconds: data.totalNodeSeconds ?? null,
      lollipop_occupancy_seconds: data.lollipopOccupancySeconds ?? null,
    }

    console.log('[Salvar] Enviando para process_logs:', recordData)
    const result = await insertProcessedLog(recordData)
    console.log('[Salvar] Inserido com sucesso. ID:', result?.id)
    
    // Processa automaticamente para o KDA mensal após salvar
    try {
      await fetch('/api/process-monthly-kda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          forceReprocess: false // Só adiciona novos dados
        })
      })
      console.log('✅ KDA mensal atualizado automaticamente')
    } catch (kdaError) {
      console.warn('⚠️ Erro ao atualizar KDA mensal:', kdaError)
      // Não falha o salvamento principal se der erro no KDA
    }

    return result
  } catch (error) {
    console.error('[Salvar] Erro ao salvar no banco:', error)
    if (error && typeof error === 'object') {
      const anyErr = error as any
      console.error('[Salvar] Detalhes:', anyErr.message, anyErr.details, anyErr.hint)
    }
    throw error
  }
}

// Real function to get history from Supabase
export async function getRealHistory(): Promise<ProcessLogRecord[]> {
  try {
    const realData = await getProcessLogsHistory()
    console.log('📊 Dados reais carregados:', realData?.length || 0, 'registros')
    
    // Se não há dados reais, retorna dados mock convertidos
    if (!realData || realData.length === 0) {
      console.log('📊 Nenhum dado real encontrado, usando dados mock convertidos')
      return convertMockHistoryToProcessLog()
    }
    
    return realData
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    console.log('📊 Erro na busca, usando dados mock convertidos como fallback')
    // Retorna dados mock convertidos em caso de erro
    return convertMockHistoryToProcessLog()
  }
}

// Função para converter dados mock para o formato ProcessLogRecord
function convertMockHistoryToProcessLog(): ProcessLogRecord[] {
  const mockData = getMockHistory()
  console.log('📊 Convertendo dados mock para ProcessLogRecord:', mockData.length, 'registros')
  
  return mockData.map((mockRecord) => ({
    id: mockRecord.id,
    created_at: mockRecord.date, // Usa date como created_at
    guild: mockRecord.processedData.guild,
    guilds: mockRecord.processedData.guilds || null,
    total_geral: mockRecord.processedData.totalGeral,
    total_por_classe: mockRecord.processedData.totalPorClasse,
    classes: mockRecord.processedData.classes,
    classes_by_guild: mockRecord.processedData.classesByGuild || null,
    player_stats_by_guild: null, // Mock não tem esse campo
    kills_by_guild: mockRecord.processedData.killsByGuild || null,
    deaths_by_guild: mockRecord.processedData.deathsByGuild || null,
    kd_ratio_by_guild: mockRecord.processedData.kdRatioByGuild || null,
    kills_matrix: mockRecord.processedData.killsMatrix || null,
    arquivo_nome: mockRecord.filename,
    territorio: mockRecord.processedData.territorio,
    node: mockRecord.processedData.node,
    guildas_adversarias: mockRecord.processedData.guildasAdversarias,
    event_date: mockRecord.date, // Usa date como event_date
  }))
}

// Mock function for backward compatibility (fallback)
export function getMockHistory(): HistoryRecord[] {
  const mockData: HistoryRecord[] = []
  const mockGuilds = ['Lollipop', 'Chernobyl', 'Kiev', 'Harvest', 'Rage', 'Gritasuki', 'Mangaga'] // Exemplos de guildas
  const mockClasses = ["Warrior", "Mage", "Archer", "Priest", "Rogue", "Paladin"]
  const territorios: ('Calpheon' | 'Kamasylvia' | 'Siege')[] = ['Calpheon', 'Kamasylvia', 'Siege']
  const nodes = ['Node War 1', 'Node War 2', 'Castle Siege', 'Conquest War']

  for (let i = 0; i < 10; i++) {
    const territorio = territorios[Math.floor(Math.random() * territorios.length)]
    const node = nodes[Math.floor(Math.random() * nodes.length)]
    const guildasAdversarias = mockGuilds.slice(1, 2 + Math.floor(Math.random() * 2)) // Sempre incluir algumas guildas adversárias
    
    const classesByGuild: Record<string, Record<string, Player[]>> = {}
    const killsByGuild: Record<string, number> = {}
    const deathsByGuild: Record<string, number> = {}
    const kdRatioByGuild: Record<string, number> = {}
    const killsMatrix: Record<string, Record<string, number>> = {}

    let totalGeral = 0
    const totalPorClasse: ClassData[] = []
    const allClasses: Record<string, Player[]> = {}

    const guilds = ['Lollipop', ...guildasAdversarias]

    guilds.forEach((guild) => {
      classesByGuild[guild] = {}
      
      // Lollipop sempre tem melhor KD
      if (guild === 'Lollipop') {
        killsByGuild[guild] = Math.floor(Math.random() * 80) + 40
        deathsByGuild[guild] = Math.floor(Math.random() * 30) + 10
      } else {
        killsByGuild[guild] = Math.floor(Math.random() * 40) + 5
        deathsByGuild[guild] = Math.floor(Math.random() * 60) + 20
      }
      
      kdRatioByGuild[guild] = killsByGuild[guild] / deathsByGuild[guild]
      killsMatrix[guild] = {}

      // Lollipop só mata outras guildas, outras guildas só matam Lollipop
      guilds.forEach((otherGuild) => {
        if (guild !== otherGuild) {
          if (guild === 'Lollipop') {
            killsMatrix[guild][otherGuild] = Math.floor(Math.random() * 30) + 10
          } else if (otherGuild === 'Lollipop') {
            killsMatrix[guild][otherGuild] = Math.floor(Math.random() * 20) + 5
          } else {
            killsMatrix[guild][otherGuild] = 0
          }
        }
      })

      mockClasses.forEach((classe) => {
        const count = Math.floor(Math.random() * 15) + 1
        const players: Player[] = []

        for (let i = 0; i < count; i++) {
          players.push({
            nick: `Player${i + 1}`,
            familia: `Family${Math.floor(Math.random() * 5) + 1}`,
          })
        }

        classesByGuild[guild][classe] = players

        if (!allClasses[classe]) {
          allClasses[classe] = []
        }
        allClasses[classe].push(...players)
      })
    })

    // Calculate totals
    mockClasses.forEach((classe) => {
      const count = allClasses[classe]?.length || 0
      totalPorClasse.push({ classe, count })
      totalGeral += count
    })

    mockData.push({
      id: `mock-${i}`,
      filename: `log_${i + 1}.log`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      guilds,
      totalGeral,
      processedData: {
        guild: 'Lollipop',
        guilds,
        totalGeral,
        totalPorClasse,
        classes: allClasses,
        classesByGuild,
        killsByGuild,
        deathsByGuild,
        kdRatioByGuild,
        killsMatrix,
        territorio,
        node,
        guildasAdversarias,
        detectedGuilds: guilds,
      },
    })
  }

  return mockData
}
