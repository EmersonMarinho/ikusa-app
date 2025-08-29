# Sistema de PIN - Ikusa App

## Visão Geral

O sistema de PIN foi implementado para proteger todas as páginas do aplicativo Ikusa, garantindo que apenas usuários autorizados possam acessar as informações sensíveis do sistema.

## Como Funciona

### 1. **Proteção Automática**
- Todas as páginas principais estão protegidas pelo sistema de PIN
- Usuários não autenticados verão a tela de PIN antes de acessar qualquer conteúdo
- O sistema verifica automaticamente se o usuário está autenticado

### 2. **Autenticação por PIN**
- **PIN Padrão**: `1234`
- O PIN é verificado localmente no navegador
- Após autenticação bem-sucedida, o usuário permanece logado até fazer logout

### 3. **Persistência de Sessão**
- A autenticação é mantida mesmo após fechar e reabrir o navegador
- O usuário só precisa digitar o PIN uma vez por sessão

## Configuração

### Alterar o PIN

Para alterar o PIN padrão, edite o arquivo `lib/pin-config.ts`:

```typescript
export const PIN_CONFIG = {
  // Altere este valor para o PIN desejado
  DEFAULT_PIN: "1234", // ← Mude para o PIN desejado
  
  // Outras configurações...
}
```

### Personalizar Mensagens

No mesmo arquivo, você pode personalizar:

```typescript
export const PIN_CONFIG = {
  DEFAULT_PIN: "1234",
  
  // Nome do sistema na tela de login
  SYSTEM_NAME: "Ikusa - Guild Log Processor",
  
  // Mensagem de boas-vindas
  WELCOME_MESSAGE: "Sistema protegido por PIN de acesso",
  
  // Duração da sessão (24 horas por padrão)
  SESSION_DURATION: 24 * 60 * 60 * 1000,
}
```

## Páginas Protegidas

As seguintes páginas estão protegidas pelo sistema de PIN:

- **Página Principal** (`/`) - Upload de logs
- **Histórico** (`/history`) - Histórico de logs
- **Comparar** (`/compare`) - Comparação de guildas
- **KDA Mensal** (`/kda-mensal`) - Estatísticas mensais
- **Gearscore** (`/gearscore`) - Ranking de gearscore

## Funcionalidades

### 1. **Tela de PIN**
- Design moderno e responsivo
- Validação em tempo real
- Mensagens de erro claras
- Foco automático no campo de PIN

### 2. **Header com Logout**
- Botão de logout visível quando autenticado
- Localizado no canto direito do header
- Estilo destacado em vermelho para fácil identificação

### 3. **Proteção de Rotas**
- Componente `ProtectedRoute` envolve todas as páginas
- Redirecionamento automático para tela de PIN se não autenticado
- Integração transparente com o layout existente

## Segurança

### **Limitações**
- ⚠️ **Atenção**: Este é um sistema de proteção básico
- O PIN é armazenado localmente no navegador
- Não há criptografia ou proteção contra engenharia reversa
- Adequado para controle de acesso simples, não para dados altamente sensíveis

### **Recomendações**
- Use um PIN complexo (6+ dígitos)
- Altere o PIN regularmente
- Não compartilhe o PIN com usuários não autorizados
- Considere implementar autenticação mais robusta para produção

## Estrutura de Arquivos

```
lib/
├── pin-auth.tsx          # Contexto de autenticação
├── pin-config.ts         # Configurações do sistema
components/
├── pin-screen.tsx        # Tela de entrada do PIN
├── protected-route.tsx   # Componente de proteção
app/
├── layout.tsx            # Layout principal com provider
└── [páginas protegidas]  # Todas as páginas principais
```

## Uso

### **Para Usuários**
1. Acesse qualquer página do sistema
2. Digite o PIN correto na tela de autenticação
3. Acesse normalmente todas as funcionalidades
4. Use o botão "Sair" no header para fazer logout

### **Para Desenvolvedores**
1. O sistema é transparente para componentes existentes
2. Use `usePinAuth()` hook para verificar status de autenticação
3. Envolva páginas com `<ProtectedRoute>` para proteção automática
4. Configure o PIN em `pin-config.ts`

## Solução de Problemas

### **PIN não funciona**
- Verifique se o PIN está correto em `pin-config.ts`
- Limpe o cache do navegador
- Verifique se não há erros no console

### **Página não carrega**
- Verifique se o `ProtectedRoute` está envolvendo a página
- Confirme se o `PinAuthProvider` está no layout principal
- Verifique se não há erros de importação

### **Logout não funciona**
- Verifique se o hook `usePinAuth` está sendo usado corretamente
- Confirme se a função `logout` está sendo chamada
- Verifique se não há erros no localStorage

## Próximos Passos

Para melhorar a segurança, considere:

1. **Implementar PIN com expiração**
2. **Adicionar tentativas limitadas**
3. **Implementar PIN por usuário**
4. **Adicionar autenticação de dois fatores**
5. **Integrar com sistema de usuários existente**

---

**Nota**: Este sistema foi projetado para ser simples e eficaz para controle de acesso básico. Para aplicações que requerem maior segurança, considere implementar soluções mais robustas como JWT, OAuth ou autenticação de terceiros.
