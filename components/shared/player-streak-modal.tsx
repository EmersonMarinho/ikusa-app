import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const CLASS_GROUPS: Record<string, string> = {
  dosa: "Dosa",
  lutador: "Striker",
  berserker: "Frontline",
  nova: "Frontline",
  mistica: "Frontline",
  mystic: "Frontline",
  hashashin: "Assassinos",
  sage: "Assassinos",
  maewha: "Assassinos",
  maehwa: "Assassinos",
  musa: "Assassinos",
  musah: "Assassinos",
  feiticeira: "Assassinos",
  feiticeiro: "Assassinos",
  sorceress: "Assassinos",
  sorcerer: "Assassinos",
  cacadora: "Ranged",
  cacador: "Ranged",
  arqueiro: "Ranged",
  arqueira: "Ranged",
  ranger: "Ranged",
  deadeye: "Ranged",
}

const normalizeClassName = (raw?: string): string => {
  if (!raw) return ""
  return raw
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z]/g, "")
}

type Event = { t?: number; time?: string; type: "kill" | "death"; opponentNick?: string; opponentGuild?: string }

export function PlayerStreakModal({
  open,
  onOpenChange,
  nick,
  familia,
  events,
  opponentFamilyByKey,
  opponentFamilyByNick,
  opponentClassByKey,
  opponentClassByNick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  nick: string
  familia: string
  events: Event[]
  opponentFamilyByKey?: Record<string, string>
  opponentFamilyByNick?: Record<string, string>
  opponentClassByKey?: Record<string, string>
  opponentClassByNick?: Record<string, string>
}) {
  const ordered = [...(events || [])].sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
  const [resolving, setResolving] = React.useState(false)
  const [resolvedFamilies, setResolvedFamilies] = React.useState<Record<string, string>>({})
  const [resolvedClasses, setResolvedClasses] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let abort = false
    async function resolveMissing() {
      try {
        setResolving(true)
        const toResolve = ordered
          .map((ev) => ({ key: `${(ev.opponentGuild || '').trim()}::${(ev.opponentNick || '').trim()}`, nick: (ev.opponentNick || '').trim() }))
          .filter((x) => x.nick)
          .filter(
            (x) =>
              !(
                (opponentFamilyByKey && opponentFamilyByKey[x.key]) ||
                (opponentFamilyByNick && opponentFamilyByNick[x.nick]) ||
                resolvedFamilies[x.nick]
              )
          )
        const uniqueNicks = Array.from(new Set(toResolve.map((t) => t.nick))).slice(0, 5)
        const famResults: Record<string, string> = {}
        const classResults: Record<string, string> = {}
        for (const n of uniqueNicks) {
          try {
            const r = await fetch(`/api/family-name?nick=${encodeURIComponent(n)}`)
            if (!r.ok) continue
            const j = await r.json().catch(() => null)
            const fam = j && j.familyName ? String(j.familyName).trim() : ""
            const cls = j && j.className ? String(j.className).trim() : ""
            if (fam) famResults[n] = fam
            if (cls) classResults[n] = cls
          } catch {}
        }
        if (!abort) {
          if (Object.keys(famResults).length) setResolvedFamilies((prev) => ({ ...prev, ...famResults }))
          if (Object.keys(classResults).length) setResolvedClasses((prev) => ({ ...prev, ...classResults }))
        }
      } finally {
        if (!abort) setResolving(false)
      }
    }
    resolveMissing()
    return () => {
      abort = true
    }
  }, [open])

  const groupedStats = React.useMemo(() => {
    const summary = {
      kills: new Map<string, number>(),
      deaths: new Map<string, number>(),
    }

    const getGroupLabel = (rawCls: string | undefined): string => {
      if (!rawCls) return "Restantes"
      const normalized = normalizeClassName(rawCls)
      return CLASS_GROUPS[normalized] || "Restantes"
    }

    ordered.forEach((ev) => {
      const key = `${(ev.opponentGuild || '').trim()}::${(ev.opponentNick || '').trim()}`
      const cls = ev.opponentNick
        ? opponentClassByKey?.[key] || opponentClassByNick?.[ev.opponentNick] || resolvedClasses[ev.opponentNick]
        : undefined
      const group = getGroupLabel(cls)

      if (ev.type === "kill") {
        summary.kills.set(group, (summary.kills.get(group) || 0) + 1)
      } else if (ev.type === "death") {
        summary.deaths.set(group, (summary.deaths.get(group) || 0) + 1)
      }
    })

    const format = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([group, count]) => ({ group, count }))
        .sort((a, b) => b.count - a.count)

    return {
      kills: format(summary.kills),
      deaths: format(summary.deaths),
    }
  }, [ordered, opponentClassByKey, opponentClassByNick, resolvedClasses])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-100 text-lg">
            {nick} <span className="text-neutral-400 font-normal">— {familia}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card className="border-neutral-700 bg-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-neutral-200 text-base">Interações (ordem cronológica)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ordered.length === 0 && <div className="text-sm text-neutral-400">Sem eventos detalhados salvos para este registro.</div>}
                {ordered.map((ev, idx) => {
                  const key = `${(ev.opponentGuild || '').trim()}::${(ev.opponentNick || '').trim()}`
                  const fam =
                    opponentFamilyByKey?.[key] ||
                    (ev.opponentNick ? opponentFamilyByNick?.[ev.opponentNick] : undefined) ||
                    (ev.opponentNick ? resolvedFamilies[ev.opponentNick] : undefined)
                  const displayName = fam || ev.opponentNick || "—"
                  const cls = ev.opponentNick
                    ? opponentClassByKey?.[key] || opponentClassByNick?.[ev.opponentNick] || resolvedClasses[ev.opponentNick]
                    : undefined
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 border border-neutral-700 bg-neutral-900 rounded px-2 py-1.5"
                    >
                      <div className="text-sm text-neutral-200">
                        {ev.type === "kill" ? "Matou" : "Morreu para"} {displayName}
                        {cls ? <span className="text-neutral-400"> — {cls}</span> : null}
                        {ev.opponentGuild ? <span className="text-neutral-400"> de {ev.opponentGuild}</span> : null}
                        {ev.time ? <span className="text-neutral-500 ml-2 text-xs">({ev.time})</span> : null}
                      </div>
                      <Badge
                        variant="outline"
                        className={`border ${ev.type === "kill" ? "border-green-500/40 text-green-300" : "border-red-500/40 text-red-300"}`}
                      >
                        {ev.type === "kill" ? "KILL" : "DEATH"}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {(groupedStats.kills.length > 0 || groupedStats.deaths.length > 0) && (
            <Card className="border-neutral-700 bg-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-neutral-200 text-base">Resumo por classe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {groupedStats.kills.length > 0 && (
                  <div>
                    <div className="text-neutral-300 mb-1">Classes abatidas</div>
                    <div className="flex flex-wrap gap-2">
                      {groupedStats.kills.map(({ group, count }) => (
                        <span key={`kill-${group}`} className="px-2 py-1 rounded border border-green-500/30 text-green-200 bg-green-500/5">
                          {group}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {groupedStats.deaths.length > 0 && (
                  <div>
                    <div className="text-neutral-300 mb-1">Classes que mais mataram {nick}</div>
                    <div className="flex flex-wrap gap-2">
                      {groupedStats.deaths.map(({ group, count }) => (
                        <span key={`death-${group}`} className="px-2 py-1 rounded border border-red-500/30 text-red-200 bg-red-500/5">
                          {group}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-neutral-400 pt-2 border-t border-neutral-700">
                  <div><span className="text-green-300 font-medium">Frontline</span>: Berserker, Nova, Mística</div>
                  <div><span className="text-green-300 font-medium">Assassinos</span>: Hashashin, Sage, Maewha, Musa, Feiticeira</div>
                  <div><span className="text-green-300 font-medium">Ranged</span>: Caçadora, Arqueiro, Deadeye</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function StreakTable({
  rows,
  opponentFamilyByKey,
  opponentFamilyByNick,
  opponentClassByKey,
  opponentClassByNick,
}: {
  rows: Array<{ nick: string; familia: string; kills: number; deaths: number; best: number; avg: number; last: number; events: Event[]; hasEvents: boolean }>
  opponentFamilyByKey?: Record<string, string>
  opponentFamilyByNick?: Record<string, string>
  opponentClassByKey?: Record<string, string>
  opponentClassByNick?: Record<string, string>
}) {
  const [selected, setSelected] = React.useState<null | { nick: string; familia: string; events: Event[] }>(null)

  return (
    <>
      <div className="overflow-x-auto border border-neutral-800 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="text-left p-2 text-neutral-300">Jogador</th>
              <th className="text-left p-2 text-neutral-300">Família</th>
              <th className="text-center p-2 text-neutral-300">Kills</th>
              <th className="text-center p-2 text-neutral-300">Deaths</th>
              <th className="text-center p-2 text-neutral-300">Melhor Streak</th>
              <th className="text-center p-2 text-neutral-300">Streak Média</th>
              <th className="text-center p-2 text-neutral-300">Última Streak</th>
              <th className="text-center p-2 text-neutral-300">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.nick}-${i}`} className="border-b border-neutral-800 hover:bg-neutral-800">
                <td className="p-2 text-neutral-200 font-medium">{r.nick}</td>
                <td className="p-2 text-neutral-300">{r.familia}</td>
                <td className="p-2 text-center text-green-400 font-medium">{r.kills}</td>
                <td className="p-2 text-center text-red-400 font-medium">{r.deaths}</td>
                <td className="p-2 text-center font-semibold">{r.best}</td>
                <td className="p-2 text-center">{r.avg.toFixed(2)}</td>
                <td className="p-2 text-center">{r.last}</td>
                <td className="p-2 text-center">
                  <button
                    className={`px-2 py-1 rounded border text-xs ${
                      r.hasEvents ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700" : "border-neutral-800 text-neutral-500 cursor-not-allowed"
                    }`}
                    disabled={!r.hasEvents}
                    onClick={() => setSelected({ nick: r.nick, familia: r.familia, events: r.events })}
                  >
                    {r.hasEvents ? "Abrir" : "Sem eventos"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <PlayerStreakModal
          open={!!selected}
          onOpenChange={(v: boolean) => {
            if (!v) setSelected(null)
          }}
          nick={selected.nick}
          familia={selected.familia}
          events={selected.events}
          opponentFamilyByKey={opponentFamilyByKey}
          opponentFamilyByNick={opponentFamilyByNick}
          opponentClassByKey={opponentClassByKey}
          opponentClassByNick={opponentClassByNick}
        />
      )}
    </>
  )
}

export {}
