import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    const nome = searchParams.get('nome') || ''
    if (!url) return NextResponse.json({ success: false, error: 'url obrigatório' }, { status: 400 })

    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const $ = cheerio.load(res.data)
    let papd: number | null = null
    $('span.desc').each((_, el) => {
      const t = $(el).text().trim()
      if (/^\d{2,4}$/.test(t)) {
        const n = parseInt(t, 10)
        if (n >= 100 && n <= 9999) papd = papd == null ? n : Math.max(papd, n)
      }
    })
    if (papd == null) {
      $('span').each((_, el) => {
        const t = $(el).text().trim()
        if (/^\d{2,4}$/.test(t)) {
          const n = parseInt(t, 10)
          if (n >= 100 && n <= 9999) papd = papd == null ? n : Math.max(papd, n)
        }
      })
    }
    const privateIndicators = $("*:contains('privado'), *:contains('Privado'), *:contains('PRIVADO')").length > 0
    return NextResponse.json({ success: true, data: { nome, url, papd_maximo: papd, perfil_privado: privateIndicators } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Falha ao scrapear perfil' }, { status: 500 })
  }
}


