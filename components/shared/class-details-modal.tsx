"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  SwordIcon, 
  SkullIcon, 
  TrendingUpIcon,
  ShieldIcon,
  UsersIcon
} from "lucide-react"

interface ClassDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  familia: string
  classe: string
  classStats: {
    kills: number
    deaths: number
    kills_vs_chernobyl: number
    deaths_vs_chernobyl: number
    kills_vs_others: number
    deaths_vs_others: number
    last_played: string
  }
}

export function ClassDetailsModal({ isOpen, onClose, familia, classe, classStats }: ClassDetailsModalProps) {
  const kdOverall = classStats.deaths > 0 
    ? classStats.kills / classStats.deaths 
    : (classStats.kills > 0 ? Infinity : 0)
    
  const kdVsChernobyl = classStats.deaths_vs_chernobyl > 0 
    ? classStats.kills_vs_chernobyl / classStats.deaths_vs_chernobyl 
    : (classStats.kills_vs_chernobyl > 0 ? Infinity : 0)
    
  const kdVsOthers = classStats.deaths_vs_others > 0 
    ? classStats.kills_vs_others / classStats.deaths_vs_others 
    : (classStats.kills_vs_others > 0 ? Infinity : 0)

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Data inválida'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-100 text-lg">
            <div className="flex items-center gap-2">
              <SwordIcon className="h-5 w-5 text-blue-400" />
              {classe} - {familia}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Estatísticas Gerais */}
          <Card className="border-neutral-700 bg-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-neutral-200 text-base flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-green-400" />
                Estatísticas Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                  <div className="text-lg font-bold text-green-400">{classStats.kills}</div>
                  <div className="text-xs text-neutral-400">Kills</div>
                </div>
                <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                  <div className="text-lg font-bold text-red-400">{classStats.deaths}</div>
                  <div className="text-xs text-neutral-400">Deaths</div>
                </div>
              </div>
              <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                <div className="text-lg font-bold text-blue-400">
                  {kdOverall === Infinity ? '∞' : kdOverall.toFixed(2)}
                </div>
                <div className="text-xs text-neutral-400">K/D Geral</div>
              </div>
            </CardContent>
          </Card>

          {/* K/D vs Chernobyl */}
          <Card className="border-neutral-700 bg-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-neutral-200 text-base flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-blue-400" />
                vs Chernobyl
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                  <div className="text-sm font-bold text-green-400">{classStats.kills_vs_chernobyl}</div>
                  <div className="text-xs text-neutral-400">Kills</div>
                </div>
                <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                  <div className="text-sm font-bold text-red-400">{classStats.deaths_vs_chernobyl}</div>
                  <div className="text-xs text-neutral-400">Deaths</div>
                </div>
              </div>
              <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                <div className="text-sm font-bold text-blue-400">
                  {kdVsChernobyl === Infinity ? '∞' : kdVsChernobyl.toFixed(2)}
                </div>
                <div className="text-xs text-neutral-400">K/D vs Chernobyl</div>
              </div>
            </CardContent>
          </Card>

          {/* K/D vs Outros */}
          <Card className="border-neutral-700 bg-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-neutral-200 text-base flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-purple-400" />
                vs Outros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                  <div className="text-sm font-bold text-green-400">{classStats.kills_vs_others}</div>
                  <div className="text-xs text-neutral-400">Kills</div>
                </div>
                <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                  <div className="text-sm font-bold text-red-400">{classStats.deaths_vs_others}</div>
                  <div className="text-xs text-neutral-400">Deaths</div>
                </div>
              </div>
              <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                <div className="text-sm font-bold text-purple-400">
                  {kdVsOthers === Infinity ? '∞' : kdVsOthers.toFixed(2)}
                </div>
                <div className="text-xs text-neutral-400">K/D vs Outros</div>
              </div>
            </CardContent>
          </Card>

          {/* Última Jogada */}
          <Card className="border-neutral-700 bg-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-neutral-200 text-base flex items-center gap-2">
                <SwordIcon className="h-4 w-4 text-yellow-400" />
                Última Jogada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
                <div className="text-sm font-bold text-yellow-400">
                  {formatDate(classStats.last_played)}
                </div>
                <div className="text-xs text-neutral-400">Data/Hora</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
