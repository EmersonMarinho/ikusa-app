"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface CollapsibleClassItemProps {
  classe: string
  count: number
  players: Array<{ nick: string; familia: string }>
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
            <>
              <div className="w-24 bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-neutral-400 w-12 text-right">{percentage.toFixed(1)}%</span>
            </>
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
          isExpanded ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-4 border-t border-neutral-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {players.map((player, index) => (
              <div
                key={index}
                className="text-sm text-neutral-300 bg-neutral-700 rounded p-2 hover:bg-neutral-600 transition-colors duration-150"
              >
                <span className="font-medium">{player.nick}</span>
                <span className="text-neutral-500 ml-2">({player.familia})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
