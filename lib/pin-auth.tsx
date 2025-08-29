"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { PIN_CONFIG } from './pin-config'
import { PinSecurity } from './pin-security'

interface PinAuthContextType {
  isAuthenticated: boolean
  authenticate: (pin: string, captchaAnswer?: number) => { success: boolean; reason?: string }
  logout: () => void
  securityStatus: {
    isBlocked: boolean
    remainingTime?: number
    shouldShowCaptcha: boolean
    isSuspicious: boolean
    suspiciousReason?: string
  }
}

const PinAuthContext = createContext<PinAuthContextType | undefined>(undefined)

export function PinAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [securityStatus, setSecurityStatus] = useState({
    isBlocked: false,
    remainingTime: undefined as number | undefined,
    shouldShowCaptcha: false,
    isSuspicious: false,
    suspiciousReason: undefined as string | undefined
  })

  // Verifica se já está autenticado ao carregar a página
  useEffect(() => {
    const authStatus = localStorage.getItem(PIN_CONFIG.STORAGE_KEY)
    const sessionToken = localStorage.getItem('ikusa-session-token')
    
    // Verifica se há manipulação do localStorage
    const tampering = PinSecurity.detectTampering()
    if (tampering.isTampered) {
      console.warn('Manipulação detectada:', tampering.reason)
      PinSecurity.clearAllAuthData()
      setIsAuthenticated(false)
      return
    }
    
    // Verifica se a sessão é válida
    if (authStatus === 'true' && sessionToken) {
      const expectedPinHash = PinSecurity.hashPin(PIN_CONFIG.DEFAULT_PIN)
      const isValidSession = PinSecurity.validateSession(sessionToken, expectedPinHash)
      
      if (isValidSession) {
        setIsAuthenticated(true)
      } else {
        // Sessão inválida, limpa dados
        PinSecurity.clearAllAuthData()
        setIsAuthenticated(false)
      }
    }
    
    // Atualiza status de segurança
    updateSecurityStatus()
  }, [])

  const updateSecurityStatus = () => {
    const bruteForce = PinSecurity.checkBruteForceAttempts()
    const suspicious = PinSecurity.checkSuspiciousActivity()
    const shouldShowCaptcha = PinSecurity.shouldShowCaptcha()
    
    setSecurityStatus({
      isBlocked: bruteForce.isBlocked,
      remainingTime: bruteForce.remainingTime,
      shouldShowCaptcha,
      isSuspicious: suspicious.isSuspicious,
      suspiciousReason: suspicious.reason
    })
  }

  const authenticate = (pin: string, captchaAnswer?: number): { success: boolean; reason?: string } => {
    // Verifica se está bloqueado
    const bruteForce = PinSecurity.checkBruteForceAttempts()
    if (bruteForce.isBlocked) {
      return { 
        success: false, 
        reason: `Acesso bloqueado. Tente novamente em ${Math.ceil((bruteForce.remainingTime || 0) / 1000 / 60)} minutos.` 
      }
    }

    // Verifica atividade suspeita
    const suspicious = PinSecurity.checkSuspiciousActivity()
    if (suspicious.isSuspicious) {
      return { 
        success: false, 
        reason: `Atividade suspeita detectada: ${suspicious.reason}` 
      }
    }

    // Verifica se deve mostrar CAPTCHA
    if (PinSecurity.shouldShowCaptcha() && !captchaAnswer) {
      return { 
        success: false, 
        reason: 'CAPTCHA requerido para continuar' 
      }
    }

    // Valida o PIN
    const pinValidation = PinSecurity.validatePin(pin)
    if (!pinValidation.isValid) {
      PinSecurity.recordAttempt()
      updateSecurityStatus()
      return { success: false, reason: pinValidation.reason }
    }

    // Verifica se o PIN está correto
    if (pin === PIN_CONFIG.DEFAULT_PIN) {
      setIsAuthenticated(true)
      const sessionToken = PinSecurity.generateSessionToken(pin)
      localStorage.setItem(PIN_CONFIG.STORAGE_KEY, 'true')
      localStorage.setItem('ikusa-session-token', sessionToken)
      
      // Limpa dados de segurança após login bem-sucedido
      PinSecurity.clearSecurityData()
      updateSecurityStatus()
      
      return { success: true }
    } else {
      PinSecurity.recordAttempt()
      updateSecurityStatus()
      return { success: false, reason: 'PIN incorreto' }
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem(PIN_CONFIG.STORAGE_KEY)
    localStorage.removeItem('ikusa-session-token')
    PinSecurity.clearSecurityData()
    updateSecurityStatus()
  }

  return (
    <PinAuthContext.Provider value={{ isAuthenticated, authenticate, logout, securityStatus }}>
      {children}
    </PinAuthContext.Provider>
  )
}

export function usePinAuth() {
  const context = useContext(PinAuthContext)
  if (context === undefined) {
    throw new Error('usePinAuth deve ser usado dentro de um PinAuthProvider')
  }
  return context
}
