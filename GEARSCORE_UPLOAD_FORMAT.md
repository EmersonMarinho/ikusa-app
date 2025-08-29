# Formato JSON para Upload de Gearscore

Este documento descreve o formato JSON esperado para fazer upload de dados de gearscore dos players.

## Estrutura do Arquivo

O arquivo deve ser um array JSON contendo objetos de players, onde cada objeto representa um player com suas estatísticas de gearscore.

## Campos Obrigatórios

- `user_id`: ID único do player (número)
- `family_name`: Nome da família do player (string)
- `character_name`: Nome do personagem (string)
- `main_class`: Classe principal do personagem (string)
- `ap`: Attack Power (número)
- `aap`: Awakened Attack Power (número)
- `dp`: Defense Power (número)

## Campos Opcionais

- `link_gear`: Link para o gear no Garmoth (string, opcional)

## Exemplo de Arquivo JSON

```json
[
  {
    "user_id": 12345,
    "family_name": "PlayerName",
    "character_name": "CharacterName",
    "main_class": "Warrior",
    "ap": 280,
    "aap": 290,
    "dp": 350,
    "link_gear": "https://garmoth.com/gear/12345"
  },
  {
    "user_id": 67890,
    "family_name": "AnotherPlayer",
    "character_name": "AnotherChar",
    "main_class": "Sorceress",
    "ap": 275,
    "aap": 285,
    "dp": 340
  }
]
```

## Como Usar

1. Prepare seu arquivo JSON seguindo o formato acima
2. Acesse a página de Gearscore
3. Clique em "Selecionar" e escolha seu arquivo JSON
4. Clique em "Enviar" para fazer o upload
5. O sistema processará cada player e atualizará o banco de dados

## Observações

- O gearscore total é calculado automaticamente como `Math.max(ap, aap) + dp`
- Players existentes serão atualizados (baseado no `user_id`)
- Novos players serão inseridos
- Cada upload cria um novo registro no histórico de gearscore
- O sistema valida todos os campos obrigatórios antes de processar
