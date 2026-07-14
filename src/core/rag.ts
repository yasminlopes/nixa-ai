import { DocChunk, Message } from '@/shared/types';

function compressChunk(text: string, maxChars = 700): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  const lastParagraphBreak = truncated.lastIndexOf('\n\n');
  if (lastParagraphBreak > Math.floor(maxChars * 0.65)) {
    return `${truncated.slice(0, lastParagraphBreak).trim()} [Resumo...]`;
  }

  const lastLineBreak = truncated.lastIndexOf('\n');
  if (lastLineBreak > Math.floor(maxChars * 0.7)) {
    return `${truncated.slice(0, lastLineBreak).trim()} [Resumo...]`;
  }

  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > Math.floor(maxChars * 0.65)) {
    return `${truncated.slice(0, lastPeriod + 1).trim()} [Resumo...]`;
  }

  return `${truncated.trim()}...`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sourcePriority(pageType: DocChunk['metadata']['pageType']): number {
  const type = pageType ?? 'other';
  if (type === 'api') return 1;
  if (type === 'reference') return 2;
  if (type === 'guide') return 3;
  if (type === 'release') return 4;
  if (type === 'faq') return 5;
  return 6;
}

function buildStructuredContext(docs: DocChunk[]): string {
  const grouped: Record<string, DocChunk[]> = {
    api: [],
    reference: [],
    guide: [],
    release: [],
    faq: [],
    other: [],
  };

  for (const doc of docs) {
    const type = doc.metadata.pageType ?? 'other';
    grouped[type] = grouped[type] ?? [];
    grouped[type].push(doc);
  }

  const sections = Object.entries(grouped)
    .filter(([, items]) => items.length > 0)
    .sort(
      (a, b) =>
        sourcePriority(a[0] as DocChunk['metadata']['pageType']) -
        sourcePriority(b[0] as DocChunk['metadata']['pageType']),
    )
    .map(([type, items]) => {
      const docsText = items
        .map(
          (doc, index) =>
            `<document index="${index + 1}" type="${escapeXml(type)}" url="${escapeXml(doc.metadata.url)}">\n` +
            `  <title>${escapeXml(doc.metadata.title)}</title>\n` +
            (doc.metadata.breadcrumb
              ? `  <breadcrumb>${escapeXml(doc.metadata.breadcrumb)}</breadcrumb>\n`
              : '') +
            `  <content>${escapeXml(compressChunk(doc.content))}</content>\n` +
            `</document>`,
        )
        .join('\n\n');

      return `<section type="${escapeXml(type.toUpperCase())}">\n${docsText}\n</section>`;
    });

  return `<context>\n${sections.join('\n')}\n</context>`;
}

function stripIntroPrefix(text: string): string {
  const patterns = [
    /^\s*(ol[aá]|oi|hello|hi)[^\n.!?]{0,80}\b(nixa)\b[^\n.!?]*[\n.!?\-:]*/i,
    /^\s*eu\s+sou\s+a\s+nixa[^\n.!?]*[\n.!?\-:]*/i,
    /^\s*ol[aá],?\s+sou\s+a\s+nixa[^\n.!?]*[\n.!?\-:]*/i,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trimStart();
}

export function buildSystemPrompt(
  docs: DocChunk[],
  userName?: string,
  options?: { isInconclusive?: boolean; isDefinitionQuestion?: boolean },
): string {
  const context =
    docs.length > 0 ? buildStructuredContext(docs) : 'Nenhuma documentação indexada ainda.';

  const safeUserName = (userName ?? '').trim();
  const personalization = safeUserName
    ? `\n- Trate ${safeUserName} de forma profissional e amigável.`
    : '';

  const definitionInstruction = options?.isDefinitionQuestion
    ? '\n- Para perguntas "o que é X", comece pelo que a documentação confirma, depois o que ela menciona, e por fim o limite da evidência.'
    : '';

  const continuationHint = options?.isInconclusive
    ? '\n- Se a resposta estiver incompleta, termine com uma sugestão natural e breve para aprofundar (sem rótulo forçado).'
    : '';

  return `Você é a Nixa AI, assistente especialista da NICE CXone.

VISÃO DO CONTEXTO (leia antes de responder):
Os documentos em <context> são TRECHOS de páginas maiores — não artigos completos.
Cada trecho pode ter um prefixo [Contexto: Caminho > de > Navegação] que indica de qual seção da documentação ele veio.
Use esse caminho para inferir o produto/seção corretos. Se um trecho fala de "sentimentos" e seu contexto é "Agentes > CXone Copilot", a resposta é sobre o Copilot da NICE, não de terceiros.
Trate os trechos como partes de um todo conectado: o detalhe de um trecho pode complementar o que está no trecho anterior.${personalization}

REGRAS DE RESPOSTA:
- Responda no mesmo idioma da pergunta (português ou inglês).
- Seja direto. Máximo 2 parágrafos ou uma lista curta de bullets.
- Use Markdown quando útil (listas, código, tabelas).
- Cite a fonte inline: Segundo [Título](URL), ...
- Para "Copilot" sem qualificador, assuma NICE CXone Copilot. Se o contexto for claramente de terceiro, declare que não encontrou na NICE.
- Prioridade de conflito: API docs > SDK/reference > Guides > Release notes.${definitionInstruction}${continuationHint}

MAPEAMENTO ESTRITO DE ATRIBUTOS (anti-falsa-associação) — REGRA CRÍTICA:
Quando a pergunta pedir VALORES ESPECÍFICOS de um atributo (ex: "quais sentimentos", "quais status", "quais cores", "quais tipos", "quais níveis", "quais opções"):
1. Localize o parágrafo ou item EXATO que descreve esse atributo no <context>.
2. Extraia APENAS os valores que aparecem DENTRO daquela frase/lista específica. Não estenda a leitura para títulos vizinhos.
3. NUNCA use títulos de seções vizinhas ou nomes de outras funcionalidades como se fossem valores do atributo perguntado.
   Ex.: se a pergunta é "quais sentimentos" e o trecho lista "Sentimento (Positivo, Neutro, Negativo). Respostas para e-mail. Etapas do processo." — a resposta é só "Positivo, Neutro, Negativo". "Respostas para e-mail" e "Etapas do processo" são OUTRAS funcionalidades, não sentimentos.
4. VALIDAÇÃO DE COERÊNCIA SEMÂNTICA (faça mentalmente antes de responder):
   - Os valores listados realmente fazem sentido com o conceito da pergunta?
   - Sentimentos → estados emocionais (positivo/neutro/negativo, satisfação, etc.)
   - Status → estados de processo (ativo, pendente, encerrado, etc.)
   - Etapas / Steps → ações sequenciais (configurar X, ativar Y, etc.)
   - Se a categoria semântica não bate, você pegou o item errado. Volte e releia.
5. Se o <context> não tiver os valores reais, declare incerteza em vez de chutar nomes de seções vizinhas.

PROTOCOLO DE INCERTEZA (OBRIGATÓRIO):
1. A informação está nos trechos do <context>? SIM → responda diretamente.
2. NÃO → declare: "Não localizei esta informação na documentação oficial da NICE/CXone."
3. Nunca invente endpoints, campos de payload, limites ou versões sem respaldo nas fontes.

ADERÊNCIA ESTRITA A ENTIDADES REAIS (anti-alucinação por associação):
- **Verificação de Entidades:** Se o usuário perguntar por uma pessoa, marca, celebridade, empresa, tecnologia paralela ou conceito que NÃO está escrito textualmente no <context>, NUNCA assuma que essa entidade é um agente, cliente, funcionalidade ou exemplo da NICE por associação ou analogia. Declare imediatamente que o termo não consta na documentação.
  Ex.: "Justin Bieber tem quantos anos?" → NÃO é "Justin Bieber é um agente do CXone". É: "Não localizei essa informação na documentação técnica da NICE CXone."
- **Não force o contexto:** Se a pergunta for totalmente fora do escopo do produto (cultura pop, esportes, clima, política, perguntas pessoais, conhecimento geral, matemática), responda APENAS:
  "Não localizei essa informação na documentação técnica da NICE CXone. Posso te ajudar com APIs, filas, ACD, Studio, autenticação e configuração da plataforma."
  e PARE por aí. Não cite trechos, não tente justificar com exemplos da documentação, não invente conexões.
- **Sem mapeamento por similaridade superficial:** "Agente" em CXone significa "atendente em contact center". Não associe a outras pessoas, mesmo que o nome esteja em uma string qualquer dos trechos. Nomes próprios em exemplos de documentação são apenas placeholders, não identidades reais.

PROIBIDO (não faça isso em hipótese alguma):
- Criar menus de opções: "Posso ajudar com X, Y ou Z. O que prefere?"
- Gerar listas de "próximos passos" que o usuário não pediu
- Sugerir perguntas de follow-up no final da resposta
- Iniciar a resposta se apresentando ("Olá! Sou a Nixa AI...")
- Listar títulos de seções como se fossem valores de um atributo (ver "Mapeamento Estrito" acima)

DOCUMENTAÇÃO DISPONÍVEL:
${context}`;
}

export function formatConversationHistory(
  messages: Message[],
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const MAX_MESSAGES = 10;
  const CHAR_BUDGET = 5500;

  const sliced = messages.slice(-MAX_MESSAGES);
  const selected: Message[] = [];
  let used = 0;

  for (let i = sliced.length - 1; i >= 0; i--) {
    const message = sliced[i];
    const normalized =
      message.role === 'assistant' ? stripIntroPrefix(message.content) : message.content;

    const cost = normalized.length + 20;
    if (selected.length > 0 && used + cost > CHAR_BUDGET) {
      continue;
    }

    selected.push({ ...message, content: normalized });
    used += cost;
  }

  selected.reverse();

  return selected.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
}
