// Utilidades centralizadas para filtros de jogadores (Defesa, Shai) e GS

export function normalizeName(name: string | undefined | null): string {
  return String(name || '').trim().toLowerCase()
}

// Lista centralizada de famílias/nicks de Defesa (normalizados)
// OBS: manter apenas minúsculas aqui; compare sempre com normalizeName
export const DEFENSE_FAMILIES = [
  'teste',
  'lagswitch',
  'garciagil',
  'oat',
  'haleluya',
  'fberg',
  'dxvn',
  'zedobambu',
  'kingthepower',
  'faellz',
  'overblow',
  'schwarzfang',
  'vallimi',
  'witte',
  'miih',
  'dolkey',
  'lumine',
  'wise_dragon',
  'oat',
  'viserys',
  'usbx',
  'dayrell',
  'asuna',
  'deustorresmo',
  'sawttisen'

]

export const DEFENSE_FAMILY_SET: ReadonlySet<string> = new Set(DEFENSE_FAMILIES)

export function isDefenseClass(className: string | undefined | null): boolean {
  return normalizeName(className) === 'defesa'
}

export function isShaiClass(className: string | undefined | null): boolean {
  return normalizeName(className) === 'shai'
}

export function isDefensePlayer(args: {
  familyName?: string | null
  characterName?: string | null
  mainClass?: string | null
}): boolean {
  const family = normalizeName(args.familyName)
  const character = normalizeName(args.characterName)
  if (isDefenseClass(args.mainClass)) return true
  if (DEFENSE_FAMILY_SET.has(family)) return true
  if (DEFENSE_FAMILY_SET.has(character)) return true
  return false
}

// Elegibilidade para estatísticas gerais (ex.: contagens/médias): exclui Shai e Defesa
export function isValidForStats(args: {
  familyName?: string | null
  characterName?: string | null
  mainClass?: string | null
}): boolean {
  if (isShaiClass(args.mainClass)) return false
  if (isDefensePlayer(args)) return false
  return true
}

export function computeGearscore(ap?: number | null, aap?: number | null, dp?: number | null): number {
  const apNum = Number(ap || 0)
  const aapNum = Number(aap || 0)
  const dpNum = Number(dp || 0)
  return Math.max(apNum, aapNum) + dpNum
}


