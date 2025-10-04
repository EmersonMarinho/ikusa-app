import { query as mysqlQuery, getPool } from '@/lib/sqldb'

export type ExternalPlayer = {
  id?: number
  user_id: string
  family_name: string
  character_name: string
  main_class: string
  ap: number
  aap: number
  dp: number
  gearscore: number
  link_gear?: string | null
  created_at?: string
  last_updated?: string
}

let cachedAt: number | null = null
let cachedPlayers: ExternalPlayer[] | null = null

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

function getTtlMs(): number {
  const seconds = Number(env('GS_DB_TTL_SECONDS', '600'))
  return isFinite(seconds) && seconds > 0 ? seconds * 1000 : 600_000
}

function isCacheFresh(): boolean {
  if (!cachedAt) return false
  return Date.now() - cachedAt < getTtlMs()
}

function coerceNumber(value: any): number {
  const n = Number(value)
  return isFinite(n) ? n : 0
}

function normalizeDate(value: any): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString()
  const str = String(value).trim()
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s*-\s*(\d{2}):(\d{2}))?$/)
  if (brMatch) {
    const [, dd, mm, yyyy, hh = '00', min = '00'] = brMatch
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`
    const parsed = new Date(iso)
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  }
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  return str
}

function mapRow(row: Record<string, any>): ExternalPlayer | null {
  const get = (keys: string[], def?: any) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return row[k]
    }
    return def
  }

  const family = String(get(['family_name', 'familia', 'family', 'familyName'], '')).trim()
  if (!family) return null
  const userId = String(get(['user_id', 'userid', 'id_usuario', 'id_user', 'id'], ''))
  const character = String(get(['character_name', 'nick', 'personagem', 'character'], family)).trim()
  const mainClass = String(get(['main_class', 'classe', 'class', 'mainClass'], 'Unknown')).trim()
  const ap = coerceNumber(get(['ap', 'atk', 'attack', 'ap_main'], 0))
  const aap = coerceNumber(get(['aap', 'awak_ap', 'ap_awak', 'ap_awakened'], 0))
  const dp = coerceNumber(get(['dp', 'def', 'defense'], 0))
  let gs = coerceNumber(get(['gearscore', 'gs'], 0))
  if (!gs) gs = Math.max(ap, aap) + dp

  const link = get(['link_gear', 'gear_link', 'garmoth_link'], null)
  const createdRaw = get(['created_at', 'createdAt', 'created', 'inserted_at'], null)
  const updatedRaw = get(['last_updated', 'updated_at', 'recorded_at', 'updatedAt'], createdRaw)
  const createdAt = normalizeDate(createdRaw)
  const updatedAt = normalizeDate(updatedRaw) || createdAt || new Date().toISOString()

  return {
    user_id: userId || family,
    family_name: family,
    character_name: character,
    main_class: mainClass,
    ap,
    aap,
    dp,
    gearscore: gs,
    link_gear: link ?? undefined,
    created_at: createdAt,
    last_updated: updatedAt
  }
}

export async function fetchExternalPlayers(force = false): Promise<ExternalPlayer[]> {
  // Pool só existe se variáveis GS_DB_* estiverem definidas
  if (!getPool()) return []
  if (!force && isCacheFresh() && cachedPlayers) return cachedPlayers

  const sql = env('GS_DB_QUERY', '')
  let finalSql = sql
  if (!finalSql.trim()) {
    // Query padrão hardcoded baseada no schema fornecido: tabela `profiles`
    finalSql = `SELECT
  user_id        AS user_id,
  family_name    AS family_name,
  character_name AS character_name,
  main_class     AS main_class,
  ap             AS ap,
  aap            AS aap,
  dp             AS dp,
  link_gear      AS link_gear,
  last_updated   AS last_updated
FROM profiles`
  }

  try {
    const rows = await mysqlQuery<Record<string, any>>(finalSql)
    const mapped: ExternalPlayer[] = []
    for (const row of rows) {
      const p = mapRow(row)
      if (p && p.gearscore > 0) mapped.push(p)
    }
    cachedPlayers = mapped
    cachedAt = Date.now()
    return mapped
  } catch (err) {
    console.warn('[gearscore] falha ao consultar MySQL; usando fallback', err instanceof Error ? err.message : err)
    // falha: não bloqueia, apenas retorna vazio para ativar o fallback
    return []
  }
}


