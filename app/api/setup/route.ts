import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    // Cliente com service role para operações administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Criar tabela se não existir
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS process_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          guild TEXT NOT NULL,
          guilds JSONB,
          total_geral INTEGER NOT NULL,
          total_por_classe JSONB NOT NULL,
          classes JSONB NOT NULL,
          classes_by_guild JSONB,
          kills_by_guild JSONB,
          deaths_by_guild JSONB,
          kd_ratio_by_guild JSONB,
          kills_matrix JSONB,
          arquivo_nome TEXT NOT NULL,
                                territorio TEXT CHECK (territorio IN ('Calpheon', 'Kamasylvia', 'Siege')),
          node TEXT NOT NULL,
          guildas_adversarias JSONB
        );
      `
    })

    if (tableError) {
      console.error('Erro ao criar tabela:', tableError)
    }

    // Adicionar colunas se não existirem
    const alterColumns = [
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS guilds JSONB;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS classes_by_guild JSONB;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS kills_by_guild JSONB;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS deaths_by_guild JSONB;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS kd_ratio_by_guild JSONB;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS kills_matrix JSONB;',
                        'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS territorio TEXT CHECK (territorio IN (\'Calpheon\', \'Kamasylvia\', \'Siege\'));',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS node TEXT;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS guildas_adversarias JSONB;'
    ]

    for (const sql of alterColumns) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.error('Erro ao alterar tabela:', error)
      }
    }

    // Criar políticas RLS (Row Level Security)
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE process_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Enable read access for all users" ON process_logs;
        CREATE POLICY "Enable read access for all users" ON process_logs
          FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Enable insert access for all users" ON process_logs;
        CREATE POLICY "Enable insert access for all users" ON process_logs
          FOR INSERT WITH CHECK (true);
      `
    })

    if (policyError) {
      console.error('Erro ao criar políticas:', policyError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Setup concluído com sucesso!' 
    })

  } catch (error) {
    console.error('Erro no setup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
