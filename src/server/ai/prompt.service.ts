import { DocChunk } from '@/shared/types'
import { buildSystemPrompt } from '@/core/rag'
import { isDefinitionQuestion, isInconclusiveContext } from './retrieval.service'

export function buildPrompt(params: {
  question: string
  documents: DocChunk[]
  userName?: string
}): string {
  return buildSystemPrompt(params.documents, params.userName, {
    isDefinitionQuestion: isDefinitionQuestion(params.question),
    isInconclusive: isInconclusiveContext({
      query: params.question,
      relevantDocs: params.documents,
    }),
  })
}
