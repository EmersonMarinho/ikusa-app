# 🎮 Ikusa App - Sistema de Análise de Logs de Guerra

Uma aplicação web moderna para processar, analisar e comparar logs de guerra de guildas em jogos MMORPG, com foco especial no sistema de Kill/Death (KD) e análise de composições.

## 🚀 **Novas Funcionalidades**

### 🗺️ **Sistema de Território e Node**
- **Território**: Seleção entre Calpheon, Kamasylvia e Siege
- **Node**: Campo personalizável para especificar o tipo de guerra (Node War, Castle Siege, etc.)
- **Guildas Adversárias**: Detecção automática baseada no padrão "from [NomeDaGuilda]" no log

### ⚔️ **Sistema de KD Inteligente**
- **Lollipop como Guilda Principal**: Sempre sua guilda como referência
- **Interações Limitadas**: Lollipop interage com todas as guildas, outras guildas só interagem com Lollipop
- **Matriz de Kills**: Visualização clara de quem matou quem
- **KD Ratio por Guilda**: Cálculo automático de Kill/Death ratio

### 🔍 **Parser de Log Real**
- **Integração com Black Desert Online**: Busca automática de classes e famílias
- **Fallback Inteligente**: Se o parser real falhar, usa dados simulados
- **Processamento em Tempo Real**: Análise automática dos logs de combate

## ✨ **Funcionalidades Principais**

- **Upload e Processamento**: Upload de arquivos .log com processamento automático
- **Configuração de Guerra**: Seleção de território (Calpheon/Kamasylvia/Siege) e node
- **Detecção Automática**: Identificação automática de guildas baseada no padrão do log
- **Análise de Composição**: Breakdown por classe com estatísticas detalhadas
- **Histórico Completo**: Visualização de todos os logs processados
- **Comparação de Guildas**: Comparação lado a lado de composições e estatísticas
- **Sistema de KD**: Análise completa de kills, deaths e ratios
- **Persistência Real**: Salvamento automático no Supabase com fallback para dados mock
- **Exportação**: Geração de relatórios em TXT

## 🛠️ **Tecnologias**

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS 4, Radix UI
- **Backend**: Supabase (PostgreSQL + APIs)
- **Parser**: Axios + Cheerio para busca de dados do jogo
- **Deploy**: Vercel

## 📚 Documentação

- Visão Geral: `docs/overview.md`
- API: `docs/api.md`
- Desenvolvimento: `docs/dev.md`
- Deploy: `docs/deploy.md`
- Segurança: `docs/seguranca.md`
 - Swagger UI: acesse `/api-docs` (usa `public/openapi.yaml`)

## 🚀 **Como Executar**

### 1. **Instalação**
```bash
git clone <repository-url>
cd ikusa-app
npm install
```

### 2. **Configuração do Supabase**
Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 3. **Setup Automático (Recomendado)**
```bash
# Chame a API de setup uma vez
curl -X POST http://localhost:3000/api/setup
```

### 4. **Execução**
```bash
npm run dev
```

Acesse: http://localhost:3000

## 🗄️ **Configuração do Supabase**

### 1. **Criar Projeto**
- Acesse [supabase.com](https://supabase.com)
- Crie um novo projeto
- Anote a URL e as chaves de API

### 2. **Configurar .env.local**
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 3. **Criar Tabela (Automático)**
A API `/api/setup` criará automaticamente a tabela `process_logs` com:

```sql
CREATE TABLE process_logs (
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
```

### 4. **Setup Automático**
```bash
# Uma vez configurado, chame:
curl -X POST http://localhost:3000/api/setup
```

## 📁 **Estrutura do Projeto**

```
ikusa-app/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── setup/         # Setup automático do Supabase
│   ├── compare/           # Página de comparação
│   ├── history/           # Página de histórico
│   └── page.tsx           # Página principal (upload)
├── components/            # Componentes React
│   ├── shared/            # Componentes compartilhados
│   ├── upload-page.tsx    # Página de upload
│   ├── history-page.tsx   # Página de histórico
│   └── compare-page.tsx   # Página de comparação
├── lib/                   # Utilitários e configurações
│   ├── supabase.ts        # Cliente e funções do Supabase
│   ├── log-parser.ts      # Parser real de logs
│   └── mock-data.ts       # Dados mock e fallbacks
└── styles/                # Estilos globais
```

## 📊 **Modelo de Dados**

### **ProcessedLog Interface**
```typescript
interface ProcessedLog {
  guild: string                    // Sempre 'Lollipop'
  guilds: string[]                 // Lista de todas as guildas
  totalGeral: number               // Total de jogadores
  totalPorClasse: ClassData[]      // Breakdown por classe
  classes: Record<string, Player[]> // Jogadores por classe
  classesByGuild: Record<string, Record<string, Player[]>>
  killsByGuild: Record<string, number>      // Kills por guilda
  deathsByGuild: Record<string, number>    // Deaths por guilda
  kdRatioByGuild: Record<string, number>   // KD ratio por guilda
  killsMatrix: Record<string, Record<string, number>> // Matriz de kills
  territorio: 'Calpheon' | 'Kamasylvia'    // Território da guerra
  node: string                              // Node jogado
  guildasAdversarias: string[]              // Guildas adversárias
}
```

### **Tabela process_logs**
- **id**: UUID único
- **created_at**: Timestamp de criação
- **guild**: Guilda principal (sempre Lollipop)
- **guilds**: Array de guildas participantes
- **total_geral**: Total de jogadores
- **total_por_classe**: Estatísticas por classe
- **classes**: Mapeamento de classes para jogadores
- **classes_by_guild**: Classes organizadas por guilda
- **kills_by_guild**: Kills por guilda
- **deaths_by_guild**: Deaths por guilda
- **kd_ratio_by_guild**: KD ratio por guilda
- **kills_matrix**: Matriz de kills entre guildas
- **arquivo_nome**: Nome do arquivo processado
- **territorio**: Território da guerra
- **node**: Node jogado
- **guildas_adversarias**: Lista de guildas adversárias (detectadas automaticamente)

## 🔒 **Segurança e Acesso**

- **Row Level Security (RLS)**: Habilitado na tabela
- **Políticas de Acesso**: Leitura e inserção para todos os usuários
- **Service Role Key**: Usada apenas para operações administrativas
- **Dados Sensíveis**: Nunca expostos no frontend

## 📱 **Responsividade**

- **Mobile First**: Design responsivo para todos os dispositivos
- **Componentes Adaptativos**: UI que se adapta ao tamanho da tela
- **Touch Friendly**: Interface otimizada para dispositivos touch

## 🚀 **Deploy na Vercel**

### 1. **Configurar Variáveis de Ambiente**
No projeto Vercel, configure as mesmas variáveis do `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. **Deploy Automático**
```bash
npm run build
vercel --prod
```

### 3. **Setup Pós-Deploy**
Após o deploy, chame a API de setup:
```bash
curl -X POST https://seu-app.vercel.app/api/setup
```

## 🔮 **Funcionalidades Futuras**

- [ ] **Dashboard em Tempo Real**: Estatísticas live durante guerras
- [ ] **Sistema de Rankings**: Leaderboards de guildas e jogadores
- [ ] **Análise de Tendências**: Gráficos de evolução ao longo do tempo
- [ ] **Notificações**: Alertas para novas guerras e resultados
- [ ] **API Pública**: Endpoints para integração com outras aplicações
- [ ] **Mobile App**: Aplicativo nativo para iOS/Android

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 **Suporte**

- **Issues**: Use o GitHub Issues para reportar bugs
- **Discord**: Entre no servidor da comunidade
- **Email**: contato@ikusa-app.com

---

**Desenvolvido com ❤️ para a comunidade de Black Desert Online**
