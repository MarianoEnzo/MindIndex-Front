const BASE_URL = import.meta.env.VITE_API_URL;

export interface Collection {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface Document {
  id: string;
  collectionId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
  embeddingStatus: "pending" | "processing" | "done" | "error";
  createdAt: string;
}

export interface Chunk {
  id: string;
  documentId?: string;
  documentName?: string;
  content: string;
  pageNumber: number;
  score?: number;
  similarity?: number;
}

export interface SearchResult {
  chunks: Chunk[];
}

export interface ChatMessage {
  answer: string;
  sources: Chunk[];
}

export type SSEEvent =
  | { step: "embedding"; status: "processing" | "done"; message: string }
  | { step: "retrieval"; status: "processing"; message: string }
  | { step: "retrieval"; status: "done"; chunks: Chunk[]; topSimilarity: number; message: string }
  | { step: "claude"; status: "processing"; message: string }
  | { step: "claude"; status: "done"; answer: string; sources: Chunk[]; message: string };

/**
 * Streams a chat query to the backend and yields SSE events as they arrive.
 * Reads the response body line-by-line and parses `data: ...` lines as {@link SSEEvent} objects.
 * @param query - The user's natural language question.
 * @param collectionId - ID of the collection to query against.
 * @param topK - Number of top chunks to retrieve. Defaults to 5.
 */
export async function* streamChat(
  query: string,
  collectionId: string,
  topK = 5,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, collectionId, topK }),
  });
  if (!response.ok) throw new Error("Stream request failed");
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        yield JSON.parse(line.slice(6)) as SSEEvent;
      } catch {
        // ignore
      }
    }
  }
}

interface RawCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count: { documents: number };
  documents: { chunkCount: number }[];
}

/**
 * Normalizes a raw API collection response into the {@link Collection} shape.
 */
function normalizeCollection(raw: RawCollection): Collection {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    createdAt: raw.createdAt,
    documentCount: raw._count?.documents ?? 0,
    chunkCount: raw.documents?.reduce((sum, d) => sum + (d.chunkCount ?? 0), 0) ?? 0,
  };
}

/**
 * Fetches all collections from the API.
 */
export async function getCollections(): Promise<Collection[]> {
  const res = await fetch(`${BASE_URL}/ingestion/collections`);
  if (!res.ok) throw new Error("Failed to fetch collections");
  const raw: RawCollection[] = await res.json();
  return raw.map(normalizeCollection);
}

/**
 * Creates a new collection.
 * @param name - Display name for the collection.
 * @param description - Optional description.
 */
export async function createCollection(
  name: string,
  description: string,
): Promise<Collection> {
  const res = await fetch(`${BASE_URL}/ingestion/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("Failed to create collection");
  return res.json();
}

/**
 * Fetches a single collection by ID.
 */
export async function getCollection(id: string): Promise<Collection> {
  const res = await fetch(`${BASE_URL}/ingestion/collections/${id}`);
  if (!res.ok) throw new Error("Failed to fetch collection");
  const raw: RawCollection = await res.json();
  return normalizeCollection(raw);
}

/**
 * Fetches all documents belonging to a collection.
 */
export async function getDocuments(collectionId: string): Promise<Document[]> {
  const res = await fetch(
    `${BASE_URL}/ingestion/collections/${collectionId}/documents`,
  );
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

/**
 * Uploads a PDF and associates it with the given collection.
 * @param file - The PDF file to upload.
 * @param collectionId - ID of the target collection.
 */
export async function uploadPDF(
  file: File,
  collectionId: string,
): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  form.append("collectionId", collectionId);
  const res = await fetch(`${BASE_URL}/ingestion/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload PDF");
  return res.json();
}

/**
 * Triggers re-embedding for a document that previously failed or needs updating.
 * @param documentId - ID of the document to re-embed.
 */
export async function reembedDocument(documentId: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/ingestion/documents/${documentId}/reembed`,
    {
      method: "POST",
    },
  );
  if (!res.ok) throw new Error("Failed to re-embed document");
}

/**
 * Performs a semantic search over chunks in a collection.
 * @param query - Natural language search query.
 * @param collectionId - Collection to search within.
 * @param topK - Maximum number of results to return. Defaults to 5.
 */
export async function searchChunks(
  query: string,
  collectionId: string,
  topK = 5,
): Promise<SearchResult> {
  const res = await fetch(`${BASE_URL}/retrieval/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, collectionId, topK }),
  });
  if (!res.ok) throw new Error("Failed to search");
  return res.json();
}

/**
 * Sends a chat query and returns the LLM answer with source chunks (non-streaming).
 * @param query - The user's question.
 * @param collectionId - Collection to query against.
 * @param topK - Number of chunks to retrieve as context. Defaults to 5.
 */
export async function chat(
  query: string,
  collectionId: string,
  topK = 5,
): Promise<ChatMessage> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, collectionId, topK }),
  });
  if (!res.ok) throw new Error("Failed to chat");
  return res.json();
}
