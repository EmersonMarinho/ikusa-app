## API — Endpoints

Todos os endpoints usam o App Router do Next.js e retornam JSON.

Base local: `http://localhost:3000`

Swagger UI: acesse `http://localhost:3000/api-docs` (fonte `public/openapi.yaml`, modo read-only sem Try it out).

### Setup — POST `/api/setup`
- Cria/ajusta tabelas: `process_logs`, `alliance_cache`, `monthly_kda`, `monthly_kda_config`
- Habilita RLS e políticas básicas e cria índices

Exemplo:

```bash
curl -X POST http://localhost:3000/api/setup
```

Resposta (sucesso):

```json
{
  "success": true,
  "message": "Setup concluído com sucesso!",
  "tables_created": ["process_logs","alliance_cache","monthly_kda","monthly_kda_config"]
}
```

Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

### Processar Log — POST `/api/process-log`
Recebe um arquivo `.log` e parâmetros opcionais.

Form-Data:
- `file`: arquivo .log
- `territorio`: `Calpheon|Kamasylvia|Siege`
- `node`: texto livre
- `slowMode`: `1|true|on` para reduzir concorrência

Resposta (resumo):

```json
{
  "guild": "Lollipop",
  "guilds": ["Lollipop","Chernobyl", "..."] ,
  "totalGeral": 87,
  "totalPorClasse": [{"classe":"warrior","count":10}],
  "classes": {"warrior":[{"nick":"...","familia":"..."}]},
  "classesByGuild": {"Lollipop": {"warrior": []}},
  "killsByGuild": {"Lollipop": 120},
  "deathsByGuild": {"Chernobyl": 110},
  "kdRatioByGuild": {"Lollipop": 1.2},
  "killsMatrix": {"Lollipop":{"Chernobyl": 80}},
  "playerStatsByGuild": {"Lollipop": {"Nick": {"kills":0,"deaths":0,"classe":"","familia":""}}},
  "territorio": "Calpheon",
  "node": "Node War 09/2025",
  "guildasAdversarias": ["Chernobyl"],
  "detectedGuilds": ["..."]
}
```

Notas:
- Detecta guildas automaticamente a partir do texto.
- Usa Axios + Cheerio para buscar classe/família por nick, com cache e fallback mock.

---

### Listar/Excluir Logs — GET/DELETE `/api/process-logs`
- GET: `?month=YYYY-MM` (opcional). Retorna lista com metadados.
- DELETE: remove o último log inserido.

Exemplo GET:

```bash
curl "http://localhost:3000/api/process-logs?month=2025-09"
```

---

### KDA Mensal — GET/POST `/api/process-monthly-kda`
Consolida estatísticas mensais por jogador (guildas da aliança).

- GET params:
  - `month=YYYY-MM` (default mês atual)
  - `nodes_only=true` (exclui Siege)
- POST body JSON:
  - `forceReprocess` (boolean), `monthYear`, `cleanInactivePlayers` (boolean), `refreshAllianceCache` (boolean)

Retorna:

```json
{
  "success": true,
  "month_year": "2025-09",
  "total_players": 123,
  "total_logs_processed": 7,
  "players": [{
    "player_nick": "...",
    "guilda": "Manifest",
    "classes_played": [{"classe":"warrior","kills":5,"deaths":2}],
    "total_kills": 20,
    "total_deaths": 10,
    "kd_overall": 2
  }]
}
```

---

### Filtros K/D — GET/POST `/api/kda-filters`
Calcula K/D por jogador a partir de um `combatLog` textual.

- GET params: `combatLog`, `minKills`, `minKdOverall`, `minKdVsChernobyl`, `minKdVsOthers`, `guilda`
- POST JSON: `{ combatLog: string, filters?: { ... } }`

Retorna lista ordenada por `kdOverall` com sumário.

---

### Cache da Aliança — GET/POST `/api/alliance-cache`
- GET: retorna membros deduplicados e última atualização
- POST: força atualização raspando páginas das guildas `Manifest`, `Allyance`, `Grand_Order`

Requer: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (leitura) para persistência.

---

### Rastreamento de Famílias — GET/POST `/api/family-tracking`
- GET: `?familias=a,b,c` retorna classes por família
- POST: `{ familias: string[] }` processa em lotes

---

### Debug de Ambiente — GET `/api/debug-env`
Mostra status das variáveis essenciais e conecta no Supabase REST.

---

### Players Gearscore — GET/POST `/api/players-gearscore`
- GET params:
  - `guild` (default `lollipop`), `limit`, `sortBy`, `order`, `history=true`, `userId`, `asOf`, `closest=1`, `windowDays`, `skipAllianceFilter=1`
- POST:
  - multipart: `file` JSON com players; `guild`; `dryRun=1`
  - JSON individual: `{ user_id, family_name, character_name, main_class, ap, aap, dp, link_gear }`

Retorna lista processada, estatísticas agregadas e (opcional) histórico.

---

### Node Gearscore — GET `/api/node-gearscore`
Parâmetros: `node`, `date` (ISO), `guild` (default `lollipop`)

Retorna média e distribuição de GS para participantes da node referenciada em `process_logs`.


