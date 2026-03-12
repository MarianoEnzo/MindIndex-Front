
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Loader2, RefreshCw, FileText } from 'lucide-react'
import useSWR from 'swr'
import { getCollection, getDocuments, uploadPDF, reembedDocument } from '@/lib/api'
import type { Collection, Document } from '@/lib/api'

const statusColors: Record<Document['embeddingStatus'], string> = {
  pending: 'text-muted-foreground',
  processing: 'text-accent',
  done: 'text-accent',
  error: 'text-destructive',
}

const statusLabels: Record<Document['embeddingStatus'], string> = {
  pending: 'pending',
  processing: 'processing',
  done: 'embedded',
  error: 'error',
}

interface DocumentRowProps {
  doc: Document
  onReembed: (id: string) => Promise<void>
}

function DocumentRow({ doc, onReembed }: DocumentRowProps) {
  const [loading, setLoading] = useState(false)

  const handleReembed = async () => {
    setLoading(true)
    await onReembed(doc.id)
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">{doc.filename}</p>
          <div className="flex gap-3 mt-0.5 font-mono text-xs text-muted-foreground">
            {doc.pageCount != null && <span>{doc.pageCount} pages</span>}
            <span>{doc.chunkCount ?? 0} chunks</span>
            <span className={statusColors[doc.embeddingStatus]}>
              {statusLabels[doc.embeddingStatus]}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={handleReembed}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        title="Re-embed"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Re-embed
      </button>
    </div>
  )
}

interface UploadFormProps {
  collectionId: string
  onUploaded: () => void
}

function UploadForm({ collectionId, onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      await uploadPDF(file, collectionId)
      setFile(null)
      onUploaded()
    } catch {
      setError('Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label
        htmlFor="upload-pdf"
        className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:border-accent/60 hover:text-foreground transition-all bg-background"
      >
        <Upload className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[180px]">{file ? file.name : 'Choose PDF...'}</span>
      </label>
      <input
        id="upload-pdf"
        type="file"
        accept=".pdf"
        className="sr-only"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="submit"
        disabled={!file || loading}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Upload
      </button>
      {error && <span className="font-mono text-xs text-destructive">{error}</span>}
    </form>
  )
}

interface CollectionDetailProps {
  collectionId: string
}

export function CollectionDetail({ collectionId }: CollectionDetailProps) {
  const navigate = useNavigate()

  const {
    data: collection,
    isLoading: loadingCol,
    error: errorCol,
  } = useSWR<Collection>(`collection-${collectionId}`, () => getCollection(collectionId))

  const {
    data: documents,
    isLoading: loadingDocs,
    error: errorDocs,
    mutate: mutateDocs,
  } = useSWR<Document[]>(`documents-${collectionId}`, () => getDocuments(collectionId))

  const handleReembed = async (docId: string) => {
    try {
      await reembedDocument(docId)
      mutateDocs()
    } catch {
      // silent — could add a toast here
    }
  }

  const loading = loadingCol || loadingDocs
  const error = errorCol || errorDocs

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          All Collections
        </button>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}

        {error && (
          <p className="font-mono text-sm text-destructive">
            Failed to load collection data.
          </p>
        )}

        {collection && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">{collection.name}</h1>
              {collection.description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {collection.description}
                </p>
              )}
              <div className="flex gap-4 mt-3 font-mono text-xs text-muted-foreground">
                <span>
                  <span className="text-foreground">{collection.documentCount ?? 0}</span> documents
                </span>
                <span>
                  <span className="text-foreground">{collection.chunkCount ?? 0}</span> chunks
                </span>
              </div>
            </div>

            {/* Documents */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Documents
                </h2>
              </div>

              {documents && documents.length > 0 ? (
                <div className="border border-border rounded-lg bg-card px-4 mb-6">
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} onReembed={handleReembed} />
                  ))}
                </div>
              ) : (
                !loadingDocs && (
                  <p className="text-sm text-muted-foreground mb-6">
                    No documents yet. Upload one below.
                  </p>
                )
              )}

              <UploadForm
                collectionId={collectionId}
                onUploaded={() => mutateDocs()}
              />
            </section>
          </>
        )}
      </div>
    </main>
  )
}
