import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verifica variáveis de ambiente essenciais
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Não configurada',
      VERCEL_URL: process.env.VERCEL_URL || '❌ Não configurada',
      NODE_ENV: process.env.NODE_ENV || '❌ Não configurada',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '❌ Não configurada'
    }

    // Verifica se as URLs estão acessíveis
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let supabaseStatus = '❌ Não configurada'
    
    if (supabaseUrl) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
          }
        })
        supabaseStatus = response.ok ? '✅ Acessível' : `❌ Erro HTTP ${response.status}`
      } catch (error) {
        supabaseStatus = `❌ Erro de conexão: ${error instanceof Error ? error.message : 'Desconhecido'}`
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Status das variáveis de ambiente e conexões',
      environment: envVars,
      supabase_connection: supabaseStatus,
      timestamp: new Date().toISOString(),
      platform: 'Vercel'
    })

  } catch (error) {
    console.error('Erro ao verificar variáveis de ambiente:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro ao verificar configurações',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
