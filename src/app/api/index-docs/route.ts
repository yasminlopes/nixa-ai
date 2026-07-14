import { NextRequest } from 'next/server'
import { crawlPage, discoverLinks, chunkText, SEED_URLS } from '@/core/crawler'
import {
  addDocChunks,
  clearStore,
  getIndexedUrlsWithDates,
  getStoreStats,
  isUrlStale,
} from '@/core/vectorstore'
import { type EmbeddingProvider } from '@/core/embeddings'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET() {
  const stats = await getStoreStats()
  return Response.json(stats)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const maxPages: number  = body.maxPages  ?? 20
  const maxDepth: number  = body.maxDepth  ?? 1
  const staleDays: number = body.staleDays ?? 30
  const force: boolean    = body.force     ?? false
  const provider: EmbeddingProvider = body.embeddingProvider ?? 'gemini'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(msg: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ msg })}\n\n`))
      }

      const warnings = new Set<string>()
      function onWarning(msg: string) {
        if (!warnings.has(msg)) {
          warnings.add(msg)
          send(msg)
        }
      }

      try {
        type QueueItem = { url: string; depth: number; priority: number }

        const visited  = new Set<string>()
        const queued   = new Set<string>(SEED_URLS)
        const queue: QueueItem[] = SEED_URLS.map((url, i) => ({
          url, depth: 0,
          priority: 100 - i * 0.5 + (url.includes('release') ? 20 : 0),
        }))

        const indexedDates = force ? new Map<string, string>() : await getIndexedUrlsWithDates()
        const initialStats = await getStoreStats()
        let indexed = 0, skipped = 0, errors = 0

        send(`🚀 Iniciando indexação — ${SEED_URLS.length} seeds, máx ${maxPages} páginas`)
        send(`   Stale após ${staleDays} dias | ${indexedDates.size} URLs já indexadas`)
        send(`   Usando embedding provider: ${provider}`)

        while (queue.length > 0 && visited.size < maxPages) {
          // Prioriza por score e processa em micro-batches sequenciais
          queue.sort((a, b) => b.priority - a.priority)
          const item = queue.shift()!
          queued.delete(item.url)
          const { url, depth } = item

          if (visited.has(url)) continue
          visited.add(url)

          // ── Verificar staleness ──────────────────────────────────────────
          const crawledAt = indexedDates.get(url)
          const stale = isUrlStale(crawledAt, staleDays)

          if (crawledAt && !stale) {
            skipped++
            const ageDays = Math.floor((Date.now() - Date.parse(crawledAt)) / 86_400_000)
            send(`↷ (${visited.size}/${maxPages}) já indexado (${ageDays}d): ${url}`)

            // Mesmo pulando, descobrimos links para alcançar sub-páginas novas
            if (depth < maxDepth && visited.size < maxPages) {
              const links = await discoverLinks(url, 15)
              for (const link of links) {
                if (!visited.has(link) && !queued.has(link)) {
                  queue.push({ url: link, depth: depth + 1, priority: 50 })
                  queued.add(link)
                }
              }
            }
            continue
          }

          // ── Crawl ────────────────────────────────────────────────────────
          const label = stale && crawledAt ? '(refresh) ' : ''
          send(`⟳  (${visited.size}/${maxPages}) ${label}${url}`)

          const page = await crawlPage(url)
          if (!page) {
            errors++
            send(`   ✗ sem conteúdo / 404`)
            continue
          }

          const chunks = chunkText(page.content, page.breadcrumb).map(content => ({
            content,
            metadata: {
              source:     page.title,
              title:      page.title,
              url:        page.url,
              breadcrumb: page.breadcrumb || undefined,
              pageType:   page.pageType,
              crawledAt:  new Date().toISOString(),
            },
          }))

          try {
            await addDocChunks(chunks, provider, onWarning)
            indexedDates.set(url, new Date().toISOString())
            indexed += chunks.length
            send(`   ✓ ${chunks.length} chunks (${page.pageType}) — "${page.title}"`)
          } catch (embedErr) {
            errors++
            // Detalhe fica só no log do servidor — nunca repassado ao cliente.
            console.error('[INDEX-DOCS] embedding error:', embedErr instanceof Error ? embedErr.message : embedErr)
            send(`   ⚠️ falha no embedding desta página, pulando`)
            // Não interrompe a indexação geral — continua próximo URL
          }

          // ── Descobrir links filhos ────────────────────────────────────────
          if (depth < maxDepth && visited.size < maxPages) {
            const links = await discoverLinks(url, 15)
            for (const link of links) {
              if (!visited.has(link) && !queued.has(link)) {
                queue.push({ url: link, depth: depth + 1, priority: 60 })
                queued.add(link)
              }
            }
          }
        }

        const finalStats = await getStoreStats()
        send(`\n✅ Concluído!`)
        send(`   Páginas visitadas : ${visited.size}`)
        send(`   Chunks indexados  : ${indexed}`)
        send(`   Pulados (ok)      : ${skipped}`)
        send(`   Erros/404         : ${errors}`)
        send(`   Base total        : ${initialStats.count} → ${finalStats.count} chunks`)
        send(`   Fontes distintas  : ${finalStats.sources.length}`)
      } catch (err) {
        console.error('[INDEX-DOCS] fatal error:', err instanceof Error ? err.message : err)
        send('❌ Erro ao indexar. Veja os logs do servidor para detalhes.')
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function DELETE() {
  await clearStore()
  return Response.json({ ok: true })
}
