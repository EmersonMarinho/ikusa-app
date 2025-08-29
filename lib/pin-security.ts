// Sistema de segurança avançado para proteção contra bots e scripts
export class PinSecurity {
  private static readonly MAX_ATTEMPTS = 5
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutos
  private static readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 3
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto
  private static readonly MAX_ATTEMPTS_PER_WINDOW = 3
  private static readonly MIN_TIME_BETWEEN_ATTEMPTS = 1000 // 1 segundo

  // Gera hash simples do PIN (não é criptografia real, mas dificulta)
  static hashPin(pin: string): string {
    let hash = 0
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Converte para 32-bit integer
    }
    return hash.toString(36) + pin.length.toString()
  }

  // Verifica se o PIN é válido com validações avançadas
  static validatePin(pin: string): { isValid: boolean; reason?: string } {
    // Validação básica
    if (!pin || pin.length !== 4) {
      return { isValid: false, reason: 'PIN deve ter exatamente 4 dígitos' }
    }

    // Verifica se contém apenas números
    if (!/^\d{4}$/.test(pin)) {
      return { isValid: false, reason: 'PIN deve conter apenas números' }
    }

    // Verifica padrões suspeitos
    if (this.isSuspiciousPattern(pin)) {
      return { isValid: false, reason: 'Padrão de PIN não permitido' }
    }

    return { isValid: true }
  }

  // Detecta padrões suspeitos
  private static isSuspiciousPattern(pin: string): boolean {
    const patterns = [
      /^(\d)\1{3}$/, // 1111, 2222, etc.
      /^(\d)(\d)\1\2$/, // 1212, 3434, etc.
      /^(\d)\1(\d)\2$/, // 1122, 3344, etc.
      /^(\d)(\d)\2\1$/, // 1221, 3443, etc.
      /^1234$/, // Sequência óbvia
      /^4321$/, // Sequência reversa
      /^0000$/, // Zeros
      /^9999$/, // Noves
    ]

    return patterns.some(pattern => pattern.test(pin))
  }

  // Verifica tentativas de força bruta
  static checkBruteForceAttempts(): { isBlocked: boolean; remainingTime?: number } {
    const attempts = this.getAttempts()
    const now = Date.now()

    // Remove tentativas antigas
    const recentAttempts = attempts.filter(timestamp => 
      now - timestamp < this.RATE_LIMIT_WINDOW
    )

    // Verifica se excedeu o limite por janela de tempo
    if (recentAttempts.length >= this.MAX_ATTEMPTS_PER_WINDOW) {
      const oldestAttempt = Math.min(...recentAttempts)
      const remainingTime = this.RATE_LIMIT_WINDOW - (now - oldestAttempt)
      return { isBlocked: true, remainingTime }
    }

    // Verifica se está em lockout
    const lockoutUntil = this.getLockoutUntil()
    if (lockoutUntil && now < lockoutUntil) {
      return { isBlocked: true, remainingTime: lockoutUntil - now }
    }

    return { isBlocked: false }
  }

  // Registra uma tentativa de acesso
  static recordAttempt(): void {
    const attempts = this.getAttempts()
    attempts.push(Date.now())
    
    // Mantém apenas as tentativas recentes
    const now = Date.now()
    const recentAttempts = attempts.filter(timestamp => 
      now - timestamp < this.LOCKOUT_DURATION
    )

    localStorage.setItem('ikusa-pin-attempts', JSON.stringify(recentAttempts))

    // Verifica se deve ativar lockout
    if (recentAttempts.length >= this.MAX_ATTEMPTS) {
      this.activateLockout()
    }
  }

  // Ativa lockout por muitas tentativas
  private static activateLockout(): void {
    const lockoutUntil = Date.now() + this.LOCKOUT_DURATION
    localStorage.setItem('ikusa-pin-lockout', lockoutUntil.toString())
    
    // Limpa tentativas antigas
    localStorage.removeItem('ikusa-pin-attempts')
  }

  // Verifica atividade suspeita
  static checkSuspiciousActivity(): { isSuspicious: boolean; reason?: string } {
    const attempts = this.getAttempts()
    const now = Date.now()
    
    // Verifica tentativas muito rápidas (bot)
    const rapidAttempts = attempts.filter((timestamp, index) => {
      if (index === 0) return false
      const timeDiff = timestamp - attempts[index - 1]
      return timeDiff < 1000 // Menos de 1 segundo entre tentativas
    })

    if (rapidAttempts.length >= this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
      return { 
        isSuspicious: true, 
        reason: 'Muitas tentativas muito rápidas detectadas' 
      }
    }

    // Verifica padrão de tentativas (script)
    const timePatterns = attempts.map((timestamp, index) => {
      if (index === 0) return 0
      return timestamp - attempts[index - 1]
    }).slice(1)

    // Detecta intervalos muito regulares (indicativo de script)
    if (timePatterns.length >= 3) {
      const avgInterval = timePatterns.reduce((a, b) => a + b, 0) / timePatterns.length
      const variance = timePatterns.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0
      ) / timePatterns.length
      
      // Baixa variância indica intervalos muito regulares
      if (variance < 1000) { // Menos de 1 segundo de variância
        return { 
          isSuspicious: true, 
          reason: 'Padrão de tentativas muito regular detectado' 
        }
      }
    }

    return { isSuspicious: false }
  }

  // Gera CAPTCHA simples
  static generateCaptcha(): { question: string; answer: number } {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    const operations = ['+', '-', '×']
    const operation = operations[Math.floor(Math.random() * operations.length)]
    
    let answer: number
    let question: string
    
    switch (operation) {
      case '+':
        answer = num1 + num2
        question = `${num1} + ${num2} = ?`
        break
      case '-':
        answer = num1 - num2
        question = `${num1} - ${num2} = ?`
        break
      case '×':
        answer = num1 * num2
        question = `${num1} × ${num2} = ?`
        break
      default:
        answer = num1 + num2
        question = `${num1} + ${num2} = ?`
    }
    
    return { question, answer }
  }

  // Verifica se deve mostrar CAPTCHA
  static shouldShowCaptcha(): boolean {
    const attempts = this.getAttempts()
    return attempts.length >= 2 // Mostra CAPTCHA após 2 tentativas
  }

  // Limpa dados de segurança (para logout)
  static clearSecurityData(): void {
    localStorage.removeItem('ikusa-pin-attempts')
    localStorage.removeItem('ikusa-pin-lockout')
    localStorage.removeItem('ikusa-pin-captcha')
    localStorage.removeItem('ikusa-auth')
    localStorage.removeItem('ikusa-session-token')
  }

  // Obtém tentativas de acesso
  private static getAttempts(): number[] {
    try {
      const attempts = localStorage.getItem('ikusa-pin-attempts')
      return attempts ? JSON.parse(attempts) : []
    } catch {
      return []
    }
  }

  // Obtém tempo de lockout
  private static getLockoutUntil(): number | null {
    try {
      const lockout = localStorage.getItem('ikusa-pin-lockout')
      return lockout ? parseInt(lockout) : null
    } catch {
      return null
    }
  }

  // Verifica se o dispositivo é confiável
  static checkDeviceTrust(): { isTrusted: boolean; reason?: string } {
    // Verifica se tem JavaScript habilitado (básico)
    if (typeof window === 'undefined') {
      return { isTrusted: false, reason: 'JavaScript não detectado' }
    }

    // Verifica se tem localStorage (básico)
    try {
      localStorage.setItem('test', 'test')
      localStorage.removeItem('test')
    } catch {
      return { isTrusted: false, reason: 'localStorage não disponível' }
    }

    // Verifica se tem cookies (básico)
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

  // Gera token de sessão único com hash do PIN
  static generateSessionToken(pin: string): string {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2)
    const userAgent = navigator.userAgent.substring(0, 10)
    const pinHash = this.hashPin(pin)
    
    return btoa(`${timestamp}-${random}-${userAgent}-${pinHash}`).replace(/[^a-zA-Z0-9]/g, '')
  }

  // Verifica se a sessão é válida
  static validateSession(sessionToken: string, expectedPinHash: string): boolean {
    try {
      const decoded = atob(sessionToken)
      const [timestamp, random, userAgent, pinHash] = decoded.split('-')
      
      // Verifica se o timestamp não é muito antigo (24 horas)
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return false
      }
      
      // Verifica se o user agent ainda é o mesmo
      if (userAgent !== navigator.userAgent.substring(0, 10)) {
        return false
      }

      // Verifica se o hash do PIN ainda é válido
      if (pinHash !== expectedPinHash) {
        return false
      }
      
      return true
    } catch {
      return false
    }
  }

  // Detecta tentativas de manipulação do localStorage
  static detectTampering(): { isTampered: boolean; reason?: string } {
    try {
      // Verifica se há dados inconsistentes
      const authStatus = localStorage.getItem('ikusa-auth')
      const sessionToken = localStorage.getItem('ikusa-session-token')
      
      // Se tem token mas não tem status de auth, pode ser manipulação
      if (sessionToken && !authStatus) {
        return { isTampered: true, reason: 'Token de sessão sem status de autenticação' }
      }

      // Verifica se o token tem formato válido
      if (sessionToken) {
        try {
          const decoded = atob(sessionToken)
          const parts = decoded.split('-')
          if (parts.length !== 4) {
            return { isTampered: true, reason: 'Token de sessão com formato inválido' }
          }
        } catch {
          return { isTampered: true, reason: 'Token de sessão corrompido' }
        }
      }

      return { isTampered: false }
    } catch {
      return { isTampered: true, reason: 'Erro ao verificar integridade' }
    }
  }

  // Limpa todos os dados de autenticação (para reset completo)
  static clearAllAuthData(): void {
    const keysToRemove = [
      'ikusa-auth',
      'ikusa-session-token',
      'ikusa-pin-attempts',
      'ikusa-pin-lockout',
      'ikusa-pin-captcha'
    ]
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}
