import * as cheerio from 'cheerio'
import {
  ALLOWED_DOMAINS,
  BINARY_EXTENSIONS,
  BLOCKED_TITLE_PATTERNS,
  BLOCKED_URL_PATTERNS,
  USER_AGENT,
} from './config'
import {
  extractBreadcrumb,
  extractMainContent,
  fetchDocHeaders,
  fetchWithRetry,
  isErrorPage,
  isGithubBlocked,
  normalizeUrl,
} from './parser'
import { classifyPage, detectLanguage, detectProduct, scoreLink, sha256 } from './metadata'
import type { CrawledPage } from './types'

export { SEED_URLS } from './config'
export { chunkText } from './chunker'
export type { CrawledPage, CrawlOptions, PageType, Product } from './types'

/** Crawla uma página e retorna conteúdo estruturado, ou null se inválida/404. */
export async function crawlPage(url: string): Promise<CrawledPage | null> {
  const urlLower = url.toLowerCase()
  if (BLOCKED_URL_PATTERNS.some(pattern => urlLower.includes(pattern))) return null

  try {
    const res = await fetchWithRetry(url, {
      headers: fetchDocHeaders(),
      signal: AbortSignal.timeout(18_000),
    })

    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    const breadcrumb = extractBreadcrumb($)
    const headings = Array.from(
      new Set(
        $('h1, h2, h3')
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(text => text.length > 1 && text.length < 120)
      )
    ).slice(0, 15)

    $(
      'nav, footer, header, script, style, noscript, ' +
      '.nav, .footer, .breadcrumb, .cookie-banner, .signup-banner, ' +
      '#cookie-notice, [role="navigation"], [role="banner"], ' +
      '.feedback, .page-feedback, .survey-banner, ' +
      '.MCTopicToolbar, .MCMiniTOCBody'
    ).remove()

    const title = (
      $('h1').first().text().trim() ||
      $('title').text()
        .replace(/\s*[-|]\s*(NICE|CXone|DEVone|inContact).*/i, '')
        .trim()
    ) || url

    if (!title || BLOCKED_TITLE_PATTERNS.some(pattern => title.toLowerCase().startsWith(pattern))) return null

    const rawContent = extractMainContent($, url)
    const cleanText = rawContent
      .replace(/\t/g, ' ')
      .replace(/ {2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (cleanText.length < 150) return null
    if (isErrorPage(title, cleanText, res.status)) return null

    let domain = ''
    try { domain = new URL(url).hostname } catch {}

    return {
      url,
      title,
      content: cleanText,
      breadcrumb,
      pageType: classifyPage(url, title),
      domain,
      product: detectProduct(url, title, breadcrumb),
      language: detectLanguage(url),
      headings,
      contentHash: sha256(cleanText),
    }
  } catch {
    return null
  }
}

/** Descobre links internos a partir de uma URL já crawlada, ordenados por relevância. */
export async function discoverLinks(url: string, maxLinks = 25): Promise<string[]> {
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return []

    const html = await res.text()
    const $ = cheerio.load(html)
    const baseUrl = new URL(url)

    const links = new Map<string, number>()

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      try {
        const resolved = new URL(href, baseUrl)
        const pathname = resolved.pathname.toLowerCase()
        const ext = pathname.substring(pathname.lastIndexOf('.'))

        if (!ALLOWED_DOMAINS.has(resolved.hostname)) return
        if (isGithubBlocked(resolved)) return
        if (BINARY_EXTENSIONS.has(ext)) return
        if (BLOCKED_URL_PATTERNS.some(pattern => resolved.href.toLowerCase().includes(pattern))) return
        if (resolved.pathname === baseUrl.pathname) return

        const normalizedUrl = normalizeUrl(resolved)
        const anchorText = $(el).text().trim()
        const score = scoreLink(normalizedUrl, anchorText)

        links.set(normalizedUrl, Math.max(links.get(normalizedUrl) ?? -Infinity, score))
      } catch {
      }
    })

    return Array.from(links.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([link]) => link)
      .slice(0, maxLinks)
  } catch {
    return []
  }
}
