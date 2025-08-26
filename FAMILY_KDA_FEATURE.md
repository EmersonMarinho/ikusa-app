# Funcionalidade de KDA por Família

## Visão Geral

Esta funcionalidade permite visualizar o KDA (Kill/Death Ratio) agrupado por família, unificando jogadores que pertencem à mesma família mas jogam com diferentes classes.

## Como Funciona

### 1. Agrupamento por Família
- Jogadores como **Klakson** e **Etheriya** que pertencem à família **Skito** são automaticamente agrupados
- O sistema soma todas as estatísticas de todas as classes de uma família
- Cada família mantém seu nome original (ex: Skito)

### 2. Visualização por Família
- **Aba "Por Jogador"**: Mostra a visualização tradicional com cada jogador individualmente
- **Aba "Por Família"**: Mostra cards agrupados por família com todas as classes

### 3. Cards de Família
Cada card de família mostra:
- **Nome da família** e **guilda**
- **Estatísticas gerais**: Total de kills, deaths e K/D geral
- **Lista de classes**: Cada classe com seu K/D individual
- **Filtros**: Por guilda (Manifest, Allyance, Grand_Order)

### 4. Modal de Detalhes da Classe
Ao clicar em uma classe específica, abre um modal mostrando:
- **Estatísticas gerais** da classe
- **Performance vs Chernobyl** (guilda inimiga)
- **Performance vs Outros** (outras guildas)
- **Última atividade** da classe

## Exemplo de Uso

### Cenário: Família Skito
- **Klakson** joga com classe **Dosa**
- **Etheriya** joga com classe **Ranger**
- Ambos são da família **Skito**

### Resultado:
- **Card da Família Skito** mostra:
  - Total de kills/deaths de ambas as classes
  - K/D geral da família
  - Lista das 2 classes (Dosa e Ranger)

### Interação:
- Clicar em **Dosa** abre modal com KDA detalhado da classe Dosa
- Clicar em **Ranger** abre modal com KDA detalhado da classe Ranger

## Benefícios

1. **Visão Consolidada**: Permite ver o desempenho geral de uma família
2. **Análise por Classe**: Mantém a granularidade para análise individual
3. **Identificação de Famílias Fortes**: Facilita identificar famílias com múltiplas classes ativas
4. **Estratégia de Aliança**: Ajuda na organização de eventos e raids

## Filtros Disponíveis

- **Por Guilda**: Manifest, Allyance, Grand_Order
- **Por Métrica**: K/D Geral, K/D vs Chernobyl, K/D vs Outros
- **Por Classe**: Filtra jogadores por classe específica

## Dados Processados

O sistema processa automaticamente:
- Logs de combate mensais
- Mapeamento de jogador → família
- Mapeamento de família → guilda
- Consolidação de estatísticas por classe
- Cálculo de K/D ratios

## Arquivos Modificados

- `app/kda-mensal/page.tsx` - Página principal com abas
- `components/shared/family-card.tsx` - Card de família
- `components/shared/class-details-modal.tsx` - Modal de detalhes da classe

## Como Testar

1. Acesse `/kda-mensal`
2. Processe alguns logs de combate
3. Mude para a aba "Por Família"
4. Clique em uma classe para ver detalhes
5. Use os filtros para explorar diferentes guildas

## Notas Técnicas

- Os dados são agrupados em tempo real
- Cache automático para performance
- Responsivo para dispositivos móveis
- Integração com sistema existente de KDA
