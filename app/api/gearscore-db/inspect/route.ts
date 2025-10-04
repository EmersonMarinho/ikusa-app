import { NextResponse } from 'next/server'
import { getPool, query } from '@/lib/sqldb'

export async function GET() {
  try {
    const pool = getPool()
    if (!pool) {
      return NextResponse.json({ success: false, error: 'MySQL não configurado' }, { status: 400 })
    }

    const dbName = process.env.GS_DB_NAME || (process as any).env?.GS_DB_NAME || 's10032__GEARSCORE'

    // Lista tabelas do schema
    const tables = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name`,
      [dbName]
    )

    // Para as 5 primeiras tabelas, lista colunas
    const details: Record<string, Array<{ column_name: string; data_type: string }>> = {}
    for (const t of tables.slice(0, 8)) {
      const cols = await query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`,
        [dbName, t.table_name]
      )
      details[t.table_name] = cols
    }

    return NextResponse.json({ success: true, database: dbName, tables, details })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}


