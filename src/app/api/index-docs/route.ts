import { NextRequest } from 'next/server';

import { chunkText, crawlPage, discoverLinks, SEED_URLS } from '@/core/crawler';
import { type EmbeddingProvider, getIndexingEmbeddingProvider } from '@/core/embeddings';
import {
  type ApiKeyMap,
  getKeyForProvider,
  MissingApiKeyError,
} from '@/core/settings/provider-key-service';
import {
  addDocChunks,
  clearStore,
  getIndexedContentHash,
  getIndexedUrlsWithDates,
  getStoreStats,
  isUrlStale,
} from '@/core/vectorstore';

export const runtime = 'nodejs';
export const maxDuration = 300;

function isAuthLikeError(detail: string): boolean {
  const lower = detail.toLowerCase();
  return (
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated') ||
    lower.includes('chave de api') ||
    lower.includes('401') ||
    lower.includes('403')
  );
}

function truncateDetail(detail: string, max = 180): string {
  const flat = detail.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export async function GET() {
  const stats = await getStoreStats();
  return Response.json(stats);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const maxPages: number = body.maxPages ?? 20;
  const maxDepth: number = body.maxDepth ?? 1;
  const staleDays: number = body.staleDays ?? 30;
  const force: boolean = body.force ?? false;
  const provider: EmbeddingProvider = body.embeddingProvider ?? getIndexingEmbeddingProvider();
  const apiKeys: ApiKeyMap | undefined = body.apiKeys;

  let embeddingApiKey = '';
  try {
    embeddingApiKey = getKeyForProvider(provider, apiKeys);
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return Response.json(
        { message: `Configure uma chave de ${provider} em Modelos de IA antes de indexar.` },
        { status: 400 },
      );
    }
    throw error;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(msg: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ msg })}\n\n`));
      }

      const warnings = new Set<string>();
      function onWarning(msg: string) {
        if (!warnings.has(msg)) {
          warnings.add(msg);
          send(msg);
        }
      }

      try {
        type QueueItem = { url: string; depth: number; priority: number };

        const visited = new Set<string>();
        const queued = new Set<string>(SEED_URLS);
        const queue: QueueItem[] = SEED_URLS.map((url, i) => ({
          url,
          depth: 0,
          priority: 100 - i * 0.5 + (url.includes('release') ? 20 : 0),
        }));

        const indexedDates = force ? new Map<string, string>() : await getIndexedUrlsWithDates();
        const initialStats = await getStoreStats();
        let indexed = 0,
          skipped = 0,
          errors = 0;

        send(`🚀 Iniciando indexação — ${SEED_URLS.length} seeds, máx ${maxPages} páginas`);
        send(`   Stale após ${staleDays} dias | ${indexedDates.size} URLs já indexadas`);
        send(`   Usando embedding provider: ${provider}`);

        while (queue.length > 0 && visited.size < maxPages) {
          queue.sort((a, b) => b.priority - a.priority);
          const item = queue.shift()!;
          queued.delete(item.url);
          const { url, depth } = item;

          if (visited.has(url)) continue;
          visited.add(url);

          const crawledAt = indexedDates.get(url);
          const stale = isUrlStale(crawledAt, staleDays);

          if (crawledAt && !stale) {
            skipped++;
            const ageDays = Math.floor((Date.now() - Date.parse(crawledAt)) / 86_400_000);
            send(`↷ (${visited.size}/${maxPages}) já indexado (${ageDays}d): ${url}`);

            if (depth < maxDepth && visited.size < maxPages) {
              const links = await discoverLinks(url, 15);
              for (const link of links) {
                if (!visited.has(link) && !queued.has(link)) {
                  queue.push({ url: link, depth: depth + 1, priority: 50 });
                  queued.add(link);
                }
              }
            }
            continue;
          }

          const label = stale && crawledAt ? '(refresh) ' : '';
          send(`⟳  (${visited.size}/${maxPages}) ${label}${url}`);

          const page = await crawlPage(url);
          if (!page) {
            errors++;
            send(`   ✗ sem conteúdo / 404`);
            continue;
          }

          if (!force) {
            const previousHash = await getIndexedContentHash(url);
            if (previousHash && previousHash === page.contentHash) {
              skipped++;
              send(`   ↷ conteúdo inalterado (hash), pulando embedding`);
              continue;
            }
          }

          const indexedAtIso = new Date().toISOString();
          const chunks = chunkText(page.content).map((content) => ({
            content,
            metadata: {
              source: page.title,
              title: page.title,
              url: page.url,
              breadcrumb: page.breadcrumb || undefined,
              pageType: page.pageType,
              domain: page.domain,
              product: page.product,
              language: page.language,
              headings: page.headings.length > 0 ? page.headings : undefined,
              contentHash: page.contentHash,
              crawledAt: indexedAtIso,
            },
          }));

          try {
            await addDocChunks(chunks, provider, embeddingApiKey, onWarning);
            indexedDates.set(url, new Date().toISOString());
            indexed += chunks.length;
            send(`   ✓ ${chunks.length} chunks (${page.pageType}) — "${page.title}"`);
          } catch (error) {
            errors++;
            const detail = error instanceof Error ? error.message : String(error);
            console.error('[INDEX-DOCS] embedding error:', detail);
            if (isAuthLikeError(detail)) {
              send(
                `❌ Falha de autenticação no provider de embeddings (${provider}). A chave configurada é inválida ou sem acesso — corrija a chave e reindexe.`,
              );
              send(`   Detalhe: ${truncateDetail(detail)}`);
              break;
            }
            send(`   ⚠️ falha no embedding desta página, pulando — ${truncateDetail(detail)}`);
          }

          if (depth < maxDepth && visited.size < maxPages) {
            const links = await discoverLinks(url, 15);
            for (const link of links) {
              if (!visited.has(link) && !queued.has(link)) {
                queue.push({ url: link, depth: depth + 1, priority: 60 });
                queued.add(link);
              }
            }
          }
        }

        const finalStats = await getStoreStats();
        send(`\n✅ Concluído!`);
        send(`   Páginas visitadas : ${visited.size}`);
        send(`   Chunks indexados  : ${indexed}`);
        send(`   Pulados (ok)      : ${skipped}`);
        send(`   Erros/404         : ${errors}`);
        send(`   Base total        : ${initialStats.count} → ${finalStats.count} chunks`);
        send(`   Fontes distintas  : ${finalStats.sources.length}`);
      } catch (error) {
        console.error('[INDEX-DOCS] fatal error:', error instanceof Error ? error.message : error);
        send('❌ Erro ao indexar. Veja os logs do servidor para detalhes.');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function DELETE() {
  await clearStore();
  return Response.json({ ok: true });
}
