// Configuração do PIN de acesso
// Altere este valor para o PIN desejado
export const PIN_CONFIG = {
  // PIN padrão para acesso ao sistema
  DEFAULT_PIN: "8575",
  
  // Nome do sistema
  SYSTEM_NAME: "Ikusa - Guild Log Processor",
  
  // Mensagem de boas-vindas
  WELCOME_MESSAGE: "Sistema protegido por PIN de acesso",
  
  // Tempo de sessão (em milissegundos) - 24 horas
  SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  // Chave para armazenamento local
  STORAGE_KEY: "ikusa-auth",
  
  // Configurações de Segurança
  SECURITY: {
    // Máximo de tentativas antes do lockout
    MAX_ATTEMPTS: 5,
    
    // Duração do lockout em minutos
    LOCKOUT_DURATION_MINUTES: 15,
    
    // Mostrar CAPTCHA após quantas tentativas
    SHOW_CAPTCHA_AFTER_ATTEMPTS: 2,
    
    // Janela de tempo para rate limiting (em segundos)
    RATE_LIMIT_WINDOW_SECONDS: 60,
    
    // Máximo de tentativas por janela de tempo
    MAX_ATTEMPTS_PER_WINDOW: 3,
    
    // Detectar atividade suspeita após quantas tentativas
    SUSPICIOUS_ACTIVITY_THRESHOLD: 3,
    
    // Tempo mínimo entre tentativas (em milissegundos)
    MIN_TIME_BETWEEN_ATTEMPTS: 1000
  }
}
