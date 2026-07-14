import * as cheerio from 'cheerio';

import {
  BLOCKED_TITLE_PATTERNS,
  ERROR_CONTENT_SIGNALS,
  EXCLUDED_QUERY_PARAMS,
  USER_AGENT,
} from './config';

export function isGithubBlocked(url: URL): boolean {
  if (url.hostname !== 'github.com') return false;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'nice-devone') return false;
  if (parts[0] === 'orgs' && parts[1] === 'nice-devone') return false;
  return true;
}

export function normalizeUrl(input: URL): string {
  const normalized = new URL(input.toString());
  normalized.hash = '';
  for (const param of EXCLUDED_QUERY_PARAMS) {
    normalized.searchParams.delete(param);
  }
  if (
    (normalized.protocol === 'https:' && normalized.port === '443') ||
    (normalized.protocol === 'http:' && normalized.port === '80')
  ) {
    normalized.port = '';
  }
  if (normalized.pathname.endsWith('/') && normalized.pathname.length > 1) {
    normalized.pathname = normalized.pathname.slice(0, -1);
  }
  return normalized.toString();
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || response.status < 500 || attempt === retries) return response;
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt)));
  }
  throw lastError ?? new Error('Fetch failed after retries');
}

export function fetchDocHeaders(): RequestInit['headers'] {
  return {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  };
}

export function isErrorPage(title: string, content: string, status: number): boolean {
  if (status === 404 || status >= 500) return true;
  const titleLower = title.toLowerCase();
  if (
    BLOCKED_TITLE_PATTERNS.some(
      (pattern) => titleLower === pattern || titleLower.startsWith(pattern + ' '),
    )
  )
    return true;
  const sample = content.slice(0, 1200).toLowerCase();
  return ERROR_CONTENT_SIGNALS.some((pattern) => sample.includes(pattern));
}

export function extractMainContent($: ReturnType<typeof cheerio.load>, url: string): string {
  try {
    const { hostname } = new URL(url);

    if (hostname === 'github.com') {
      const readme = $('#readme .markdown-body, article.markdown-body').first();
      if (readme.length && readme.text().trim().length > 200) return readme.text();
      const releases = $('section.release-entry, .Box--condensed').first();
      if (releases.length) return releases.text();
      return $('main, .repository-content').first().text() || $('body').text();
    }

    if (hostname === 'nice-devone.github.io') {
      $('nav, .tsd-navigation, header, footer').remove();
      return (
        $('.tsd-page-title, .tsd-comment, .container-main, main').first().text() || $('body').text()
      );
    }

    if (hostname === 'www.npmjs.com') {
      const readme = $('[data-testid="readme"], #readme').first();
      if (readme.length && readme.text().trim().length > 100) return readme.text();
      return $('main').first().text() || $('body').text();
    }

    if (hostname === 'expert-help.nice.com') {
      return (
        $('.article-content, .topic-content, article, main').first().text() || $('body').text()
      );
    }

    if (
      hostname.includes('nicecxone.com') ||
      hostname.includes('nice-incontact.com') ||
      hostname.includes('incontact.com')
    ) {
      return (
        $('#mc-main-content, .MCMainBodyIndented, .topic-body, main, article').first().text() ||
        $('body').text()
      );
    }
  } catch {}

  const main = $('main, article, .content, .topic-body, #content, .docs-content').first();
  return (main.length ? main : $('body')).text();
}

export function extractBreadcrumb($: ReturnType<typeof cheerio.load>): string {
  const madcap = $('.MCBreadcrumbsLink, .MCBreadcrumbsDivider')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  if (madcap.length >= 2) return madcap.filter((text) => text !== '>' && text !== '/').join(' > ');

  const aria = $(
    '[aria-label="breadcrumb"] a, [aria-label="Breadcrumb"] a, [aria-label="breadcrumbs"] a',
  )
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  if (aria.length >= 2) return aria.join(' > ');

  const generic = $('.breadcrumb a, .breadcrumbs a, .bc a, nav.breadcrumb span, ol.breadcrumb li')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  if (generic.length >= 2) return generic.join(' > ');

  return '';
}
