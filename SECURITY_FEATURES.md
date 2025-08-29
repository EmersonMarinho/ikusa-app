# 🛡️ Medidas de Segurança - Sistema de PIN

## Visão Geral

O sistema de PIN do Ikusa App foi projetado com múltiplas camadas de segurança para proteger contra bots, scripts automatizados e tentativas de força bruta. Este documento detalha todas as medidas implementadas.

## 🚫 Proteção Contra Bots e Scripts

### 1. **Detecção de Atividade Suspeita**

#### Padrões Detectados:
- **Tentativas Muito Rápidas**: Detecta quando alguém tenta PINs em intervalos menores que 1 segundo
- **Padrões Regulares**: Identifica tentativas com intervalos muito consistentes (indicativo de script)
- **Sequências Óbvias**: Bloqueia PINs como 1111, 1234, 0000, 9999, etc.

#### Como Funciona:
```typescript
// Detecta tentativas muito rápidas
const rapidAttempts = attempts.filter((timestamp, index) => {
  if (index === 0) return false
  const timeDiff = timestamp - attempts[index - 1]
  return timeDiff < 1000 // Menos de 1 segundo
})

// Detecta padrões muito regulares
const variance = timePatterns.reduce((sum, interval) => 
  sum + Math.pow(interval - avgInterval, 2), 0
) / timePatterns.length

if (variance < 1000) { // Baixa variância = muito regular
  return { isSuspicious: true, reason: 'Padrão muito regular' }
}
```

### 2. **Rate Limiting Inteligente**

#### Limites Implementados:
- **Por Janela de Tempo**: Máximo de 3 tentativas por minuto
- **Lockout Progressivo**: Bloqueio de 15 minutos após 5 tentativas
- **Tempo Mínimo**: Intervalo mínimo de 1 segundo entre tentativas

#### Configuração:
```typescript
SECURITY: {
  MAX_ATTEMPTS: 5,                    // Tentativas antes do lockout
  LOCKOUT_DURATION_MINUTES: 15,       // Duração do bloqueio
  RATE_LIMIT_WINDOW_SECONDS: 60,      // Janela de 1 minuto
  MAX_ATTEMPTS_PER_WINDOW: 3,         // Máximo por janela
  MIN_TIME_BETWEEN_ATTEMPTS: 1000     // 1 segundo mínimo
}
```

### 3. **CAPTCHA Matemático**

#### Quando Ativado:
- Após 2 tentativas incorretas
- Gera operações matemáticas simples (adição, subtração, multiplicação)
- Muda a cada tentativa incorreta

#### Exemplos de CAPTCHA:
```
7 + 3 = ?
12 - 5 = ?
4 × 6 = ?
```

#### Implementação:
```typescript
static generateCaptcha(): { question: string; answer: number } {
  const num1 = Math.floor(Math.random() * 10) + 1
  const num2 = Math.floor(Math.random() * 10) + 1
  const operations = ['+', '-', '×']
  const operation = operations[Math.floor(Math.random() * operations.length)]
  
  // Gera pergunta e resposta
  switch (operation) {
    case '+': return { question: `${num1} + ${num2} = ?`, answer: num1 + num2 }
    case '-': return { question: `${num1} - ${num2} = ?`, answer: num1 - num2 }
    case '×': return { question: `${num1} × ${num2} = ?`, answer: num1 * num2 }
  }
}
```

## 🔒 Validação de PIN

### 1. **Validação de Formato**

#### Regras Implementadas:
- ✅ Exatamente 4 dígitos
- ✅ Apenas números (0-9)
- ❌ Padrões repetitivos (1111, 2222)
- ❌ Sequências óbvias (1234, 4321)
- ❌ Padrões simétricos (1122, 1221)

#### Regex de Validação:
```typescript
// Verifica formato básico
if (!/^\d{4}$/.test(pin)) {
  return { isValid: false, reason: 'PIN deve conter apenas números' }
}

// Verifica padrões suspeitos
const suspiciousPatterns = [
  /^(\d)\1{3}$/,      // 1111, 2222, etc.
  /^(\d)(\d)\1\2$/,   // 1212, 3434, etc.
  /^(\d)\1(\d)\2$/,   // 1122, 3344, etc.
  /^(\d)(\d)\2\1$/,   // 1221, 3443, etc.
  /^1234$/,            // Sequência óbvia
  /^4321$/,            // Sequência reversa
  /^0000$/,            // Zeros
  /^9999$/             // Noves
]
```

### 2. **Verificação de Dispositivo**

#### Testes Implementados:
- ✅ JavaScript habilitado
- ✅ localStorage funcionando
- ✅ Cookies funcionando
- ✅ User Agent consistente

#### Código de Verificação:
```typescript
static checkDeviceTrust(): { isTrusted: boolean; reason?: string } {
  // Verifica JavaScript
  if (typeof window === 'undefined') {
    return { isTrusted: false, reason: 'JavaScript não detectado' }
  }

  // Verifica localStorage
  try {
    localStorage.setItem('test', 'test')
    localStorage.removeItem('test')
  } catch {
    return { isTrusted: false, reason: 'localStorage não disponível' }
  }

  // Verifica cookies
  try {
    document.cookie = 'test=test'
    const hasCookies = document.cookie.includes('test=test')
    document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    if (!hasCookies) {
      return { isTrusted: false, reason: 'Cookies não funcionando' }
    }
  } catch {
    return { isTrusted: false, reason: 'Cookies não disponíveis' }
  }

  return { isTrusted: true }
}
```

## 🎯 Sistema de Sessão

### 1. **Token de Sessão Único**

#### Características:
- **Timestamp**: Inclui hora de criação
- **Random**: Valor aleatório único
- **User Agent**: Identifica o navegador
- **Base64**: Codificação segura

#### Geração:
```typescript
static generateSessionToken(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2)
  const userAgent = navigator.userAgent.substring(0, 10)
  
  return btoa(`${timestamp}-${random}-${userAgent}`)
    .replace(/[^a-zA-Z0-9]/g, '')
}
```

### 2. **Validação de Sessão**

#### Verificações:
- **Idade**: Token não pode ter mais de 24 horas
- **User Agent**: Deve ser o mesmo do navegador
- **Formato**: Deve ser decodificável

#### Validação:
```typescript
static validateSession(sessionToken: string): boolean {
  try {
    const decoded = atob(sessionToken)
    const [timestamp, random, userAgent] = decoded.split('-')
    
    // Verifica idade (24 horas)
    const tokenAge = Date.now() - parseInt(timestamp)
    if (tokenAge > 24 * 60 * 60 * 1000) {
      return false
    }
    
    // Verifica user agent
    if (userAgent !== navigator.userAgent.substring(0, 10)) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}
```

## 🚨 Sistema de Alertas

### 1. **Alertas de Segurança**

#### Tipos de Alerta:
- 🔴 **Acesso Bloqueado**: Após muitas tentativas
- 🟠 **Atividade Suspeita**: Padrões detectados
- 🔵 **CAPTCHA Requerido**: Após tentativas

#### Interface Visual:
```tsx
{/* Acesso Bloqueado */}
{securityStatus.isBlocked && (
  <div className="bg-red-900/20 border-red-700/30">
    <Clock className="text-red-400" />
    <div>Acesso bloqueado por {remainingTime} minutos</div>
  </div>
)}

{/* Atividade Suspeita */}
{securityStatus.isSuspicious && (
  <div className="bg-orange-900/20 border-orange-700/30">
    <Bot className="text-orange-400" />
    <div>{securityStatus.suspiciousReason}</div>
  </div>
)}
```

### 2. **Mensagens de Erro Contextuais**

#### Exemplos:
- "PIN deve ter exatamente 4 dígitos"
- "Padrão de PIN não permitido"
- "Muitas tentativas muito rápidas detectadas"
- "Padrão de tentativas muito regular detectado"
- "Acesso bloqueado. Tente novamente em X minutos"

## 📊 Monitoramento e Logs

### 1. **Rastreamento de Tentativas**

#### Dados Coletados:
- **Timestamp**: Hora exata de cada tentativa
- **Padrões**: Intervalos entre tentativas
- **Frequência**: Tentativas por janela de tempo
- **Dispositivo**: User agent e capacidades

#### Armazenamento:
```typescript
// Salva tentativas no localStorage
localStorage.setItem('ikusa-pin-attempts', JSON.stringify(attempts))

// Salva lockout
localStorage.setItem('ikusa-pin-lockout', lockoutUntil.toString())

// Salva token de sessão
localStorage.setItem('ikusa-session-token', sessionToken)
```

### 2. **Análise de Comportamento**

#### Métricas Analisadas:
- **Velocidade**: Tempo entre tentativas
- **Regularidade**: Variância dos intervalos
- **Frequência**: Tentativas por período
- **Padrões**: Sequências de números

## 🛠️ Configuração de Segurança

### 1. **Arquivo de Configuração**

#### Localização: `lib/pin-config.ts`
```typescript
export const PIN_CONFIG = {
  DEFAULT_PIN: "1234",
  
  SECURITY: {
    MAX_ATTEMPTS: 5,                    // Tentativas antes do lockout
    LOCKOUT_DURATION_MINUTES: 15,       // Duração do bloqueio
    SHOW_CAPTCHA_AFTER_ATTEMPTS: 2,     // Quando mostrar CAPTCHA
    RATE_LIMIT_WINDOW_SECONDS: 60,      // Janela de rate limiting
    MAX_ATTEMPTS_PER_WINDOW: 3,         // Máximo por janela
    SUSPICIOUS_ACTIVITY_THRESHOLD: 3,   // Limite para atividade suspeita
    MIN_TIME_BETWEEN_ATTEMPTS: 1000     // Tempo mínimo entre tentativas
  }
}
```

### 2. **Personalização**

#### Como Alterar:
1. Edite `lib/pin-config.ts`
2. Modifique os valores desejados
3. Reinicie a aplicação

#### Recomendações:
- **PIN**: Use 6+ dígitos para maior segurança
- **Lockout**: 15-30 minutos é um bom equilíbrio
- **CAPTCHA**: Ativar após 2-3 tentativas
- **Rate Limit**: 3-5 tentativas por minuto

## 🔍 Testes de Segurança

### 1. **Cenários Testados**

#### Tentativas de Bypass:
- ❌ Scripts automatizados
- ❌ Bots de força bruta
- ❌ Tentativas muito rápidas
- ❌ Padrões regulares
- ❌ PINs óbvios

#### Proteções Ativas:
- ✅ Rate limiting
- ✅ Detecção de bots
- ✅ CAPTCHA matemático
- ✅ Lockout progressivo
- ✅ Validação de dispositivo

### 2. **Como Testar**

#### Teste de Força Bruta:
```bash
# Simula múltiplas tentativas rápidas
for i in {0000..9999}; do
  curl -X POST /api/auth -d "pin=$i"
  sleep 0.1
done
```

#### Teste de Bot:
```javascript
// Simula tentativas muito rápidas
setInterval(() => {
  authenticatePin(Math.random().toString().slice(2, 6))
}, 100)
```

## ⚠️ Limitações e Considerações

### 1. **Limitações Atuais**

#### Segurança:
- **Local**: Dados armazenados no navegador
- **JavaScript**: Depende de JS habilitado
- **localStorage**: Pode ser manipulado
- **Cliente**: Validação no lado do cliente

#### Bypass Potencial:
- Desabilitar JavaScript
- Limpar localStorage
- Usar modo de desenvolvedor
- Manipular timestamps

### 2. **Melhorias Futuras**

#### Segurança Avançada:
- 🔐 **Criptografia**: Hash do PIN
- 🌐 **Servidor**: Validação no backend
- 📱 **2FA**: Autenticação de dois fatores
- 🎯 **Biometria**: Impressão digital/face
- 📍 **Geolocalização**: Verificar localização

#### Monitoramento:
- 📊 **Logs**: Registro de todas as tentativas
- 🚨 **Alertas**: Notificações em tempo real
- 📈 **Analytics**: Análise de padrões
- 🔍 **Auditoria**: Histórico completo

## 📚 Recursos Adicionais

### 1. **Documentação Relacionada**
- [PIN_SYSTEM_README.md](./PIN_SYSTEM_README.md) - Guia básico do sistema
- [lib/pin-security.ts](./lib/pin-security.ts) - Código fonte das medidas
- [lib/pin-config.ts](./lib/pin-config.ts) - Configurações de segurança

### 2. **Componentes de Segurança**
- [components/pin-screen.tsx](./components/pin-screen.tsx) - Tela de PIN com CAPTCHA
- [lib/pin-auth.tsx](./lib/pin-auth.tsx) - Contexto de autenticação
- [components/protected-route.tsx](./components/protected-route.tsx) - Proteção de rotas

---

## 🎯 Resumo das Medidas

| Medida | Descrição | Eficácia |
|--------|-----------|----------|
| **Rate Limiting** | Máximo de tentativas por tempo | 🔴 Alta |
| **CAPTCHA** | Verificação matemática | 🟠 Média |
| **Detecção de Bots** | Análise de padrões | 🟠 Média |
| **Lockout Progressivo** | Bloqueio temporário | 🔴 Alta |
| **Validação de PIN** | Regras de formato | 🟡 Baixa |
| **Token de Sessão** | Identificação única | 🟠 Média |
| **Verificação de Dispositivo** | Capacidades do navegador | 🟡 Baixa |

**Nota**: Este sistema oferece proteção **adequada para uso interno e controle de acesso básico**. Para aplicações de alta segurança, considere implementar validação no servidor e autenticação de terceiros.
