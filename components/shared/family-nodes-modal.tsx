"use client"

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getProcessLogById, ProcessLogRecord } from "@/lib/supabase"
import { ShieldIcon, SwordIcon, UsersIcon, CalendarIcon, MapIcon, SearchIcon } from "lucide-react"

interface FamilyNodesModalProps {
	isOpen: boolean
	onClose: () => void
	familia: string
	logIds: string[]
}

type FamilyLogStat = {
	logId: string
	createdAt: string
	eventDate?: string | null
	node?: string
	territorio?: string
	isChernobyl: boolean
	kills: number
	deaths: number
	killsVsChernobyl: number
	deathsVsChernobyl: number
}

function normalize(value: string | null | undefined): string {
	return (value || '').toString().trim().toLowerCase()
}

function detectChernobylPresence(log: ProcessLogRecord): boolean {
	try {
		// Evidência forte: eventos vs Chernobyl nos stats por jogador
		const psg = (log.player_stats_by_guild || (log as any).playerStatsByGuild) as any
		if (psg && typeof psg === 'object') {
			for (const guildName of Object.keys(psg)) {
				const players = psg[guildName] || {}
				for (const [, stats] of Object.entries(players as any)) {
					const kvc = (stats as any)?.kills_vs_chernobyl || 0
					const dvc = (stats as any)?.deaths_vs_chernobyl || 0
					if ((kvc > 0) || (dvc > 0)) return true
				}
			}
		}

		// Matriz de kills aponta confronto direto com Chernobyl
		const km = (log.kills_matrix || (log as any).killsMatrix) as any
		if (km && typeof km === 'object') {
			for (const attacker of Object.keys(km)) {
				const row = km[attacker] || {}
				if (normalize(attacker) === 'chernobyl') {
					const sum = Object.values(row).reduce((a: number, v: any) => a + (Number(v) || 0), 0)
					if (sum > 0) return true
				}
				for (const victim of Object.keys(row)) {
					if (normalize(victim) === 'chernobyl') {
						const v = Number(row[victim] || 0)
						if (v > 0) return true
					}
				}
			}
		}

		// Fallback conservador: igualdade exata no nome da guilda
		const cbg = log.classes_by_guild as any
		if (cbg && typeof cbg === 'object') {
			if (Object.keys(cbg).some(k => normalize(k) === 'chernobyl')) return true
		}
		if (Array.isArray(log.guilds)) {
			if (log.guilds.some(g => normalize(g) === 'chernobyl')) return true
		}
		return false
	} catch {
		return false
	}
}

export function FamilyNodesModal({ isOpen, onClose, familia, logIds }: FamilyNodesModalProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [logs, setLogs] = useState<ProcessLogRecord[]>([])
	const [onlyChernobyl, setOnlyChernobyl] = useState(false)
	const [onlyKiev, setOnlyKiev] = useState(false)
	const [search, setSearch] = useState('')

	useEffect(() => {
		if (!isOpen) return
		let cancelled = false
		setIsLoading(true)
		setError(null)
		;(async () => {
			try {
				const results = await Promise.all(
					(logIds || []).map(id => getProcessLogById(id).catch(() => null))
				)
				if (!cancelled) {
					setLogs(results.filter(Boolean) as ProcessLogRecord[])
				}
			} catch (e: any) {
				if (!cancelled) setError(e?.message || 'Falha ao carregar registros')
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		})()
		return () => { cancelled = true }
	}, [isOpen, logIds])

	const familyStatsByLog: FamilyLogStat[] = useMemo(() => {
		const famNorm = normalize(familia)
		return logs.map(log => {
			let kills = 0
			let deaths = 0
			let killsVsChernobyl = 0
			let deathsVsChernobyl = 0
			const psg = log.player_stats_by_guild || (log as any).playerStatsByGuild || null
			if (psg && typeof psg === 'object') {
				for (const guildName of Object.keys(psg)) {
					const players = (psg as any)[guildName] || {}
					for (const [nick, stats] of Object.entries(players as any)) {
						const f = normalize((stats as any)?.familia || '')
						if (f && f === famNorm) {
							kills += (stats as any).kills || 0
							deaths += (stats as any).deaths || 0
							killsVsChernobyl += (stats as any).kills_vs_chernobyl || 0
							deathsVsChernobyl += (stats as any).deaths_vs_chernobyl || 0
						}
					}
				}
			}
			return {
				logId: log.id,
				createdAt: log.created_at,
				eventDate: log.event_date || null,
				node: (log.node || '').toString(),
				territorio: (log.territorio || '').toString(),
				isChernobyl: detectChernobylPresence(log),
				kills,
				deaths,
				killsVsChernobyl,
				deathsVsChernobyl
			}
		}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
	}, [logs, familia])

	const filteredStats = useMemo(() => {
		return familyStatsByLog.filter(s => {
			if (onlyChernobyl && !s.isChernobyl) return false
			if (onlyKiev) {
				const isKiev = normalize(s.node).includes('kiev')
				if (!isKiev) return false
			}
			if (search) {
				const q = normalize(search)
				const hay = `${normalize(s.node)} ${normalize(s.territorio)} ${normalize(s.eventDate || '')}`
				if (!hay.includes(q)) return false
			}
			return true
		})
	}, [familyStatsByLog, onlyChernobyl, onlyKiev, search])

	const totals = useMemo(() => {
		const base = familyStatsByLog
		const withChern = base.filter(s => s.isChernobyl)
		return {
			total: base.length,
			chernCount: withChern.length,
			kills: base.reduce((a, s) => a + s.kills, 0),
			deaths: base.reduce((a, s) => a + s.deaths, 0),
			killsVsChernobyl: base.reduce((a, s) => a + s.killsVsChernobyl, 0),
			deathsVsChernobyl: base.reduce((a, s) => a + s.deathsVsChernobyl, 0)
		}
	}, [familyStatsByLog])

	const kd = useMemo(() => {
		return totals.deaths > 0 ? totals.kills / totals.deaths : (totals.kills > 0 ? Infinity : 0)
	}, [totals])

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-neutral-900 border-neutral-700">
				<DialogHeader>
					<DialogTitle className="text-neutral-100 text-lg">
						Detalhe dos registros • {familia}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<Card className="border-neutral-700 bg-neutral-800">
						<CardHeader className="pb-3">
							<CardTitle className="text-neutral-200 text-base">
								Resumo
							</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
							<div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
								<div className="text-lg font-bold text-neutral-100">{totals.total}</div>
								<div className="text-xs text-neutral-400">Registros</div>
							</div>
							<div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
								<div className="text-lg font-bold text-blue-300">{totals.chernCount}</div>
								<div className="text-xs text-neutral-400">Com Chernobyl</div>
							</div>
							<div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
								<div className="text-lg font-bold text-green-400">{totals.kills}</div>
								<div className="text-xs text-neutral-400">Kills (família)</div>
							</div>
							<div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
								<div className={`text-lg font-bold ${kd >= 1 ? 'text-green-400' : 'text-red-400'}`}>{kd === Infinity ? '∞' : kd.toFixed(2)}</div>
								<div className="text-xs text-neutral-400">K/D Geral</div>
							</div>
							<div className="text-center p-2 bg-neutral-700 rounded border border-neutral-600">
								<div className="text-sm font-bold text-blue-300">K {totals.killsVsChernobyl} / D {totals.deathsVsChernobyl}</div>
								<div className="text-xs text-neutral-400">vs Chernobyl</div>
							</div>
						</CardContent>
					</Card>

					<div className="flex items-center gap-3">
						<label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer select-none">
							<input type="checkbox" className="accent-blue-500" checked={onlyChernobyl} onChange={(e) => setOnlyChernobyl(e.target.checked)} />
							Somente Chernobyl
						</label>
						<label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer select-none">
							<input type="checkbox" className="accent-blue-500" checked={onlyKiev} onChange={(e) => setOnlyKiev(e.target.checked)} />
							Somente Kiev
						</label>
						<div className="relative w-64">
							<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por node/território/data" className="pl-8 bg-neutral-800 border-neutral-700 text-neutral-200" />
							<SearchIcon className="h-4 w-4 text-neutral-400 absolute left-2 top-2.5" />
						</div>
					</div>

					{isLoading && (
						<div className="text-sm text-neutral-400">Carregando registros…</div>
					)}
					{error && (
						<div className="text-sm text-red-400">{error}</div>
					)}

					<div className="grid grid-cols-1 gap-3">
						{filteredStats.map((s) => {
							const kdLocal = s.deaths > 0 ? s.kills / s.deaths : (s.kills > 0 ? Infinity : 0)
							return (
								<Card key={s.logId} className="border-neutral-700 bg-neutral-800">
									<CardContent className="p-3">
										<div className="flex items-center justify-between gap-3 flex-wrap">
											<div className="flex items-center gap-2 flex-wrap">
												{ s.isChernobyl ? (
													<Badge variant="outline" className="border-blue-700 text-blue-300 flex items-center gap-1"><ShieldIcon className="h-3 w-3" /> Chernobyl</Badge>
												) : (
													<Badge variant="outline" className="border-neutral-600 text-neutral-300">Sem Chernobyl</Badge>
												)}
												<Badge variant="secondary" className="bg-neutral-700 text-neutral-200 flex items-center gap-1"><MapIcon className="h-3 w-3" /> {s.node || 'Node'}</Badge>
												{ s.territorio && (
													<Badge variant="secondary" className="bg-neutral-700 text-neutral-200">{s.territorio}</Badge>
												)}
												<Badge variant="outline" className="border-neutral-600 text-neutral-300 flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {new Date(s.eventDate || s.createdAt).toLocaleString('pt-BR')}</Badge>
											</div>
											<div className="flex items-center gap-3">
												<Badge variant="secondary" className="bg-green-900 text-green-300 flex items-center gap-1"><SwordIcon className="h-3 w-3" /> K {s.kills}</Badge>
												<Badge variant="secondary" className="bg-red-900 text-red-300">D {s.deaths}</Badge>
												<Badge variant="outline" className={`${kdLocal >= 1 ? 'border-green-700 text-green-300' : 'border-red-700 text-red-300'}`}>K/D {kdLocal === Infinity ? '∞' : kdLocal.toFixed(2)}</Badge>
											</div>
										</div>
										<div className="mt-2 text-xs text-neutral-400">vs Chernobyl: K {s.killsVsChernobyl} / D {s.deathsVsChernobyl}</div>
									</CardContent>
								</Card>
							)
							})}
						{!isLoading && filteredStats.length === 0 && (
							<div className="text-sm text-neutral-400">Nenhum registro encontrado com os filtros atuais.</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default FamilyNodesModal


