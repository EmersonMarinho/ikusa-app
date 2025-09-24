## Deploy — Vercel

### Variáveis na Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_URL` (ex.: `https://seu-app.vercel.app`)

### Passos
1. `npm run build`
2. Configure envs no projeto Vercel
3. Faça o deploy (`vercel --prod` ou via Git)
4. Chame o setup pós-deploy:

```bash
curl -X POST https://seu-app.vercel.app/api/setup
```

### Dicas
- Se endpoints demorarem, ajuste timeouts e reduza concorrência (ex.: `slowMode` em `/api/process-log`)
- Verifique `/api/debug-env` para diagnosticar ambiente


