## Segurança

### Supabase e RLS
- RLS habilitado em `process_logs`, `alliance_cache`, `monthly_kda`, `monthly_kda_config`
- Políticas básicas de SELECT/INSERT (e UPDATE/DELETE onde aplicável) configuradas por `/api/setup`

### Chaves e Ambiente
- Não exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente
- Use variáveis `NEXT_PUBLIC_*` apenas para leitura pública

### Middleware
- `middleware.ts` está liberado no momento (autenticação comentada)
- Ao habilitar, defina exceções para `api`, `_next/*`, `favicon.ico`

### Dados Sensíveis
- Famílias e guildas raspadas são armazenadas em `alliance_cache`
- Evite logs com dados pessoais; use apenas nicks públicos do jogo

### Boas Práticas
- Valide arquivos `.log` recebidos
- Limite concorrência e adote retry com backoff (já aplicado em `/api/process-log`)
- Monitore tempo de execução na Vercel para evitar timeouts


