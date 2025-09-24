## Ikusa App — Visão Geral

O Ikusa App é uma aplicação Next.js para processar, analisar e comparar logs de guerra (MMORPG), com foco em:

- Upload e processamento de logs (.log)
- Detecção automática de guildas e composição por classe
- Estatísticas de K/D (por guilda, jogador e matriz de confrontos)
- Histórico e comparação de guerras
- Integração com Supabase para persistência

### Principais Módulos

- Páginas: `app/page.tsx` (upload), `app/history/page.tsx`, `app/compare/page.tsx`, `app/gearscore/page.tsx`, `app/kda-mensal/page.tsx`, `app/chernobyl/page.tsx`, `app/h/[id]/page.tsx`
- APIs: ver `docs/api.md`
- Biblioteca: `lib/` com parser de logs, utilitários, Supabase e filtros

### Fluxo Alto Nível

1. Usuário envia um arquivo `.log` na página principal
2. A API `/api/process-log` analisa, identifica guildas, classes e estatísticas
3. Dados podem ser persistidos em `process_logs` (via fluxos auxiliares)
4. Visualizações em histórico, comparação e KDA mensal

### Tecnologias

- Next.js 15, React 19, TypeScript
- TailwindCSS 4, Radix UI
- Supabase (PostgreSQL)
- Axios + Cheerio (raspagem leve de dados do jogo)

### Tabelas Principais (Supabase)

- `process_logs`: resultado consolidado de um log processado
- `alliance_cache`: cache dos membros das guildas da aliança
- `monthly_kda` e `monthly_kda_config`: estatísticas mensais por jogador
- `players` e `gearscore_history`: dados e histórico de gearscore

Para schema e setup automatizado, veja `/api/setup` em `docs/api.md`.


