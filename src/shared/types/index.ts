export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  createdAt: Date
}

export interface Source {
  title: string
  url: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface DocChunk {
  id: string
  content: string
  metadata: {
    source: string
    title: string
    url: string
    pageType?: 'api' | 'guide' | 'release' | 'faq' | 'reference' | 'other'
    breadcrumb?: string  // ex: "Agentes > Assistentes > CXone Copilot"
    crawledAt?: string
  }
  embedding: number[]
}
