export type PageType =
  | 'api'
  | 'guide'
  | 'release'
  | 'faq'
  | 'reference'
  | 'configuration'
  | 'troubleshooting'
  | 'other'

export type Product =
  | 'Copilot'
  | 'WFM'
  | 'QM'
  | 'Studio'
  | 'Recording'
  | 'Digital'
  | 'Reporting'
  | 'Developer'
  | 'ACD'
  | 'CXA'

export interface DocChunkMetadata {
  source: string
  title: string
  url: string
  pageType?: PageType
  breadcrumb?: string
  crawledAt?: string
  domain?: string
  product?: Product
  language?: string
  version?: string
  headings?: string[]
  contentHash?: string
}

export interface DocChunk {
  id: string
  content: string
  metadata: DocChunkMetadata
  embedding: number[]
}
