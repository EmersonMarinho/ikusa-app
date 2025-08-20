import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-kda'

export const runtime = 'nodejs'

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


