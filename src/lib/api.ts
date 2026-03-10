const BASE_URL = 'http://localhost:3000'

export interface Collection {
  id: string
  name: string
  description?: string
  documentCount: number
  chunkCount: number
  createdAt: string
}

export interface Document {
  id: string
  collectionId: string
  filename: string
  pageCount: number
  chunkCount: number
  embeddingStatus: 'pending' | 'processing' | 'done' | 'error'
  createdAt: string
}

export interface Chunk {
  id: string
  documentId: string
  documentName: string
  content: string
  pageNumber: number
  score: number
}

export interface SearchResult {
  chunks: Chunk[]
}

export interface ChatMessage {
  answer: string
  sources: Chunk[]
}

export type SSEEvent =
  | { step: 'embedding'; status: 'processing'; message: string }
  | { step: 'retrieval'; status: 'done'; chunks: Chunk[]; topSimilarity: number }
  | { step: 'claude'; status: 'done'; answer: string; sources: Chunk[] }

export async function* streamChat(
  query: string,
  collectionId: string,
  topK = 5,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, collectionId, topK }),
  })
  if (!response.ok) throw new Error('Stream request failed')
  if (!response.body) throw new Error('No response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter((line) => line.startsWith('data: '))

    for (const line of lines) {
      try {
        yield JSON.parse(line.replace('data: ', '')) as SSEEvent
      } catch {
        // skip malformed JSON
      }
    }
  }
}

interface RawCollection {
  id: string
  name: string
  description?: string
  createdAt: string
  _count: { documents: number }
  documents: { chunkCount: number }[]
}

function normalizeCollection(raw: RawCollection): Collection {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    createdAt: raw.createdAt,
    documentCount: raw._count.documents,
    chunkCount: raw.documents.reduce((sum, d) => sum + d.chunkCount, 0),
  }
}

// Collections
export async function getCollections(): Promise<Collection[]> {
  const res = await fetch(`${BASE_URL}/ingestion/collections`)
  if (!res.ok) throw new Error('Failed to fetch collections')
  const raw: RawCollection[] = await res.json()
  return raw.map(normalizeCollection)
}

export async function createCollection(name: string, description: string): Promise<Collection> {
  const res = await fetch(`${BASE_URL}/ingestion/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) throw new Error('Failed to create collection')
  return res.json()
}

export async function getCollection(id: string): Promise<Collection> {
  const res = await fetch(`${BASE_URL}/ingestion/collections/${id}`)
  if (!res.ok) throw new Error('Failed to fetch collection')
  const raw: RawCollection = await res.json()
  return normalizeCollection(raw)
}

export async function getDocuments(collectionId: string): Promise<Document[]> {
  const res = await fetch(`${BASE_URL}/ingestion/collections/${collectionId}/documents`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

// Upload PDF
export async function uploadPDF(file: File, collectionId: string): Promise<Document> {
  const form = new FormData()
  form.append('file', file)
  form.append('collectionId', collectionId)
  const res = await fetch(`${BASE_URL}/ingestion/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload PDF')
  return res.json()
}

// Re-embed
export async function reembedDocument(documentId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/ingestion/documents/${documentId}/reembed`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to re-embed document')
}

// Search
export async function searchChunks(query: string, collectionId: string, topK = 5): Promise<SearchResult> {
  const res = await fetch(`${BASE_URL}/retrieval/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, collectionId, topK }),
  })
  if (!res.ok) throw new Error('Failed to search')
  return res.json()
}

// Chat
export async function chat(query: string, collectionId: string, topK = 5): Promise<ChatMessage> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, collectionId, topK }),
  })
  if (!res.ok) throw new Error('Failed to chat')
  return res.json()
}
