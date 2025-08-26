export interface GuildColor {
  border: string
  text: string
  bg: string
  bgHover: string
}

export const guildColors: Record<string, GuildColor> = {
  'lollipop': {
    border: 'border-pink-600',
    text: 'text-pink-400',
    bg: 'bg-pink-900/20',
    bgHover: 'hover:bg-pink-900/30'
  },
  'harvest': {
    border: 'border-orange-600',
    text: 'text-orange-400',
    bg: 'bg-orange-900/20',
    bgHover: 'hover:bg-orange-900/30'
  },
  'chernobyl': {
    border: 'border-red-600',
    text: 'text-red-400',
    bg: 'bg-red-900/20',
    bgHover: 'hover:bg-red-900/30'
  },
  'kiev': {
    border: 'border-yellow-600',
    text: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    bgHover: 'hover:bg-yellow-900/30'
  }
}

export function getGuildColor(guildName: string): GuildColor {
  const normalizedName = guildName.toLowerCase()
  return guildColors[normalizedName] || {
    border: 'border-neutral-600',
    text: 'text-neutral-400',
    bg: 'bg-neutral-900/20',
    bgHover: 'hover:bg-neutral-900/30'
  }
}

export function getGuildBadgeClasses(guildName: string): string {
  const colors = getGuildColor(guildName)
  return `${colors.border} ${colors.text} ${colors.bg} ${colors.bgHover}`
}
