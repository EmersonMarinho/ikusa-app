"use client"

import { useState, useEffect } from "react"
import { CheckCircleIcon, XCircleIcon, InfoIcon, AlertTriangleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Toast {
  id: string
  type: "success" | "error" | "info" | "warning"
  title: string
  description?: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

export function Toast({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />
      case "error":
        return <XCircleIcon className="h-5 w-5 text-red-400" />
      case "warning":
        return <AlertTriangleIcon className="h-5 w-5 text-yellow-400" />
      default:
        return <InfoIcon className="h-5 w-5 text-blue-400" />
    }
  }

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "border-green-800 bg-green-950/50"
      case "error":
        return "border-red-800 bg-red-950/50"
      case "warning":
        return "border-yellow-800 bg-yellow-950/50"
      default:
        return "border-blue-800 bg-blue-950/50"
    }
  }

  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-4 rounded-lg border transition-all duration-300",
        getStyles(),
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full",
      )}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-100">{toast.title}</div>
        {toast.description && <div className="text-sm text-neutral-300 mt-1">{toast.description}</div>}
      </div>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        className="text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <XCircleIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return {
    toasts,
    addToast,
    removeToast,
    success: (title: string, description?: string) => addToast({ type: "success", title, description }),
    error: (title: string, description?: string) => addToast({ type: "error", title, description }),
    info: (title: string, description?: string) => addToast({ type: "info", title, description }),
    warning: (title: string, description?: string) => addToast({ type: "warning", title, description }),
  }
}
