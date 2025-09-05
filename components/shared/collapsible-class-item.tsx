"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface CollapsibleClassItemProps {
  classe: string
  count: number
  players: Array<{ nick: string; familia: string; kills?: number; deaths?: number; killsVsChernobyl?: number }>
  total: number
  variant?: "default" | "compact"
}

export function CollapsibleClassItem({
  classe,
  count,
  players,
  total,
  variant = "default",
}: CollapsibleClassItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const percentage = (count / total) * 100
  // Ordena jogadores por melhor K/D (desc), Infinity no topo, desempate por kills
  const sortedPlayers = [...players].sort((a, b) => {
    const kdA = (a.deaths ?? 0) > 0 ? ((a.kills ?? 0) / (a.deaths ?? 1)) : ((a.kills ?? 0) > 0 ? Infinity : 0)
    const kdB = (b.deaths ?? 0) > 0 ? ((b.kills ?? 0) / (b.deaths ?? 1)) : ((b.kills ?? 0) > 0 ? Infinity : 0)
    const aInf = !isFinite(kdA)
    const bInf = !isFinite(kdB)
    if (aInf && !bInf) return -1
    if (!aInf && bInf) return 1
    if (kdB !== kdA) return kdB - kdA
    return (b.kills ?? 0) - (a.kills ?? 0)
  })

  return (
    <div className="bg-neutral-800 rounded-lg p-4 transition-all duration-200 hover:bg-neutral-750">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-800 rounded transition-all duration-200"
        aria-expanded={isExpanded}
        aria-controls={`players-${classe}`}
      >
        <div className="flex items-center space-x-3 flex-1">
          <span className="font-medium text-neutral-100">{classe}</span>
          <Badge variant="secondary" className="bg-neutral-700 text-neutral-200 hover:bg-neutral-600 transition-colors">
            {count}
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          {variant === "default" && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-neutral-700/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500/70"
                  style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                />
              </div>
              <span className="text-xs text-neutral-400 w-12 text-right">{percentage.toFixed(1)}%</span>
            </div>
          )}
          <div className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      <div
        id={`players-${classe}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[9999px] opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-4 border-t border-neutral-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={index}
                className="text-sm text-neutral-300 bg-neutral-700 rounded p-2 hover:bg-neutral-600 transition-colors duration-150"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{player.nick}</span>
                    <span className="text-neutral-500 ml-2">({player.familia})</span>
                  </div>
                  {(typeof player.kills === 'number' || typeof player.deaths === 'number') && (
                    <div className="text-xs text-neutral-200 flex items-center gap-2">
                      <span className="text-green-300">K: {player.kills ?? 0}</span>
                      <span className="text-red-300">D: {player.deaths ?? 0}</span>
                      <span className={`font-semibold ${
                        (player.deaths ?? 0) > 0
                          ? ((player.kills ?? 0) / (player.deaths ?? 1)) >= 1
                            ? 'text-green-300'
                            : 'text-red-300'
                          : (player.kills ?? 0) > 0
                            ? 'text-green-300'
                            : 'text-neutral-300'
                      }`}>
                        K/D: { (player.deaths ?? 0) > 0
                          ? ((player.kills ?? 0) / (player.deaths ?? 1)).toFixed(2)
                          : (player.kills ?? 0) > 0 ? '∞' : '0.00' }
                      </span>
                      {typeof player.killsVsChernobyl === 'number' && (
                        <span className="text-xs text-purple-300">Chern: {player.killsVsChernobyl}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
