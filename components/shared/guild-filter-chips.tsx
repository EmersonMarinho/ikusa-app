"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { XIcon } from "lucide-react"
import { getGuildBadgeClasses } from "@/lib/guild-colors"

interface GuildFilterChipsProps {
  allGuilds: string[]
  selectedGuilds: string[]
  onGuildToggle: (guild: string, checked: boolean) => void
  onClearAll: () => void
}

export function GuildFilterChips({ allGuilds, selectedGuilds, onGuildToggle, onClearAll }: GuildFilterChipsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {allGuilds.map((guild) => (
          <div key={guild} className="flex items-center space-x-2">
            <Checkbox
              id={`guild-${guild}`}
              checked={selectedGuilds.includes(guild)}
              onCheckedChange={(checked) => onGuildToggle(guild, checked as boolean)}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <label
              htmlFor={`guild-${guild}`}
              className="text-sm text-neutral-200 cursor-pointer hover:text-neutral-100 transition-colors"
            >
              {guild}
            </label>
          </div>
        ))}
      </div>

      {selectedGuilds.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-700">
          <div className="flex flex-wrap gap-2">
            {selectedGuilds.map((guild) => (
              <Badge
                key={guild}
                variant="secondary"
                className={`${getGuildBadgeClasses(guild)} transition-colors cursor-pointer`}
                onClick={() => onGuildToggle(guild, false)}
              >
                {guild}
                <XIcon className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="border-neutral-700 text-neutral-200 hover:bg-neutral-800 bg-transparent"
          >
            <XIcon className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      )}
    </div>
  )
}
