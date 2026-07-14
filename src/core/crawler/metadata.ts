import { createHash } from 'crypto'
import type { PageType, Product } from './types'

const PRODUCT_RULES: Array<[RegExp, Product]> = [
  [/copilot|enlighten|agentassist|autosummary|\brtig\b/i, 'Copilot'],
  [/workforcemanagement|\bwfm\b|forecast|adherence|intraday/i, 'WFM'],
  [/qmanalytics|\bquality\b|evaluat|scorecard/i, 'QM'],
  [/\bstudio\b|script|snippet|predefinedvariables/i, 'Studio'],
  [/recording|searchandplayback|playback/i, 'Recording'],
  [/digital|livechat|\bchat\b|\bsms\b|\bemail\b/i, 'Digital'],
  [/reporting|analytics|dashboard/i, 'Reporting'],
  [/\bapi\b|\bsdk\b|developer|authentication/i, 'Developer'],
  [/\bacd\b|routing|skill|queue|channels/i, 'ACD'],
  [/cxoneagent|\bmax\b|\bagent\b/i, 'CXA'],
]

export function detectProduct(url: string, title: string, breadcrumb: string): Product | undefined {
  const signal = `${url} ${title} ${breadcrumb}`.toLowerCase()
  for (const [regex, product] of PRODUCT_RULES) {
    if (regex.test(signal)) return product
  }
  return undefined
}

export function detectLanguage(url: string): string {
  return url.toLowerCase().includes('/pt-br/') ? 'pt-BR' : 'en'
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function classifyPage(url: string, title: string): PageType {
  const signal = `${url} ${title}`.toLowerCase()

  if (signal.includes('release') || signal.includes('whatsnew') || signal.includes('what-s-new') || signal.includes('changelog')) {
    return 'release'
  }
  if (signal.includes('troubleshoot') || signal.includes('known issue') || signal.includes('resolve issue') || signal.includes('common problem')) {
    return 'troubleshooting'
  }
  if (signal.includes('/api/') || signal.includes('api reference') || signal.includes('endpoint') || signal.includes('rest api')) {
    return 'api'
  }
  if (signal.includes('reference') || signal.includes('schema') || signal.includes('sdk') || signal.includes('modules.html')) {
    return 'reference'
  }
  if (signal.includes('config') || signal.includes('setup') || signal.includes('install') || signal.includes('provision') || signal.includes('administra')) {
    return 'configuration'
  }
  if (signal.includes('faq')) {
    return 'faq'
  }
  if (signal.includes('guide') || signal.includes('gettingstarted') || signal.includes('tutorial') || signal.includes('getting started')) {
    return 'guide'
  }
  return 'other'
}

const AI_PRIORITY_TERMS = [
  'copilot', 'enlighten', 'autosummary', 'rtig', 'agentassist',
  'interactionguidance', 'aiassistants',
]

const PRIORITY_TERMS = [
  'whatsnew', 'what-s-new', 'release', 'releasenotes', 'changelog',
  'sdk', 'agent-sdk', 'cxoneagentsdk', 'api', 'authentication',
  'reporting', 'digital', 'studio', 'troubleshoot',
]

const LOW_PRIORITY_TERMS = [
  'glossary', 'legal', 'privacy', 'cookie', 'accessibility',
  'trademark', 'copyright', 'sitemap', 'print', 'archive', 'deprecated',
]

/**
 * Pontua um link candidato para priorizar a fila do crawler. Termos de IA/Copilot
 * pesam mais (foco da Nixa), termos de baixo valor (glossário, legal) penalizam,
 * e profundidade grande de path reduz levemente a nota.
 */
export function scoreLink(href: string, anchorText = ''): number {
  const lower = `${href} ${anchorText}`.toLowerCase()
  let score = 0

  for (const term of AI_PRIORITY_TERMS) {
    if (lower.includes(term)) score += 25
  }
  for (const term of PRIORITY_TERMS) {
    if (lower.includes(term)) score += 15
  }
  for (const term of LOW_PRIORITY_TERMS) {
    if (lower.includes(term)) score -= 12
  }

  try {
    const parsedUrl = new URL(href)
    const depth = parsedUrl.pathname.split('/').filter(Boolean).length
    if (lower.includes('/documentation/')) score += 8
    if (lower.includes('/api/')) score += 6
    if (/\b20\d{2}\b/.test(lower) || /\bv\d+\.\d+/.test(lower)) score += 10
    score -= depth * 0.5
  } catch {
  }

  return score
}
