"use client"

import { ReactNode } from 'react'
import { usePinAuth } from '@/lib/pin-auth'
import { PinScreen } from './pin-screen'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = usePinAuth()

  if (!isAuthenticated) {
    return <PinScreen />
  }

  return <>{children}</>
}
