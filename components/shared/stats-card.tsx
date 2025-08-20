import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  variant?: "default" | "success" | "warning" | "danger" | "info"
  className?: string
}

export function StatsCard({ title, value, subtitle, icon: Icon, variant = "default", className = "" }: StatsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "text-green-400"
      case "warning":
        return "text-yellow-400"
      case "danger":
        return "text-red-400"
      case "info":
        return "text-blue-400"
      default:
        return "text-neutral-100"
    }
  }

  return (
    <Card className={`border-neutral-800 bg-neutral-900 hover:bg-neutral-850 transition-colors ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-neutral-400 mb-1">{title}</div>
            <div className={`text-2xl font-bold ${getVariantStyles()}`}>{value}</div>
            {subtitle && <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>}
          </div>
          {Icon && (
            <div className="ml-4">
              <Icon className={`h-8 w-8 ${getVariantStyles()} opacity-60`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
