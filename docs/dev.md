## Desenvolvimento — Setup e Guia

### Pré-requisitos
- Node.js 18+
- Conta Supabase e projeto criado

### Instalação
```bash
pnpm i # ou npm install
```

### Variáveis de Ambiente (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Scripts
```bash
npm run dev    # desenvolvimento
npm run build  # build de produção
npm run start  # iniciar em produção
npm run lint   # (se configurado)
```

### Setup Inicial do Banco
```bash
curl -X POST http://localhost:3000/api/setup
```

### Fluxo de Desenvolvimento
1. Execute `npm run dev`
2. Acesse `http://localhost:3000`
3. Use a página principal para upload de `.log`
4. Verifique resultados em `History`, `Compare`, `KDA Mensal` e `Gearscore`

### Estrutura de Pastas (resumo)
- `app/` — páginas e rotas de API
- `components/` — UI e componentes de página
- `lib/` — parser, supabase e utilitários
- `styles/` — estilos globais

### Dicas
- Se raspagens falharem, `process-log` usa fallback mock para classe/família
- Use `/api/debug-env` para checar env e conexão Supabase


