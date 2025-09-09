import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

type Player = { nome: string; url: string; papd_maximo: number | null; perfil_privado: boolean }

async function fetchGuildPage(guild: string, region = 'SA') {
  const url = `https://www.sa.playblackdesert.com/pt-BR/Adventure/Guild/GuildProfile?guildName=${encodeURIComponent(guild)}&region=${region}`
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  return res.data as string
}

function extractPlayerLinks(html: string, baseUrl: string) {
  const $ = cheerio.load(html)
  const links: { nome: string; url: string }[] = []
  $('a[href*="Adventure/Profile"]').each((_, el) => {
    const nome = $(el).text().trim()
    const href = $(el).attr('href') || ''
    if (nome && href) {
      const url = new URL(href, baseUrl).toString()
      links.push({ nome, url })
    }
  })
  return links
}

async function getPlayerProfile(url: string, nome: string): Promise<Player> {
  try {
    await new Promise(r => setTimeout(r, 500))
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const $ = cheerio.load(res.data)
    let papd: number | null = null
    const descSpans = $('span.desc')
    descSpans.each((_, el) => {
      const t = $(el).text().trim()
      if (/^\d{2,4}$/.test(t)) {
        const n = parseInt(t, 10)
        if (n >= 100 && n <= 9999) {
          papd = papd == null ? n : Math.max(papd, n)
        }
      }
    })
    if (papd == null) {
      $('span').each((_, el) => {
        const t = $(el).text().trim()
        if (/^\d{2,4}$/.test(t)) {
          const n = parseInt(t, 10)
          if (n >= 100 && n <= 9999) {
            papd = papd == null ? n : Math.max(papd, n)
          }
        }
      })
    }
    const privateIndicators = $("*:contains('privado'), *:contains('Privado'), *:contains('PRIVADO')").length > 0
    return { nome, url, papd_maximo: papd, perfil_privado: privateIndicators }
  } catch {
    return { nome, url, papd_maximo: null, perfil_privado: true }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const guildsParam = searchParams.get('guilds')
    const region = searchParams.get('region') || 'SA'
    const mode = searchParams.get('mode') || 'full'

    const targetGuilds = (guildsParam
      ? guildsParam.split(',')
      : ['Oxion', 'Guilty']
    ).map(g => g.trim()).filter(Boolean)

    const baseUrl = 'https://www.sa.playblackdesert.com'

    // Coleta links das duas guildas
    const linkSet = new Map<string, { nome: string; url: string }>()
    for (const g of targetGuilds) {
      const html = await fetchGuildPage(g, region)
      const links = extractPlayerLinks(html, baseUrl)
      for (const l of links) {
        const key = `${l.nome.toLowerCase()}|${l.url}`
        if (!linkSet.has(key)) linkSet.set(key, l)
      }
    }

    const links = Array.from(linkSet.values())

    if (mode === 'links') {
      return NextResponse.json({
        success: true,
        data: {
          guild_info: { nome: targetGuilds.join(' + ') },
          links,
          total_links: links.length,
          scraping_timestamp: new Date().toISOString()
        }
      })
    }

    const players: Player[] = []
    for (let i = 0; i < links.length; i++) {
      const p = links[i]
      const prof = await getPlayerProfile(p.url, p.nome)
      players.push(prof)
    }

    const playersWithPapd = players.filter(p => p.papd_maximo != null).length
    const privateProfiles = players.filter(p => p.perfil_privado).length

    return NextResponse.json({
      success: true,
      data: {
        guild_info: { nome: targetGuilds.join(' + ') },
        players,
        total_players: players.length,
        players_with_papd: playersWithPapd,
        private_profiles: privateProfiles,
        scraping_timestamp: new Date().toISOString()
      }
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Falha no scraping' }, { status: 500 })
  }
}


