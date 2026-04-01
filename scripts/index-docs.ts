/**
 * Nixa AI — Indexador de documentação NICE/CXone
 *
 * Uso:
 *   bun run index-docs                     # indexa novas + stale (>14 dias)
 *   FORCE_REINDEX=true bun run index-docs  # re-indexa tudo
 *   MAX_PAGES=100 bun run index-docs       # mais páginas
 *   STALE_DAYS=7 bun run index-docs        # refresh mais frequente
 *
 * Requer GEMINI_API_KEY no .env.local
 */

import path from 'path'

// ─── Config via env ───────────────────────────────────────────────────────────

async function loadEnv() {
  const fs = await import('fs/promises')
  try {
    const content = await fs.readFile(path.join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      process.env[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
    }
  } catch { /* .env.local opcional */ }
}

// ─── Prioridade de URL para ordenar a fila ────────────────────────────────────

interface QueueItem { url: string; depth: number; priority: number }

function inferPriority(url: string, depth: number, rank = 0): number {
  const lower = url.toLowerCase()
  let score = 100 - depth * 14 - rank * 0.5
  // Boost por tipo de conteúdo
  if (/release|whatsnew|changelog/.test(lower)) score += 30
  if (/copilot|enlighten|sentiment/.test(lower))  score += 25
  if (/sdk|agent-sdk/.test(lower))                score += 20
  if (/\/api\/|reportingapi|analyticsapi/.test(lower)) score += 15
  if (/gettingstarted|getting.started/.test(lower)) score += 12
  if (/deprecated|archive/.test(lower))            score -= 20
  if (/github\.com/.test(lower))                   score -= 5  // útil mas secundário
  return score
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await loadEnv()

  if (!process.env.GEMINI_API_KEY && process.env.GOOGLE_API_KEY) {
    process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌  GEMINI_API_KEY não encontrada. Crie um .env.local com essa variável.')
    process.exit(1)
  }

  const { crawlPage, discoverLinks, chunkText, SEED_URLS } = await import('../src/lib/crawler')
  const { addDocChunks, getIndexedUrlsWithDates, isUrlStale } = await import('../src/lib/vectorstore')

  const MAX_PAGES    = parseInt(process.env.MAX_PAGES    ?? '80')
  const MAX_DEPTH    = parseInt(process.env.MAX_DEPTH    ?? '2')
  const CONCURRENCY  = parseInt(process.env.CONCURRENCY  ?? '4')
  const MAX_LINKS    = parseInt(process.env.MAX_LINKS    ?? '20')
  const STALE_DAYS   = parseInt(process.env.STALE_DAYS   ?? '14')
  const FORCE        = process.env.FORCE_REINDEX === 'true'

  const indexedDates = FORCE ? new Map<string, string>() : await getIndexedUrlsWithDates()

  const visited  = new Set<string>()
  const queued   = new Set<string>(SEED_URLS)
  const queue: QueueItem[] = SEED_URLS.map((url, i) => ({
    url, depth: 0, priority: inferPriority(url, 0, i),
  }))

  let totalIndexed = 0
  let totalSkipped = 0
  let totalError   = 0

  console.log(`\n🚀  Nixa AI Indexer`)
  console.log(`   Seeds       : ${SEED_URLS.length}`)
  console.log(`   Máx páginas : ${MAX_PAGES}`)
  console.log(`   Profundidade: ${MAX_DEPTH}`)
  console.log(`   Concorrência: ${CONCURRENCY}`)
  console.log(`   Stale após  : ${STALE_DAYS} dias`)
  console.log(`   Force reindex: ${FORCE}`)
  console.log(`   URLs já indexadas: ${indexedDates.size}\n`)

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    // Ordena pelo score mais alto e pega um batch
    queue.sort((a, b) => b.priority - a.priority)
    const batchSize = Math.min(CONCURRENCY, queue.length, MAX_PAGES - visited.size)
    const batch = queue.splice(0, batchSize)
    for (const item of batch) queued.delete(item.url)

    await Promise.all(batch.map(async item => {
      const { url, depth } = item

      if (visited.has(url)) return
      visited.add(url)

      // ── Verificar staleness ─────────────────────────────────────────────
      const crawledAt = indexedDates.get(url)
      const stale = isUrlStale(crawledAt, STALE_DAYS)

      if (crawledAt && !stale) {
        totalSkipped++
        process.stdout.write(`  ↷ [${visited.size}/${MAX_PAGES}] Já indexado (${Math.floor((Date.now() - Date.parse(crawledAt)) / 86_400_000)}d atrás): ${url}\n`)

        // Mesmo pulando, descobrimos links para encontrar sub-páginas novas
        if (depth < MAX_DEPTH && visited.size < MAX_PAGES) {
          const links = await discoverLinks(url, MAX_LINKS)
          for (const link of links) {
            if (!visited.has(link) && !queued.has(link)) {
              queue.push({ url: link, depth: depth + 1, priority: inferPriority(link, depth + 1) })
              queued.add(link)
            }
          }
        }
        return
      }

      // ── Crawl ──────────────────────────────────────────────────────────
      process.stdout.write(`  ⟳  [${visited.size}/${MAX_PAGES}] ${stale && crawledAt ? '(refresh) ' : ''}${url} `)

      const page = await crawlPage(url)
      if (!page) {
        totalError++
        process.stdout.write('→ sem conteúdo / 404, pulado\n')
        return
      }

      // ── Chunking + indexação ────────────────────────────────────────────
      const chunks = chunkText(page.content, page.breadcrumb).map(content => ({
        content,
        metadata: {
          source:    page.title,
          title:     page.title,
          url:       page.url,
          breadcrumb: page.breadcrumb || undefined,
          pageType:  page.pageType,
          crawledAt: new Date().toISOString(),
        },
      }))

      await addDocChunks(chunks)
      indexedDates.set(url, new Date().toISOString())
      totalIndexed += chunks.length
      process.stdout.write(`→ ${chunks.length} chunks (${page.pageType})\n`)

      // ── Descobrir links ─────────────────────────────────────────────────
      if (depth < MAX_DEPTH && visited.size < MAX_PAGES) {
        const links = await discoverLinks(url, MAX_LINKS)
        for (const link of links) {
          if (!visited.has(link) && !queued.has(link)) {
            queue.push({ url: link, depth: depth + 1, priority: inferPriority(link, depth + 1) })
            queued.add(link)
          }
        }
      }
    }))
  }

  const { getStoreStats } = await import('../src/lib/vectorstore')
  const stats = await getStoreStats()

  console.log(`\n✅  Concluído!`)
  console.log(`   Páginas visitadas : ${visited.size}`)
  console.log(`   Chunks indexados  : ${totalIndexed}`)
  console.log(`   Puladas (ok)      : ${totalSkipped}`)
  console.log(`   Erros/404         : ${totalError}`)
  console.log(`   Total no banco    : ${stats.count} chunks`)
  console.log(`   Fontes distintas  : ${stats.sources.length}\n`)
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })
