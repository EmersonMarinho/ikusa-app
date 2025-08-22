import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
  try {
    // Cliente com service role para operações administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Criar tabela process_logs se não existir
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
          player_stats_by_guild JSONB,
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
      console.error('Erro ao criar tabela process_logs:', tableError)
    }

    // Criar tabela alliance_cache se não existir
    const { error: allianceCacheError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS alliance_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          familia TEXT NOT NULL,
          guilda TEXT NOT NULL,
          isMestre BOOLEAN DEFAULT FALSE,
          lastSeen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (allianceCacheError) {
      console.error('Erro ao criar tabela alliance_cache:', allianceCacheError)
    }

    // Criar tabela monthly_kda se não existir
    const { error: monthlyKDAError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS monthly_kda (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          month_year TEXT NOT NULL,
          player_nick TEXT NOT NULL,
          player_familia TEXT NOT NULL,
          guilda TEXT NOT NULL,
          classes_played JSONB NOT NULL DEFAULT '[]',
          total_kills INTEGER DEFAULT 0,
          total_deaths INTEGER DEFAULT 0,
          total_kills_vs_chernobyl INTEGER DEFAULT 0,
          total_deaths_vs_chernobyl INTEGER DEFAULT 0,
          total_kills_vs_others INTEGER DEFAULT 0,
          total_deaths_vs_others INTEGER DEFAULT 0,
          kd_overall NUMERIC DEFAULT 0,
          kd_vs_chernobyl NUMERIC DEFAULT 0,
          kd_vs_others NUMERIC DEFAULT 0,
          logs_processed JSONB DEFAULT '[]',
          last_log_processed_at TIMESTAMP WITH TIME ZONE
        );
      `
    })

    if (monthlyKDAError) {
      console.error('Erro ao criar tabela monthly_kda:', monthlyKDAError)
    }

    // Criar tabela monthly_kda_config se não existir
    const { error: monthlyConfigError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS monthly_kda_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          month_year TEXT NOT NULL UNIQUE,
          is_active BOOLEAN DEFAULT FALSE,
          reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_logs_processed INTEGER DEFAULT 0,
          alliance_members_tracked INTEGER DEFAULT 0
        );
      `
    })

    if (monthlyConfigError) {
      console.error('Erro ao criar tabela monthly_kda_config:', monthlyConfigError)
    }

    // Adicionar colunas se não existirem na tabela process_logs
    const alterColumns = [
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS guilds JSONB;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS classes_by_guild JSONB;',
      'ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS player_stats_by_guild JSONB;',
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
        console.error('Erro ao alterar tabela process_logs:', error)
      }
    }

    // Criar políticas RLS (Row Level Security) para todas as tabelas
    const rlsPolicies = [
      // process_logs
      'ALTER TABLE process_logs ENABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON process_logs;',
      'CREATE POLICY "Enable read access for all users" ON process_logs FOR SELECT USING (true);',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON process_logs;',
      'CREATE POLICY "Enable insert access for all users" ON process_logs FOR INSERT WITH CHECK (true);',
      
      // alliance_cache
      'ALTER TABLE alliance_cache ENABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON alliance_cache;',
      'CREATE POLICY "Enable read access for all users" ON alliance_cache FOR SELECT USING (true);',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON alliance_cache;',
      'CREATE POLICY "Enable insert access for all users" ON alliance_cache FOR INSERT WITH CHECK (true);',
      'DROP POLICY IF EXISTS "Enable delete access for all users" ON alliance_cache;',
      'CREATE POLICY "Enable delete access for all users" ON alliance_cache FOR DELETE USING (true);',
      
      // monthly_kda
      'ALTER TABLE monthly_kda ENABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON monthly_kda;',
      'CREATE POLICY "Enable read access for all users" ON monthly_kda FOR SELECT USING (true);',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON monthly_kda;',
      'CREATE POLICY "Enable insert access for all users" ON monthly_kda FOR INSERT WITH CHECK (true);',
      'DROP POLICY IF EXISTS "Enable update access for all users" ON monthly_kda;',
      'CREATE POLICY "Enable update access for all users" ON monthly_kda FOR UPDATE USING (true);',
      'DROP POLICY IF EXISTS "Enable delete access for all users" ON monthly_kda;',
      'CREATE POLICY "Enable delete access for all users" ON monthly_kda FOR DELETE USING (true);',
      
      // monthly_kda_config
      'ALTER TABLE monthly_kda_config ENABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON monthly_kda_config;',
      'CREATE POLICY "Enable read access for all users" ON monthly_kda_config FOR SELECT USING (true);',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON monthly_kda_config;',
      'CREATE POLICY "Enable insert access for all users" ON monthly_kda_config FOR INSERT WITH CHECK (true);',
      'DROP POLICY IF EXISTS "Enable update access for all users" ON monthly_kda_config;',
      'CREATE POLICY "Enable update access for all users" ON monthly_kda_config FOR UPDATE USING (true);'
    ]

    for (const sql of rlsPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.error('Erro ao criar políticas RLS:', error)
      }
    }

    // Criar índices para melhor performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_process_logs_created_at ON process_logs(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_process_logs_territorio ON process_logs(territorio);',
      'CREATE INDEX IF NOT EXISTS idx_alliance_cache_guilda ON alliance_cache(guilda);',
      'CREATE INDEX IF NOT EXISTS idx_monthly_kda_month_year ON monthly_kda(month_year);',
      'CREATE INDEX IF NOT EXISTS idx_monthly_kda_player_nick ON monthly_kda(player_nick);',
      'CREATE INDEX IF NOT EXISTS idx_monthly_kda_config_month_year ON monthly_kda_config(month_year);'
    ]

    for (const sql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.error('Erro ao criar índice:', error)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Setup concluído com sucesso! Todas as tabelas foram criadas e configuradas.',
      tables_created: [
        'process_logs',
        'alliance_cache', 
        'monthly_kda',
        'monthly_kda_config'
      ]
    })

  } catch (error) {
    console.error('Erro no setup:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
