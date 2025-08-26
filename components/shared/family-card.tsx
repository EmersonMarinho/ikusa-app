"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  UsersIcon, 
  SwordIcon, 
  TrendingUpIcon,
  ShieldIcon
} from "lucide-react"
import { ClassDetailsModal } from "./class-details-modal"

interface FamilyCardProps {
  familia: string
  guilda: string
  classes: Array<{
    classe: string
    kills: number
    deaths: number
    kills_vs_chernobyl: number
    deaths_vs_chernobyl: number
    kills_vs_others: number
    deaths_vs_others: number
    last_played: string
  }>
}

export function FamilyCard({ familia, guilda, classes }: FamilyCardProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Calcula totais da família
  const totalKills = classes.reduce((sum, c) => sum + c.kills, 0)
  const totalDeaths = classes.reduce((sum, c) => sum + c.deaths, 0)
  const totalKdOverall = totalDeaths > 0 ? totalKills / totalDeaths : (totalKills > 0 ? Infinity : 0)

  const handleClassClick = (classe: string) => {
    setSelectedClass(classe)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedClass(null)
  }

  const getGuildColor = (guild: string) => {
    switch (guild) {
      case 'Manifest': return 'border-blue-700 text-blue-300'
      case 'Allyance': return 'border-green-700 text-green-300'
      case 'Grand_Order': return 'border-purple-700 text-purple-300'
      default: return 'border-yellow-700 text-yellow-300'
    }
  }

  return (
    <>
      <Card className="border-neutral-700 bg-neutral-800 hover:bg-neutral-750 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-neutral-200 text-lg flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-blue-400" />
              {familia}
            </CardTitle>
            <Badge variant="outline" className={getGuildColor(guilda)}>
              {guilda}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Estatísticas Gerais da Família */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-neutral-700 rounded-lg">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{totalKills}</div>
              <div className="text-xs text-neutral-400">Total Kills</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">{totalDeaths}</div>
              <div className="text-xs text-neutral-400">Total Deaths</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${
                totalKdOverall >= 1 ? 'text-green-400' : 'text-red-400'
              }`}>
                {totalKdOverall === Infinity ? '∞' : totalKdOverall.toFixed(2)}
              </div>
              <div className="text-xs text-neutral-400">K/D Geral</div>
            </div>
          </div>

          {/* Classes da Família */}
          <div>
            <div className="text-sm text-neutral-400 mb-2 flex items-center gap-2">
              <ShieldIcon className="h-4 w-4" />
              Classes ({classes.length})
            </div>
            <div className="grid grid-cols-1 gap-2">
              {classes.map((cls, index) => {
                const classKd = cls.deaths > 0 ? cls.kills / cls.deaths : (cls.kills > 0 ? Infinity : 0)
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-between h-auto p-3 border-neutral-600 hover:border-neutral-500 hover:bg-neutral-700"
                    onClick={() => handleClassClick(cls.classe)}
                  >
                    <div className="flex items-center gap-2">
                      <SwordIcon className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-200 font-medium">{cls.classe}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">K: {cls.kills}</span>
                      <span className="text-red-400">D: {cls.deaths}</span>
                      <Badge variant="secondary" className={
                        classKd >= 1 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                      }>
                        K/D: {classKd === Infinity ? '∞' : classKd.toFixed(2)}
                      </Badge>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Última Atividade */}
          {classes.length > 0 && (
            <div className="text-xs text-neutral-500 text-center pt-2 border-t border-neutral-700">
              <div className="flex items-center justify-center gap-1">
                <TrendingUpIcon className="h-3 w-3" />
                Última atividade: {new Date(Math.max(...classes.map(c => new Date(c.last_played).getTime()))).toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Classe */}
      {selectedClass && (
        <ClassDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          familia={familia}
          classe={selectedClass}
          classStats={classes.find(c => c.classe === selectedClass)!}
        />
      )}
    </>
  )
}
