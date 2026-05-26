import * as cheerio from 'cheerio'

export interface CrawledPage {
  url: string
  title: string
  content: string
  breadcrumb: string
  pageType: 'api' | 'guide' | 'release' | 'faq' | 'reference' | 'other'
}

// ─── Seed URLs ────────────────────────────────────────────────────────────────
// Cobrimos: Help Center (EN + PT-BR), Developer Portal, APIs, SDKs,
// GitHub (nice-devone), npm packages, Expert Help Center, legacy portals.
// Cada seed dispara o descobrimento de links filhos (depth ≤ 2).

export const SEED_URLS: string[] = [
  // ── Help Center — seções principais (EN) ──────────────────────────────────
  'https://help.nicecxone.com/content/agent/cxoneagent/cxoneagent.htm',
  'https://help.nicecxone.com/content/acd/acd_config/acd_config_landing.htm',
  'https://help.nicecxone.com/content/reporting/reporting_landing.htm',
  'https://help.nicecxone.com/content/releasenotes/releasenotes.htm',
  'https://help.nicecxone.com/Content/releasenotes/release.htm',
  'https://help.nicecxone.com/content/globalfeatures/authenticationandauthorization/loginprocess.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/agentassisthub.htm',
  'https://help.nicecxone.com/content/integratedsolutions/cxoneexpert/cxoneexpert.htm',
  'https://help.nicecxone.com/content/platformrequirements/platformrequirements.htm',
  'https://help.nicecxone.com/content/agent/max/max.htm',
  'https://help.nicecxone.com/content/acd/digital/guide/guide.htm',
  'https://help.nicecxone.com/content/agent/cxoneagent/configurecxasettings.htm',

  // ── Help Center — Copilot / IA (EN + PT-BR) ───────────────────────────────
  'https://help.nicecxone.com/pt-br/content/agent/cxoneagent/enlightencopilotforagentscxa.htm',
  'https://help.nicecxone.com/pt-br/content/agent/cxoneagent/cxoneagent.htm',
  'https://help.nicecxone.com/content/agent/cxoneagent/enlightencopilotforagentscxa.htm',

  // ── Developer Portal — Documentação ──────────────────────────────────────
  'https://developer.niceincontact.com/',
  'https://developer.niceincontact.com/Documentation/GettingStarted',
  'https://developer.niceincontact.com/Documentation/WhatsNew',
  'https://developer.niceincontact.com/Documentation/CXoneAgentSDK',
  'https://developer.niceincontact.com/Documentation/TryCXoneAPIs',
  'https://developer.niceincontact.com/Documentation/YourFirstApp',

  // ── Developer Portal — APIs ───────────────────────────────────────────────
  'https://developer.niceincontact.com/API',
  'https://developer.niceincontact.com/api/adminapi',
  'https://developer.niceincontact.com/api/agentapi',
  'https://developer.niceincontact.com/API/ReportingAPI',
  'https://developer.niceincontact.com/API/InteractionAnalyticsAPI',
  'https://developer.niceincontact.com/Expert',

  // ── Legacy Help Centers ───────────────────────────────────────────────────
  'https://help.nice-incontact.com/content/reporting/reporting.htm',
  'https://help.nice-incontact.com/content/releasenotes/release.htm',
  'https://help.incontact.com/',

  // ── Expert Help Center ────────────────────────────────────────────────────
  'https://expert-help.nice.com/',
  'https://expert-help.nice.com/Integrations_and_Extending_Content/API',
  'https://expert-help.nice.com/Integrations_and_Extending_Content/API/000_Getting_Started_With_the_API',
  'https://expert-help.nice.com/Admin/Release_Notes',
  'https://expert-help.nice.com/Admin/Release_Notes/2024_Product_Releases',

  // ── GitHub — nice-devone (READMEs e releases) ────────────────────────────
  'https://github.com/nice-devone',
  'https://github.com/nice-devone/nice-cxone-agent-sdk',
  'https://github.com/nice-devone/nice-cxone-chat-web-sdk',
  'https://github.com/nice-devone/nice-cxone-chat-web-sample',
  'https://github.com/nice-devone/nice-cxone-mobile-sdk-android',
  'https://github.com/nice-devone/nice-cxone-mobile-sdk-ios',

  // ── GitHub Pages — API Reference gerada ──────────────────────────────────
  'https://nice-devone.github.io/nice-cxone-chat-web-sdk/modules.html',
  'https://nice-devone.github.io/nice-cxone-mobile-sdk-android/',
  'https://nice-devone.github.io/nice-cxone-mobile-sdk-ios/',

  // ── npm — pulado: páginas npmjs.com são SPAs, sem HTML pra crawlear.
  //    O conteúdo dos READMEs vem dos repositórios GitHub acima.

  // ─── Enlighten Copilot / AI features (validated 2026) ───────────────────
  'https://help.nicecxone.com/content/copilotagents/copilotforagents.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/copilotforagents/enlightencopilotforagents.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/copilotforagents/createenlightencopilotforagentsprofiles.htm',
  'https://help.nicecxone.com/Content/agent/cxoneagentformt/enlightencopilotforagentscxamt.htm',
  'https://help.nicecxone.com/content/supervisorwem/enlightencopilotforsupervisors.htm',
  'https://help.nicecxone.com/content/enlightenautosummary/enlightenautosummary.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/autosummary/autosummary.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/autosummary/createautosummaryprofiles.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/rtig/rtigforadministrators.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/rtig/setuprtig.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/rtig/configurebehaviorguidance.htm',
  'https://help.nicecxone.com/content/aiassistantsandbots/agentassisthub/rtig/managertig.htm',
  'https://help.nicecxone.com/content/agent/cxoneagent/realtimeinteractionguidancecxa.htm',
  'https://help.nicecxone.com/content/globalfeatures/enlighten/enlightenai.htm',
  'https://help.nicecxone.com/content/acd/routing/enlightenairouting.htm',

  // ─── Developer APIs — endpoints específicos ─────────────────────────────
  'https://developer.niceincontact.com/Documentation/APIAuthenticationAndAuthorization',
  'https://developer.niceincontact.com/api/authenticationapi',
  'https://developer.niceincontact.com/API/AdminAPI',
  'https://developer.niceincontact.com/API/AgentAPI',
  'https://developer.niceincontact.com/API/UserHubAPI',
  'https://developer.niceincontact.com/API/RealTimeDataAPI',
  'https://developer.niceincontact.com/API/WFMAPI',
  'https://developer.niceincontact.com/api/dataextractionapi',
  'https://developer.niceincontact.com/api/digitalengagementapi',

  // ─── Studio / Scripts ───────────────────────────────────────────────────
  'https://help.nicecxone.com/content/studio/cxstudio.htm',
  'https://help.nicecxone.com/content/studio/fundamentals/fundamentalscx.htm',
  'https://help.nicecxone.com/content/studio/fundamentals/actionbasicscx.htm',
  'https://help.nicecxone.com/content/studio/gettingstarted/developbasicscriptcx.htm',
  'https://help.nicecxone.com/content/studio/guide/predefinedvariables.htm',
  'https://help.nicecxone.com/content/studio/fundamentals/customcodesnippets.htm',
  'https://help.nicecxone.com/content/studio/actionscx/snippet/snippet.htm',
  'https://help.nicecxone.com/Content/studio/fundamentals/prompts.htm',
  'https://help.nicecxone.com/Content/studio/advanced/asr/asr.htm',

  // ─── Quality Management (QM) ────────────────────────────────────────────
  'https://help.nicecxone.com/content/qmanalytics/welcometoqualitymanagement.htm',
  'https://help.nicecxone.com/content/qmanalytics/evaluate/evaluatinganinteraction.htm',
  'https://help.nicecxone.com/content/qmanalytics/formmanager/formmanager.htm',
  'https://help.nicecxone.com/content/qmanalytics/auto%20score/scorecard%20manager.htm',
  'https://help.nicecxone.com/content/qmanalytics/monitor/qualityperformance.htm',

  // ─── Workforce Management (WFM) ─────────────────────────────────────────
  'https://help.nicecxone.com/content/workforcemanagement/welcometoworkforcemanagement.htm',
  'https://help.nicecxone.com/content/workforcemanagement/forecastandstaffinggeneration.htm',
  'https://help.nicecxone.com/content/workforcemanagement/usingforecastingprofiles.htm',
  'https://help.nicecxone.com/content/workforcemanagement/monitoringrealtimeadherence.htm',
  'https://help.nicecxone.com/content/workforcemanagement/intraday.htm',
  'https://help.nicecxone.com/content/workforcemanagement/glossarywfm.htm',

  // ─── ACD / Routing / Channels / Recording / Surveys ─────────────────────
  'https://help.nicecxone.com/content/acd/channels/additionalchannelfeatures/skills/skills.htm',
  'https://help.nicecxone.com/content/acd/routing/routing.htm',
  'https://help.nicecxone.com/content/acd/routing/routingattributes/routingattributes.htm',
  'https://help.nicecxone.com/content/acd/routing/dynamicdelivery/configureuserskillproficiency.htm',
  'https://help.nicecxone.com/content/acd/digital/managedigitalskills.htm',
  'https://help.nicecxone.com/content/recording/waystorecord.htm',
  'https://help.nicecxone.com/content/recording/managerecordings.htm',
  'https://help.nicecxone.com/content/searchandplayback/welcometosearch.htm',
  'https://help.nicecxone.com/content/integratedsolutions/feedbackmanagement/feedbackmanagementoverview.htm',
  'https://help.nicecxone.com/content/acd/digital/channels/digitalchannels.htm',
  'https://help.nicecxone.com/content/acd/digital/chat/setuplivechat.htm',
  'https://help.nicecxone.com/content/acd/digital/channels/cxoneemailchannels.htm',
  'https://help.nicecxone.com/content/acd/channels/sms/messaging.htm',

  // ─── PT-BR (versões traduzidas para reforço multilíngue) ────────────────
  'https://help.nicecxone.com/pt-br/content/home.htm',
  'https://help.nicecxone.com/pt-br/content/studio/cxstudio.htm',
  'https://help.nicecxone.com/pt-br/content/copilotagents/copilotforagents.htm',
  'https://help.nicecxone.com/pt-br/content/workforcemanagement/welcometoworkforcemanagement.htm',
  'https://help.nicecxone.com/pt-br/content/qmanalytics/welcometoqualitymanagement.htm',
  'https://help.nicecxone.com/pt-br/content/acd/routing/routing.htm',
  'https://help.nicecxone.com/pt-br/content/acd/channels/additionalchannelfeatures/skills/skills.htm',
  'https://help.nicecxone.com/pt-br/content/recording/managerecordings.htm',
]

// ─── Domínios permitidos para crawl ──────────────────────────────────────────

const ALLOWED_DOMAINS = new Set([
  'help.nicecxone.com',
  'developer.niceincontact.com',
  'help.nice-incontact.com',
  'help.incontact.com',
  'expert-help.nice.com',
  'developer.nice.com',
  'www.nice.com',
  // GitHub: somente nice-devone — filtrado depois
  'github.com',
  'raw.githubusercontent.com',
  'nice-devone.github.io',
  // npm
  'www.npmjs.com',
])

// Bloqueia links do GitHub que não são da org nice-devone
function isGithubBlocked(url: URL): boolean {
  if (url.hostname !== 'github.com') return false
  const parts = url.pathname.split('/').filter(Boolean)
  // Permite: /nice-devone/*, /orgs/nice-devone/*
  if (parts[0] === 'nice-devone') return false
  if (parts[0] === 'orgs' && parts[1] === 'nice-devone') return false
  return true
}

// ─── Padrões de URL bloqueados ────────────────────────────────────────────────

const BLOCKED_URL_PATTERNS = [
  '/account/signin', '/home/login', '/error/', '/notfound',
  'returnurl=', 'authtype=', '/signup', '/join', '/register',
  '/login', '/logout', '/settings', '/pulls', '/issues',
  '/commits/', '/blob/', '/tree/', '/fork',   // GitHub ruído de código
  '/wiki/',                                   // GitHub wikis (raramente úteis)
  '/compare/', '/milestone/', '/labels',
  'activeTab=dependents', 'activeTab=versions', // npm abas sem conteúdo
]

// Sinais de página de erro/404 no conteúdo
const ERROR_CONTENT_SIGNALS = [
  'page not found', '404 not found', 'this page does not exist',
  'no longer available', 'page has been moved', "we couldn't find that page",
  'the requested url was not found', 'page cannot be found',
  'nothing to see here', 'access denied', 'you do not have permission',
]

const BLOCKED_TITLE_PATTERNS = [
  'not found', '404', 'error', 'login', 'sign in', 'access denied',
]

// Termos de prioridade para score de links
const PRIORITY_TERMS = [
  'whatsnew', 'what-s-new', 'release', 'releasenotes', 'changelog',
  'sdk', 'agent-sdk', 'cxoneagentsdk', 'copilot', 'enlighten',
  'api', 'authentication', 'reporting', 'digital',
]

const EXCLUDED_QUERY_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'source', 'ref',
]

// Extensões de arquivo que não são páginas HTML
const BINARY_EXTENSIONS = new Set([
  '.pdf', '.zip', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp',
  '.mp4', '.mp3', '.woff', '.woff2', '.ttf', '.eot', '.ico',
  '.js', '.css', '.ts', '.jsx', '.tsx',  // assets de código
])

// ─── Classificação de tipo de página ─────────────────────────────────────────

function classifyPage(url: string, title: string): CrawledPage['pageType'] {
  const signal = `${url} ${title}`.toLowerCase()
  if (signal.includes('release') || signal.includes('whatsnew') || signal.includes('what-s-new') || signal.includes('changelog')) {
    return 'release'
  }
  if (signal.includes('faq') || signal.includes('troubleshoot') || signal.includes('troubleshooting')) {
    return 'faq'
  }
  if (signal.includes('/api/') || signal.includes('api reference') || signal.includes('endpoint') || signal.includes('rest api')) {
    return 'api'
  }
  if (signal.includes('reference') || signal.includes('schema') || signal.includes('sdk') || signal.includes('modules.html')) {
    return 'reference'
  }
  if (signal.includes('guide') || signal.includes('gettingstarted') || signal.includes('tutorial') || signal.includes('getting started')) {
    return 'guide'
  }
  return 'other'
}

// ─── Normalização de URL ──────────────────────────────────────────────────────

function normalizeUrl(input: URL): string {
  const normalized = new URL(input.toString())
  normalized.hash = ''
  for (const param of EXCLUDED_QUERY_PARAMS) {
    normalized.searchParams.delete(param)
  }
  if (
    (normalized.protocol === 'https:' && normalized.port === '443') ||
    (normalized.protocol === 'http:' && normalized.port === '80')
  ) {
    normalized.port = ''
  }
  if (normalized.pathname.endsWith('/') && normalized.pathname.length > 1) {
    normalized.pathname = normalized.pathname.slice(0, -1)
  }
  return normalized.toString()
}

// ─── Fetch com retry e backoff exponencial ────────────────────────────────────

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init)
      if (response.ok || response.status < 500 || attempt === retries) return response
    } catch (error) {
      lastError = error
      if (attempt === retries) throw error
    }
    await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)))
  }
  throw lastError ?? new Error('Fetch failed after retries')
}

// ─── Detecção de 404 / erro ───────────────────────────────────────────────────

function isErrorPage(title: string, content: string, status: number): boolean {
  if (status === 404 || status >= 500) return true
  const titleLower = title.toLowerCase()
  if (BLOCKED_TITLE_PATTERNS.some(p => titleLower === p || titleLower.startsWith(p + ' '))) return true
  const sample = content.slice(0, 1200).toLowerCase()
  return ERROR_CONTENT_SIGNALS.some(p => sample.includes(p))
}

// ─── Extração de conteúdo por domínio ────────────────────────────────────────
// Cada domínio tem estrutura HTML diferente. Extraímos apenas o conteúdo útil.

function extractMainContent(
  $: ReturnType<typeof cheerio.load>,
  url: string,
): string {
  try {
    const { hostname, pathname } = new URL(url)

    // GitHub: README e releases — ignorar sidebar de código
    if (hostname === 'github.com') {
      const readme = $('#readme .markdown-body, article.markdown-body').first()
      if (readme.length && readme.text().trim().length > 200) return readme.text()
      // Releases page
      const releases = $('section.release-entry, .Box--condensed').first()
      if (releases.length) return releases.text()
      return $('main, .repository-content').first().text() || $('body').text()
    }

    // GitHub Pages (nice-devone.github.io) — API reference gerada
    if (hostname === 'nice-devone.github.io') {
      $('nav, .tsd-navigation, header, footer').remove()
      return $('.tsd-page-title, .tsd-comment, .container-main, main').first().text()
        || $('body').text()
    }

    // npm: apenas o README
    if (hostname === 'www.npmjs.com') {
      const readme = $('[data-testid="readme"], #readme').first()
      if (readme.length && readme.text().trim().length > 100) return readme.text()
      return $('main').first().text() || $('body').text()
    }

    // Expert Help Center (MadCap Flare customizado)
    if (hostname === 'expert-help.nice.com') {
      return $('.article-content, .topic-content, article, main').first().text()
        || $('body').text()
    }

    // help.nicecxone.com e help.nice-incontact.com (MadCap Flare)
    if (hostname.includes('nicecxone.com') || hostname.includes('nice-incontact.com') || hostname.includes('incontact.com')) {
      return $('#mc-main-content, .MCMainBodyIndented, .topic-body, main, article').first().text()
        || $('body').text()
    }
  } catch {
    // URL inválida, usa fallback
  }

  // Fallback genérico
  const main = $('main, article, .content, .topic-body, #content, .docs-content').first()
  return (main.length ? main : $('body')).text()
}

// ─── Extração de breadcrumb ────────────────────────────────────────────────────

function extractBreadcrumb($: ReturnType<typeof cheerio.load>): string {
  // MadCap Flare (help.nicecxone.com)
  const madcap = $('.MCBreadcrumbsLink, .MCBreadcrumbsDivider')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
  if (madcap.length >= 2) return madcap.filter(t => t !== '>' && t !== '/').join(' > ')

  // W3C aria-label="breadcrumb"
  const aria = $('[aria-label="breadcrumb"] a, [aria-label="Breadcrumb"] a, [aria-label="breadcrumbs"] a')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
  if (aria.length >= 2) return aria.join(' > ')

  // Classes genéricas
  const generic = $('.breadcrumb a, .breadcrumbs a, .bc a, nav.breadcrumb span, ol.breadcrumb li')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
  if (generic.length >= 2) return generic.join(' > ')

  return ''
}

// ─── Score de links descobertos ────────────────────────────────────────────────

function scoreLink(href: string, anchorText = ''): number {
  const lower = `${href} ${anchorText}`.toLowerCase()
  let score = 0
  for (const term of PRIORITY_TERMS) {
    if (lower.includes(term)) score += 15
  }
  try {
    const u = new URL(href)
    const depth = u.pathname.split('/').filter(Boolean).length
    if (lower.includes('/documentation/')) score += 8
    if (lower.includes('/api/')) score += 6
    if (/\b20\d{2}\b/.test(lower) || /\bv\d+\.\d+/.test(lower)) score += 10
    if (lower.includes('deprecated')) score -= 12
    score -= depth * 0.5
  } catch {
    // ignore
  }
  return score
}

// ─── Exports principais ────────────────────────────────────────────────────────

/** Crawla uma página e retorna conteúdo estruturado, ou null se inválida/404. */
export async function crawlPage(url: string): Promise<CrawledPage | null> {
  // Rejeitar URLs bloqueadas antes do fetch
  const urlLower = url.toLowerCase()
  if (BLOCKED_URL_PATTERNS.some(p => urlLower.includes(p))) return null

  try {
    const res = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NixaAI-Indexer/1.0; +https://github.com/nixa-ai)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(18_000),
    })

    // 404, 5xx, redirect para login, etc.
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    // Breadcrumb ANTES de remover navegação
    const breadcrumb = extractBreadcrumb($)

    // Remove ruído (navegação, scripts, cookie banners, etc.)
    $(
      'nav, footer, header, script, style, noscript, ' +
      '.nav, .footer, .breadcrumb, .cookie-banner, .signup-banner, ' +
      '#cookie-notice, [role="navigation"], [role="banner"], ' +
      '.feedback, .page-feedback, .survey-banner, ' +
      '.MCTopicToolbar, .MCMiniTOCBody'  // MadCap Flare boilerplate
    ).remove()

    const title = (
      $('h1').first().text().trim() ||
      $('title').text()
        .replace(/\s*[-|]\s*(NICE|CXone|DEVone|inContact).*/i, '')
        .trim()
    ) || url

    if (!title || BLOCKED_TITLE_PATTERNS.some(p => title.toLowerCase().startsWith(p))) return null

    const pageType = classifyPage(url, title)

    const rawContent = extractMainContent($, url)
    const cleanText = rawContent
      .replace(/\t/g, ' ')
      .replace(/ {2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (cleanText.length < 150) return null
    if (isErrorPage(title, cleanText, res.status)) return null

    return { url, title, content: cleanText, breadcrumb, pageType }
  } catch {
    return null
  }
}

/** Descobre links internos a partir de uma URL já crawlada. */
export async function discoverLinks(url: string, maxLinks = 25): Promise<string[]> {
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NixaAI-Indexer/1.0)' },
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

        // Filtros rápidos
        if (!ALLOWED_DOMAINS.has(resolved.hostname)) return
        if (isGithubBlocked(resolved)) return
        if (BINARY_EXTENSIONS.has(ext)) return
        if (BLOCKED_URL_PATTERNS.some(p => resolved.href.toLowerCase().includes(p))) return
        if (resolved.pathname === baseUrl.pathname) return

        const normalizedUrl = normalizeUrl(resolved)
        const anchorText = $(el).text().trim()
        const score = scoreLink(normalizedUrl, anchorText)

        links.set(normalizedUrl, Math.max(links.get(normalizedUrl) ?? -Infinity, score))
      } catch {
        // URL inválida
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

/**
 * Divide texto em chunks semânticos com sobreposição.
 * Injeta `[Contexto: breadcrumb]` no início de cada chunk para que
 * o LLM entenda de qual seção veio mesmo em chunks isolados.
 */
export function chunkText(
  text: string,
  breadcrumb = '',
  maxSize = 900,
  overlap = 200,
): string[] {
  const contextPrefix = breadcrumb ? `[Contexto: ${breadcrumb}]\n\n` : ''
  const effectiveMax = maxSize - contextPrefix.length

  const paragraphs = text.split(/\n\n+/)
  const rawChunks: string[] = []
  let current = ''
  let pendingHeading = ''

  const isHeadingLike = (s: string) =>
    s.length > 2 && s.length < 120 && /^[A-ZÀ-Ú0-9][^\n]{1,119}$/.test(s)

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if (isHeadingLike(trimmed)) {
      pendingHeading = trimmed
      continue
    }

    const sectionText = pendingHeading ? `${pendingHeading}\n${trimmed}` : trimmed
    pendingHeading = ''

    if (current.length + sectionText.length + 2 > effectiveMax && current.length > 0) {
      rawChunks.push(current.trim())
      current = current.slice(-overlap) + '\n\n' + sectionText
    } else {
      current += (current ? '\n\n' : '') + sectionText
    }
  }

  if (current.trim().length > 80) rawChunks.push(current.trim())

  return rawChunks.map(chunk => contextPrefix + chunk)
}
