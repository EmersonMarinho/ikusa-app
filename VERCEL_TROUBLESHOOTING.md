# 🚨 Troubleshooting - KDA Mensal na Vercel

## Problema Identificado
O KDA Mensal não está carregando/exibindo dados na Vercel, mesmo funcionando perfeitamente no ambiente de desenvolvimento.

## 🔍 **Causas Principais**

### 1. **Cache em Memória (Resolvido)**
- ❌ **Antes**: Cache da aliança era mantido em memória (`allianceCache`)
- ✅ **Agora**: Cache persistente no Supabase (`alliance_cache`)

### 2. **Timeouts da Vercel**
- ❌ **Antes**: Timeouts muito longos (12s) causavam falhas
- ✅ **Agora**: Timeouts otimizados (8-10s) para serverless

### 3. **Tabelas Faltando**
- ❌ **Antes**: Tabelas `alliance_cache`, `monthly_kda` não existiam
- ✅ **Agora**: Setup automático cria todas as tabelas necessárias

## 🛠️ **Soluções Implementadas**

### **1. Cache Persistente no Supabase**
```typescript
// Antes: Cache em memória (não funciona na Vercel)
let allianceCache: Array<AllianceMember> = []

// Agora: Cache persistente no Supabase
async function getCacheFromSupabase(): Promise<AllianceMember[]>
async function saveCacheToSupabase(members: AllianceMember[]): Promise<void>
```

### **2. Timeouts Otimizados**
```typescript
// Antes: Timeouts muito longos
const timeout = setTimeout(() => controller.abort(), 12000)

// Agora: Timeouts adequados para Vercel
const timeout = setTimeout(() => controller.abort(), 10000)
await Promise.race([
  Promise.all(workers),
  new Promise<void>((resolve) => setTimeout(() => resolve(), 8000))
])
```

### **3. Setup Automático de Tabelas**
```typescript
// API /api/setup agora cria:
- process_logs (já existia)
- alliance_cache (NOVA)
- monthly_kda (NOVA)
- monthly_kda_config (NOVA)
```

## 📋 **Passos para Resolver**

### **Passo 1: Verificar Variáveis de Ambiente**
```bash
# Na Vercel, verifique se estas variáveis estão configuradas:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### **Passo 2: Executar Setup**
```bash
# Após o deploy, execute:
curl -X POST https://seu-app.vercel.app/api/setup
```

### **Passo 3: Verificar Status**
```bash
# Verifique se as variáveis estão carregando:
curl https://seu-app.vercel.app/api/debug-env
```

### **Passo 4: Forçar Atualização do Cache**
```bash
# Atualize o cache da aliança:
curl -X POST https://seu-app.vercel.app/api/alliance-cache
```

## 🔧 **APIs Criadas/Modificadas**

### **1. `/api/alliance-cache` (Modificada)**
- ✅ Cache persistente no Supabase
- ✅ Fallback para cache anterior em caso de erro
- ✅ Timeouts otimizados para Vercel

### **2. `/api/setup` (Expandida)**
- ✅ Cria todas as tabelas necessárias
- ✅ Configura RLS e índices
- ✅ Suporte para KDA mensal

### **3. `/api/process-monthly-kda` (Otimizada)**
- ✅ Logging melhorado para debug
- ✅ Timeouts reduzidos para Vercel
- ✅ Melhor tratamento de erros

### **4. `/api/debug-env` (Nova)**
- ✅ Verifica variáveis de ambiente
- ✅ Testa conexão com Supabase
- ✅ Debug para problemas de configuração

## 🚀 **Deploy na Vercel**

### **1. Configurar Variáveis de Ambiente**
```bash
# No projeto Vercel, configure:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### **2. Fazer Deploy**
```bash
git add .
git commit -m "Fix: KDA Mensal para Vercel - Cache persistente e timeouts otimizados"
git push origin main
```

### **3. Pós-Deploy**
```bash
# 1. Executar setup
curl -X POST https://seu-app.vercel.app/api/setup

# 2. Verificar status
curl https://seu-app.vercel.app/api/debug-env

# 3. Atualizar cache da aliança
curl -X POST https://seu-app.vercel.app/api/alliance-cache
```

## 🐛 **Debug e Logs**

### **Verificar Logs da Vercel**
1. Acesse o dashboard da Vercel
2. Vá para Functions > Logs
3. Procure por erros relacionados ao KDA mensal

### **Verificar Console do Navegador**
1. Abra a página do KDA Mensal
2. Pressione F12 > Console
3. Procure por erros de API ou dados

### **Testar APIs Individualmente**
```bash
# Teste cada API:
curl https://seu-app.vercel.app/api/alliance-cache
curl https://seu-app.vercel.app/api/process-monthly-kda?month=2025-01
```

## ✅ **Checklist de Verificação**

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Setup executado com sucesso (`/api/setup`)
- [ ] Cache da aliança atualizado (`/api/alliance-cache`)
- [ ] Tabelas criadas no Supabase
- [ ] APIs respondendo corretamente
- [ ] KDA Mensal carregando dados

## 🆘 **Se Ainda Não Funcionar**

### **1. Verificar Banco de Dados**
```sql
-- No Supabase, verifique se as tabelas existem:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('alliance_cache', 'monthly_kda', 'monthly_kda_config');
```

### **2. Verificar Políticas RLS**
```sql
-- Verifique se as políticas estão ativas:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('alliance_cache', 'monthly_kda');
```

### **3. Verificar Logs do Supabase**
- Acesse o dashboard do Supabase
- Vá para Logs > Database
- Procure por erros de permissão ou conexão

## 📞 **Suporte**

Se o problema persistir após seguir todos os passos:

1. **Verifique os logs da Vercel**
2. **Teste as APIs individualmente**
3. **Verifique o status do Supabase**
4. **Compare com o ambiente de desenvolvimento**

---

**Última atualização**: Janeiro 2025
**Versão**: 2.0.0 (Vercel Optimized)
