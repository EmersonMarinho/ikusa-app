import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Converte segundos para mm:ss (máximo ~59:59 para nosso caso)
export function formatSecondsToMMSS(totalSeconds: number | null | undefined): string {
  const s = Math.max(0, Number(totalSeconds || 0))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  const mmStr = String(mm).padStart(2, '0')
  const ssStr = String(ss).padStart(2, '0')
  return `${mmStr}:${ssStr}`
}

// Converte mm:ss para segundos. Retorna null se formato inválido
export function parseMMSS(value: string | null | undefined): number | null {
  const v = (value || '').trim()
  if (!v) return null
  const m = v.match(/^\s*(\d{1,2}):(\d{2})\s*$/)
  if (!m) return null
  const mm = Number(m[1])
  const ss = Number(m[2])
  if (Number.isNaN(mm) || Number.isNaN(ss) || ss >= 60) return null
  return mm * 60 + ss
}

// Converte entrada livre (apenas dígitos) em mm:ss
// Ex.: "4825" -> "48:25", "5" -> "00:05"
export function coerceToMMSS(raw: string | null | undefined): string {
  const digits = String(raw || '').replace(/\D+/g, '')
  if (digits.length === 0) return ''
  const sec = digits.slice(-2).padStart(2, '0')
  const minRaw = digits.slice(0, Math.max(0, digits.length - 2))
  const min = (minRaw.length ? String(Number(minRaw)) : '0').padStart(2, '0')
  return `${min}:${sec}`
}
