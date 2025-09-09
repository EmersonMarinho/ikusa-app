import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1', 10) || 1, 50)

    const { data, error } = await supabase
      .from('chernobyl_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Erro ao buscar snapshots' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Espera: { guilds: string[], players: any[], total_players: number, visible_count: number, private_count: number, average_papd: number, scraping_timestamp?: string }
    const row = {
      guilds: body.guilds || [],
      players: body.players || [],
      total_players: Number(body.total_players || 0),
      visible_count: Number(body.visible_count || 0),
      private_count: Number(body.private_count || 0),
      average_papd: Number(body.average_papd || 0),
      scraping_timestamp: body.scraping_timestamp || new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('chernobyl_snapshots')
      .insert(row)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Erro ao salvar snapshot' }, { status: 500 })
  }
}


