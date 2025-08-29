"use client"

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Shield, AlertCircle, AlertTriangle, Clock, Bot } from 'lucide-react'
import { usePinAuth } from '@/lib/pin-auth'
import { PIN_CONFIG } from '@/lib/pin-config'
import { PinSecurity } from '@/lib/pin-security'

export function PinScreen() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaCorrectAnswer, setCaptchaCorrectAnswer] = useState<number>(0)
  const { authenticate, securityStatus } = usePinAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Foca no input quando o componente carrega
    if (inputRef.current) {
      inputRef.current.focus()
    }
    
    // Gera CAPTCHA se necessário
    if (securityStatus.shouldShowCaptcha) {
      generateNewCaptcha()
    }
  }, [securityStatus.shouldShowCaptcha])

  const generateNewCaptcha = () => {
    const captcha = PinSecurity.generateCaptcha()
    setCaptchaQuestion(captcha.question)
    setCaptchaCorrectAnswer(captcha.answer)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Simula um pequeno delay para melhor UX
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verifica CAPTCHA se necessário
    let captchaAnswerNum: number | undefined
    if (securityStatus.shouldShowCaptcha) {
      const answer = parseInt(captchaAnswer)
      if (isNaN(answer) || answer !== captchaCorrectAnswer) {
        setError('Resposta do CAPTCHA incorreta. Tente novamente.')
        setCaptchaAnswer('')
        generateNewCaptcha()
        setIsSubmitting(false)
        return
      }
      captchaAnswerNum = answer
    }

    const result = authenticate(pin, captchaAnswerNum)
    
    if (result.success) {
      setPin('')
      setCaptchaAnswer('')
      setError('')
    } else {
      setError(result.reason || 'PIN incorreto. Tente novamente.')
      setPin('')
      setCaptchaAnswer('')
      
      // Gera novo CAPTCHA se necessário
      if (securityStatus.shouldShowCaptcha) {
        generateNewCaptcha()
      }
      
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }

    setIsSubmitting(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-neutral-900/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-white">
                {PIN_CONFIG.SYSTEM_NAME}
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Digite o PIN para acessar o sistema
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Alertas de Segurança */}
              {securityStatus.isBlocked && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                  <Clock className="h-4 w-4 text-red-400" />
                  <div className="text-sm text-red-400">
                    <div className="font-medium">Acesso Temporariamente Bloqueado</div>
                    <div>Tente novamente em {Math.ceil((securityStatus.remainingTime || 0) / 1000 / 60)} minutos</div>
                  </div>
                </div>
              )}

              {securityStatus.isSuspicious && (
                <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-700/30 rounded-lg">
                  <Bot className="h-4 w-4 text-orange-400" />
                  <div className="text-sm text-orange-400">
                    <div className="font-medium">Atividade Suspeita Detectada</div>
                    <div>{securityStatus.suspiciousReason}</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <Input
                    ref={inputRef}
                    type="password"
                    placeholder="Digite o PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 h-12 text-center text-lg font-mono tracking-widest bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-primary"
                    maxLength={4}
                    autoComplete="off"
                    disabled={securityStatus.isBlocked}
                  />
                </div>
                
                {/* CAPTCHA */}
                {securityStatus.shouldShowCaptcha && (
                  <div className="space-y-2">
                    <div className="text-sm text-neutral-400 text-center">
                      Resolva o CAPTCHA para continuar:
                    </div>
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-center">
                      <div className="text-lg font-mono text-neutral-200 mb-2">
                        {captchaQuestion}
                      </div>
                      <Input
                        type="number"
                        placeholder="Resposta"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        className="text-center bg-neutral-700 border-neutral-600 text-white"
                        disabled={securityStatus.isBlocked}
                      />
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={
                  pin.length < 4 || 
                  isSubmitting || 
                  securityStatus.isBlocked ||
                  (securityStatus.shouldShowCaptcha && !captchaAnswer)
                }
                className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </div>
                ) : securityStatus.isBlocked ? (
                  'Acesso Bloqueado'
                ) : (
                  'Acessar Sistema'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-neutral-500">
                {PIN_CONFIG.WELCOME_MESSAGE}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
