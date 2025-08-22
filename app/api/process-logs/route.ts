import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-kda'

export const runtime = 'nodejs'

// GET: Lista logs (com filtro opcional por mês: YYYY-MM)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    let query = supabase
      .from('process_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (month) {
      const start = `${month}-01T00:00:00Z`
      const end = `${month}-31T23:59:59Z`
      query = query.gte('created_at', start).lte('created_at', end)
    }

    const { data, error } = await query
    if (error) {
      console.error('Erro ao listar logs:', error)
      return NextResponse.json({ success: false, message: 'Erro ao listar logs', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: (data || []).length,
      logs: (data || []).map((l: any) => ({
        id: l.id,
        created_at: l.created_at,
        arquivo_nome: l.arquivo_nome,
        guild: l.guild,
        guilds: l.guilds,
        total_geral: l.total_geral,
        has_player_stats: !!l.player_stats_by_guild,
        has_classes_by_guild: !!l.classes_by_guild
      }))
    })
  } catch (error) {
    console.error('Exceção ao listar logs:', error)
    return NextResponse.json({ success: false, message: 'Erro interno ao listar logs' }, { status: 500 })
  }
}

// DELETE: Remove o último log inserido em process_logs
export async function DELETE(_request: NextRequest) {
  try {
    // Busca o último log pelo created_at
    const { data: lastLog, error: fetchError } = await supabase
      .from('process_logs')
      .select('id, arquivo_nome, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erro ao buscar último log:', fetchError)
      return NextResponse.json({ success: false, message: 'Erro ao buscar último log', details: fetchError.message }, { status: 500 })
    }

    if (!lastLog) {
      return NextResponse.json({ success: false, message: 'Nenhum log encontrado para remover' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('process_logs')
      .delete()
      .eq('id', lastLog.id)

    if (deleteError) {
      console.error('Erro ao remover log:', deleteError)
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao remover log. Verifique as políticas de RLS para DELETE em process_logs.', 
        details: deleteError.message 
      }, { status: 403 })
    }

    return NextResponse.json({ success: true, removed_id: lastLog.id, arquivo_nome: (lastLog as any).arquivo_nome })
  } catch (error) {
    console.error('Exceção ao remover último log:', error)
    return NextResponse.json({ success: false, message: 'Erro interno ao remover último log' }, { status: 500 })
  }
}
