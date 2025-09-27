import { getProcessLogById } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapIcon, FlagIcon, UsersIcon, SwordsIcon, SkullIcon, TrendingUpIcon } from 'lucide-react'
import { StatsCard } from '@/components/shared/stats-card'
import { getGuildBadgeClasses } from '@/lib/guild-colors'

interface PageProps {
  params: { id: string }
}

export default async function PublicHistoryPage({ params }: PageProps) {
  const record = await getProcessLogById(params.id)

  if (!record) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-neutral-400">Registro não encontrado.</div>
      </div>
    )
  }

  const processed = record as any
  const guilds: string[] = processed.guilds || [processed.guild]
  const killsByGuild: Record<string, number> = processed.kills_by_guild || {}
  const deathsByGuild: Record<string, number> = processed.deaths_by_guild || {}
  const kdByGuild: Record<string, number> = processed.kd_ratio_by_guild || {}
  const totalPorClasse: Array<{ classe: string; count: number }> = processed.total_por_classe || []

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-100">Histórico Compartilhado</h1>
        {record.arquivo_nome ? (
          <p className="text-sm text-neutral-400 mt-1">Arquivo: {record.arquivo_nome}</p>
        ) : null}
      </div>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-neutral-100">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="text-neutral-300 space-y-6">
          {/* Cards principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatsCard title="Território" value={processed.territorio || '-'} icon={MapIcon} />
            <StatsCard title="Node" value={processed.node || '-'} icon={FlagIcon} />
            <StatsCard title="Total de Jogadores" value={processed.total_geral ?? 0} icon={UsersIcon} />
            <StatsCard title="Guildas Participantes" value={guilds.length} icon={SwordsIcon} />
          </div>

          {/* Chips de guildas */}
          <div>
            <div className="text-sm text-neutral-400 mb-2">Guildas</div>
            <div className="flex flex-wrap gap-2">
              {guilds.map((g) => (
                <Badge key={g} variant="outline" className={`${getGuildBadgeClasses(g)} text-xs`}>{g}</Badge>
              ))}
            </div>
          </div>

          {/* Kills / Deaths / KD por guilda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-neutral-400 mb-2">Kills por Guilda</div>
              <ul className="space-y-1">
                {Object.keys(killsByGuild).length === 0 && (
                  <li className="text-neutral-500 text-sm">Sem dados</li>
                )}
                {Object.entries(killsByGuild).map(([g, v]) => (
                  <li key={g} className="flex justify-between">
                    <span className="text-neutral-300">{g}</span>
                    <span className="text-neutral-100 font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm text-neutral-400 mb-2">Deaths por Guilda</div>
              <ul className="space-y-1">
                {Object.keys(deathsByGuild).length === 0 && (
                  <li className="text-neutral-500 text-sm">Sem dados</li>
                )}
                {Object.entries(deathsByGuild).map(([g, v]) => (
                  <li key={g} className="flex justify-between">
                    <span className="text-neutral-300">{g}</span>
                    <span className="text-neutral-100 font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm text-neutral-400 mb-2">KD por Guilda</div>
              <ul className="space-y-1">
                {Object.keys(kdByGuild).length === 0 && (
                  <li className="text-neutral-500 text-sm">Sem dados</li>
                )}
                {Object.entries(kdByGuild).map(([g, v]) => (
                  <li key={g} className="flex justify-between">
                    <span className="text-neutral-300">{g}</span>
                    <span className="text-neutral-100 font-medium">{Number.isFinite(v as number) ? (v as number).toFixed(2) : String(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Distribuição por Classe */}
          <div>
            <div className="text-sm text-neutral-400 mb-2">Distribuição por Classe</div>
            {totalPorClasse.length === 0 ? (
              <div className="text-neutral-500 text-sm">Sem dados</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {totalPorClasse.map((c) => (
                  <Badge key={c.classe} variant="secondary" className="bg-neutral-800 text-neutral-200 justify-between">
                    <span>{c.classe}</span>
                    <span className="ml-2 text-neutral-400">{c.count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const dynamic = 'force-dynamic'

