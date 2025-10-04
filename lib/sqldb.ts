export type MySqlConfig = {
  host: string
  port?: number
  user: string
  password: string
  database: string
}

type MySqlPool = {
  query: (sql: string, params?: any[]) => Promise<[any[], any]>
}

let pool: MySqlPool | null = null
let mysqlModuleLoaded = false
let createPool: ((opts: any) => MySqlPool) | null = null

// Fallback hardcoded: usado apenas se variáveis de ambiente/DSN não estiverem presentes
const HARDCODED_MYSQL: Partial<MySqlConfig> = {
  host: 'sd-br6.blazebr.com',
  port: 3306,
  user: 'u10032_Zlzt2mEYR7',
  password: '@zMV8TwtAh9b.c@xP6z6TbCr',
  database: 's10032_GEARSCORE'
}

function stripQuotes(v?: string | null): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

function parseQueryParams(qs: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of qs.split('&')) {
    const [k, v] = part.split('=')
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '')
  }
  return out
}

function tryParseJdbc(url: string): MySqlConfig | null {
  try {
    // Suporta formatos:
    // 1) jdbc:mysql://user:pass@host:port/db
    // 2) jdbc:mysql://host:port/db?user=...&password=...
    const noPrefix = url.replace(/^jdbc:mysql:\/\//, '')
    const firstSlash = noPrefix.indexOf('/')
    if (firstSlash === -1) return null
    const authAndHost = noPrefix.slice(0, firstSlash)
    const rest = noPrefix.slice(firstSlash + 1) // db?query
    const [dbNameRaw, qs] = rest.split('?')
    const database = decodeURIComponent(dbNameRaw || '')
    // Tenta formato 1: separar pelo último '@' para suportar '@' na senha
    const atPos = authAndHost.lastIndexOf('@')
    let hostPort = authAndHost
    let auth = ''
    if (atPos !== -1) {
      auth = authAndHost.slice(0, atPos)
      hostPort = authAndHost.slice(atPos + 1)
    }
    let user: string | undefined
    let password: string | undefined
    if (auth) {
      const colon = auth.indexOf(':')
      if (colon !== -1) {
        user = decodeURIComponent(auth.slice(0, colon))
        password = decodeURIComponent(auth.slice(colon + 1))
      } else {
        user = decodeURIComponent(auth)
      }
    }
    // Se user não veio via auth, tenta querystring (formato 2)
    if (!user && qs) {
      const qp = parseQueryParams(qs)
      user = qp.user
      password = qp.password
    }
    const [host, portStr] = hostPort.split(':')
    const port = portStr ? Number(portStr) : 3306
    if (host && database && user) {
      return { host, port, user, password: password || '', database }
    }
    return null
  } catch {
    return null
  }
}

function getConfigFromEnv(): MySqlConfig | null {
  // Preferência: variáveis explícitas
  const host = stripQuotes(process.env.GS_DB_HOST)
  const user = stripQuotes(process.env.GS_DB_USER)
  const password = stripQuotes(process.env.GS_DB_PASS)
  const database = stripQuotes(process.env.GS_DB_NAME)
  const port = process.env.GS_DB_PORT ? Number(process.env.GS_DB_PORT) : 3306

  if (host && user && password !== undefined && database) {
    return { host, user, password: password || '', database, port }
  }

  // Alternativo: DSN/JDBC completo
  const jdbc = stripQuotes(process.env.GS_DB_JDBC_URL || process.env.GS_DB_DSN)
  if (jdbc) {
    const cfg = tryParseJdbc(jdbc)
    if (cfg) return cfg
  }

  // Última tentativa: hardcoded
  if (HARDCODED_MYSQL.host && HARDCODED_MYSQL.user && HARDCODED_MYSQL.database) {
    console.warn('[gearscore] usando credenciais MySQL hardcoded (sem .env)')
    return {
      host: HARDCODED_MYSQL.host!,
      port: HARDCODED_MYSQL.port ?? 3306,
      user: HARDCODED_MYSQL.user!,
      password: HARDCODED_MYSQL.password || '',
      database: HARDCODED_MYSQL.database!
    }
  }

  console.warn('[gearscore] MySQL desabilitado: variáveis GS_DB_* ausentes')
  return null
}

export function getPool(): MySqlPool | null {
  if (pool) return pool
  const cfg = getConfigFromEnv()
  if (!cfg) return null
  // Carrega mysql2 só quando necessário
  if (!mysqlModuleLoaded) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mysql = require('mysql2/promise')
      createPool = mysql.createPool
      mysqlModuleLoaded = true
    } catch {
      console.warn('[gearscore] mysql2 não instalado; usando fallback')
      return null
    }
  }
  if (!createPool) return null
  pool = createPool({
    host: cfg.host,
    port: cfg.port ?? 3306,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  })
  return pool
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getPool()
  if (!p) throw new Error('MySQL não configurado (variáveis GS_DB_*)')
  const [rows] = await p.query(sql, params)
  return rows as T[]
}


