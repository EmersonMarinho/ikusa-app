import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const nick = (searchParams.get('nick') || '').trim()
    if (!nick) {
      return NextResponse.json({ success: false, error: 'Parâmetro nick é obrigatório' }, { status: 400 })
    }

    const url = `https://www.sa.playblackdesert.com/pt-BR/Adventure?checkSearchText=True&searchType=1&searchKeyword=${encodeURIComponent(nick)}`
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      },
      timeout: 10000,
      validateStatus: () => true,
    })

    if (res.status >= 400) {
      return NextResponse.json({ success: false, error: `Falha ao buscar página (${res.status})` }, { status: 502 })
    }

    const $ = cheerio.load(res.data)

    // Estratégia 1: XPath sugerido pelo usuário equivalente em CSS (família na lista)
    let familyName = $('article ul li > div:first-child > a').first().text().trim()
    // Pega o primeiro link para o perfil (para extrair classe)
    let profileHref = $('a[href*="Profile?profileTarget"]').first().attr('href') || ''

    // Tenta extrair a CLASSE diretamente na página de resultados (equiv. ao XPath fornecido)
    // XPath: /html/body/div[4]/div/div[3]/article/div/div/div[3]/ul/li/div[2]/div/span[2]/span[2]
    // Aproximação CSS: primeiro item da lista -> segunda coluna -> div interno -> segundo span -> segundo span
    let className = $('article ul li')
      .first()
      .find('> div:nth-of-type(2) > div > span:nth-of-type(2) > span:nth-of-type(2)')
      .first()
      .text()
      .trim()

    // Estratégia 2 (fallback): âncora para Profile com texto de família
    if (!familyName) {
      familyName = $('a[href*="Profile?profileTarget"]').first().text().trim()
    }

    // Estratégia 3 (fallback): tentar primeira célula que contenha provável família
    if (!familyName) {
      const candidates = $('article ul li a').map((_, el)=> $(el).text().trim()).get()
      familyName = (candidates.find(t => !!t) || '').trim()
    }

    // Se não achou classe na lista, tenta obter a classe indo até a página de perfil
    if (!className) {
      try {
        if (profileHref) {
          const abs = profileHref.startsWith('http') ? profileHref : `https://www.sa.playblackdesert.com${profileHref}`
          const res2 = await axios.get(abs, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
            timeout: 10000,
            validateStatus: () => true,
          })
          if (res2.status < 400) {
            const $2 = cheerio.load(res2.data)
            className = $2('.character_class .name').first().text().trim() || ''
          }
        }
      } catch {}
    }

    if (!familyName && !className) {
      return NextResponse.json({ success: false, error: 'Família/Classe não encontradas' }, { status: 404 })
    }

    return NextResponse.json({ success: true, familyName: familyName || null, className: className || null })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Erro ao obter família' }, { status: 500 })
  }
}


