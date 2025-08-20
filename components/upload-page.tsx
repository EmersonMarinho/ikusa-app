"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { processLogFile, saveToDatabase, type ProcessedLog } from "@/lib/mock-data"
import { CollapsibleClassItem } from "@/components/shared/collapsible-class-item"
import { StatsCard } from "@/components/shared/stats-card"
import {
  UploadIcon,
  FileTextIcon,
  DownloadIcon,
  UsersIcon,
  TrendingUpIcon,
  SwordIcon,
  SkullIcon,
  TargetIcon,
  MapIcon,
  FlagIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react"

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedData, setProcessedData] = useState<ProcessedLog | null>(null)
  const [saveToDb, setSaveToDb] = useState(true) // Restaurado para true
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Novos campos
  const [territorio, setTerritorio] = useState<'Calpheon' | 'Kamasylvia' | 'Siege'>('Calpheon')
  const [node, setNode] = useState('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.name.endsWith('.log')) {
      setFile(selectedFile)
      setProcessedData(null)
      setSaveSuccess(false)
      setSaveError(null)
    }
  }

  const handleProcess = async () => {
    if (!file || !node.trim()) return

    setIsProcessing(true)
    setProcessingProgress(null)
    try {
      // Usa o endpoint do servidor para processar o log
      const formData = new FormData()
      formData.append('file', file)
      formData.append('territorio', territorio)
      formData.append('node', node)

      const response = await fetch('/api/process-log', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Erro ao processar arquivo')
      }

      const data = await response.json()
      setProcessedData(data)
      
      // Salva automaticamente no banco se a opção estiver marcada
      if (saveToDb) {
        try {
          await saveToDatabase(data, file.name)
          setSaveSuccess(true)
          setSaveError(null)
        } catch (saveError) {
          console.error('Erro ao salvar:', saveError)
          const anyErr = saveError as any
          const reason = anyErr?.message || anyErr?.details || anyErr?.hint || 'Erro ao salvar no banco de dados'
          setSaveError(`Erro ao salvar no banco de dados: ${reason}`)
          setSaveSuccess(false)
        }
      }
      
    } catch (error) {
      console.error('Erro ao processar:', error)
      setSaveError('Erro ao processar o arquivo')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveToDatabase = async () => {
    if (!processedData || !file) return

    setIsSaving(true)
    try {
      await saveToDatabase(processedData, file.name)
      setSaveSuccess(true)
      setSaveError(null)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      const anyErr = error as any
      const reason = anyErr?.message || anyErr?.details || anyErr?.hint || 'Erro ao salvar no banco de dados'
      setSaveError(`Erro ao salvar no banco de dados: ${reason}`)
      setSaveSuccess(false)
    } finally {
      setIsSaving(false)
    }
  }

  const generateTXT = () => {
    if (!processedData) return

    const lines: string[] = []
    lines.push(`RELATÓRIO DE GUERRA - ${new Date().toLocaleDateString('pt-BR')}`)
    lines.push('='.repeat(50))
    lines.push(`Território: ${processedData.territorio}`)
    lines.push(`Node: ${processedData.node}`)
    lines.push(`Guildas Detectadas: ${processedData.detectedGuilds?.join(', ') || 'Nenhuma'}`)
    lines.push('')

    // Classes breakdown
    processedData.totalPorClasse.forEach(({ classe, count }) => {
      lines.push(`Classe: ${classe} (${count})`)
      const players = processedData.classes[classe] || []
      players.forEach(({ nick, familia }) => {
        lines.push(`  - ${nick} — ${familia}`)
      })
      lines.push('')
    })

    // Totais
    lines.push('TOTAL POR CLASSE')
    processedData.totalPorClasse.forEach(({ classe, count }) => {
      lines.push(`- ${classe}: ${count}`)
    })
    lines.push('')
    lines.push(`TOTAL GERAL: ${processedData.totalGeral}`)

    // Estatísticas de KD
    if (processedData.killsByGuild || processedData.deathsByGuild) {
      lines.push('')
      lines.push('ESTATÍSTICAS DE KD')
      lines.push('='.repeat(30))
      
      const guilds = processedData.guilds || []
      guilds.forEach(guild => {
        const kills = processedData.killsByGuild?.[guild] || 0
        const deaths = processedData.deathsByGuild?.[guild] || 0
        const kd = processedData.kdRatioByGuild?.[guild] || 0
        lines.push(`${guild}: ${kills} kills, ${deaths} deaths, KD: ${kd}`)
      })
    }

    return lines.join('\n')
  }

  const downloadTXT = () => {
    const content = generateTXT()
    if (!content) return

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_guerra_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const canProcess = file && node.trim()

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-100 mb-2">Upload de Log de Guerra</h1>
        <p className="text-neutral-400">Processe logs de guerra e analise estatísticas de KD</p>
      </div>

      {/* Upload Section */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center">
            <UploadIcon className="h-5 w-5 mr-2" />
            Upload do Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Arquivo de Log (.log)</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="file-upload"
                type="file"
                accept=".log"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="bg-neutral-800 border-neutral-700"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
              >
                Selecionar
              </Button>
            </div>
            {file && (
              <div className="flex items-center space-x-2 text-sm text-neutral-300">
                <FileTextIcon className="h-4 w-4" />
                <span>{file.name}</span>
                <Badge variant="outline" className="border-green-700 text-green-300">
                  {(file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Guerra */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100 flex items-center">
            <MapIcon className="h-5 w-5 mr-2" />
            Configurações de Guerra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="territorio">Território</Label>
              <Select value={territorio} onValueChange={(value: 'Calpheon' | 'Kamasylvia' | 'Siege') => setTerritorio(value)}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Calpheon">Calpheon</SelectItem>
                  <SelectItem value="Kamasylvia">Kamasylvia</SelectItem>
                  <SelectItem value="Siege">Siege</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node">Node</Label>
              <Input
                id="node"
                placeholder="Ex: Node War 1, Castle Siege..."
                value={node}
                onChange={(e) => setNode(e.target.value)}
                className="bg-neutral-800 border-neutral-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Salvamento Automático</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-db"
                checked={saveToDb}
                onCheckedChange={(checked) => setSaveToDb(checked as boolean)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label htmlFor="save-db" className="text-sm text-neutral-200">
                Salvar automaticamente no banco de dados após processamento
              </label>
            </div>
            <p className="text-sm text-neutral-400">
              As guildas serão detectadas automaticamente do log
            </p>
          </div>

          <Button
            onClick={handleProcess}
            disabled={!canProcess || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando log...
              </>
            ) : (
              <>
                <TrendingUpIcon className="h-4 w-4 mr-2" />
                Processar Log
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Processed Data Display */}
      {processedData && (
        <>
          {/* Informações da Guerra */}
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader>
              <CardTitle className="text-neutral-100 flex items-center">
                <MapIcon className="h-5 w-5 mr-2" />
                Informações da Guerra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatsCard
                  title="Território"
                  value={processedData.territorio}
                  icon={MapIcon}
                  variant="info"
                />
                <StatsCard
                  title="Node"
                  value={processedData.node}
                  variant="info"
                />
              </div>

              {/* Guildas Detectadas Automaticamente */}
              {processedData.detectedGuilds && processedData.detectedGuilds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-700">
                  <h4 className="text-sm font-medium text-neutral-300 mb-2 flex items-center">
                    <AlertCircleIcon className="h-4 w-4 mr-2 text-blue-400" />
                    Guildas Detectadas no Log
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {processedData.detectedGuilds.map((guilda) => (
                      <Badge
                        key={guilda}
                        variant="outline"
                        className={
                          guilda === 'Lollipop'
                            ? "border-green-700 text-green-300"
                            : "border-blue-700 text-blue-300"
                        }
                      >
                        {guilda}
                        {guilda === 'Lollipop' && " (Sua Guilda)"}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    As guildas são detectadas automaticamente baseado no padrão "from [NomeDaGuilda]" no log
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Guilda"
              value={processedData.guild}
              icon={UsersIcon}
              variant="info"
            />
            <StatsCard
              title="Total Geral"
              value={processedData.totalGeral}
              variant="success"
            />
            {processedData.killsByGuild && (
              <StatsCard
                title="Total Kills"
                value={Object.values(processedData.killsByGuild).reduce((a, b) => a + b, 0)}
                icon={SwordIcon}
                variant="success"
              />
            )}
          </div>

          {/* KD Ratio por Guilda */}
          {processedData.kdRatioByGuild && Object.keys(processedData.kdRatioByGuild).length > 0 && (
            <Card className="border-neutral-800 bg-neutral-900">
              <CardHeader>
                <CardTitle className="text-neutral-100 flex items-center">
                  <TargetIcon className="h-5 w-5 mr-2" />
                  KD Ratio por Guilda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(processedData.kdRatioByGuild).map(([guild, kd]) => (
                    <StatsCard
                      key={guild}
                      title={guild}
                      value={kd.toFixed(2)}
                      icon={TargetIcon}
                      variant={kd >= 1 ? "success" : "danger"}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Classes por Guilda - Cards Separados */}
          {(processedData as any).playerStatsByGuild && Object.keys((processedData as any).playerStatsByGuild).length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-100 text-center">Classes por Guilda</h2>
              
              {Object.entries((processedData as any).playerStatsByGuild).map(([guildName, players]: [string, any]) => (
                <Card key={guildName} className="border-neutral-800 bg-neutral-900">
                  <CardHeader>
                    <CardTitle className="text-neutral-100 flex items-center">
                      <UsersIcon className="h-5 w-5 mr-2" />
                      {guildName}
                      {guildName === 'Lollipop' && (
                        <Badge variant="outline" className="ml-2 border-green-700 text-green-300">
                          Sua Guilda
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-neutral-400">
                      {Object.keys(players).length} jogadores • 
                      Total Kills: {Object.values(players).reduce((sum: number, p: any) => sum + p.kills, 0)} • 
                      Total Deaths: {Object.values(players).reduce((sum: number, p: any) => sum + p.deaths, 0)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Agrupa jogadores por classe */}
                    {(() => {
                      const classGroups: Record<string, Array<{ nick: string; kills: number; deaths: number; classe: string; familia: string }>> = {};
                      
                      Object.entries(players).forEach(([nick, stats]: [string, any]) => {
                        const classe = stats.classe || 'Classe não encontrada';
                        if (!classGroups[classe]) {
                          classGroups[classe] = [];
                        }
                        classGroups[classe].push({
                          nick,
                          kills: stats.kills,
                          deaths: stats.deaths,
                          classe: stats.classe,
                          familia: stats.familia
                        });
                      });
                      
                      // Ordena classes por número de jogadores
                      const sortedClasses = Object.entries(classGroups).sort(([,a], [,b]) => b.length - a.length);
                      
                      return (
                        <div className="space-y-4">
                          {sortedClasses.map(([classe, playersInClass]) => (
                            <div key={classe} className="border border-neutral-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-lg font-semibold text-neutral-200">
                                  {classe} ({playersInClass.length})
                                </h4>
                                <div className="text-sm text-neutral-400">
                                  Kills: {playersInClass.reduce((sum, p) => sum + p.kills, 0)} • 
                                  Deaths: {playersInClass.reduce((sum, p) => sum + p.deaths, 0)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {playersInClass
                                  .sort((a, b) => b.kills - a.kills) // Ordena por kills
                                  .map((player) => (
                                    <div
                                      key={player.nick}
                                      className="bg-neutral-800 rounded-lg p-3 border border-neutral-600"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-neutral-200">{player.nick}</span>
                                        <span className="text-xs text-neutral-400">{player.familia}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-green-400">Kills: {player.kills}</span>
                                        <span className="text-red-400">Deaths: {player.deaths}</span>
                                        <span className={`font-semibold ${
                                          player.deaths > 0 
                                            ? (player.kills / player.deaths) >= 1 
                                              ? 'text-green-400' 
                                              : 'text-red-400'
                                            : player.kills > 0 
                                              ? 'text-green-400' 
                                              : 'text-neutral-400'
                                        }`}>
                                          K/D: {player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills > 0 ? '∞' : '0.00'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Actions */}
          <Card className="border-neutral-800 bg-neutral-900">
            <CardHeader>
              <CardTitle className="text-neutral-100">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={downloadTXT}
                  variant="outline"
                  className="border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Baixar TXT
                </Button>

                {!saveToDb && (
                  <Button
                    onClick={handleSaveToDatabase}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Salvar no Banco
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Status Messages */}
              {saveSuccess && (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Dados salvos com sucesso no banco!</span>
                </div>
              )}

              {saveError && (
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircleIcon className="h-4 w-4" />
                  <span>{saveError}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
