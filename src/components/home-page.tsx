'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, X, Loader2, Upload, MessageSquare } from 'lucide-react'
import { getCollections, createCollection, uploadPDF } from '@/lib/api'
import type { Collection } from '@/lib/api'
import useSWR from 'swr'

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <div className="group border border-border rounded-lg p-4 bg-card hover:border-accent/60 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug text-balance">
          {collection.name}
        </p>
        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
      </div>
      {collection.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {collection.description}
        </p>
      )}
      <div className="flex gap-3 font-mono text-xs text-muted-foreground">
        <span>
          <span className="text-foreground">{collection.documentCount ?? 0}</span> docs
        </span>
        <span>
          <span className="text-foreground">{collection.chunkCount ?? 0}</span> chunks
        </span>
      </div>
      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <Link
          to={`/chat/${collection.id}`}
          className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Chat
        </Link>
        <Link
          to={`/collections/${collection.id}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View details
        </Link>
      </div>
    </div>
  )
}

interface NewCollectionFormProps {
  onCreated: () => void
  onCancel: () => void
}

function NewCollectionForm({ onCreated, onCancel }: NewCollectionFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Collection name is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const col = await createCollection(name.trim(), description.trim())
      if (file) {
        await uploadPDF(file, col.id)
      }
      onCreated()
    } catch {
      setError('Failed to create collection. Is the API server running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">New Collection</p>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="col-name">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="col-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Research Papers Q1"
            className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="col-desc">
            Description
          </label>
          <input
            id="col-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="col-file">
            Upload PDF (optional)
          </label>
          <label
            htmlFor="col-file"
            className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-2.5 text-sm text-muted-foreground cursor-pointer hover:border-accent/60 hover:text-foreground transition-all bg-background"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate">{file ? file.name : 'Choose a PDF file...'}</span>
          </label>
          <input
            id="col-file"
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error && (
          <p className="text-xs text-destructive font-mono">{error}</p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export function HomePage() {
  const [showForm, setShowForm] = useState(false)
  const { data: collections, isLoading, error, mutate } = useSWR<Collection[]>(
    'collections',
    getCollections,
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            MindIndex
          </h1>
          <p className="text-sm text-muted-foreground">
            Semantic search and chat over your document collections.
          </p>
        </div>

        {/* Collections grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Collections
            </h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Collection
              </button>
            )}
          </div>

          {showForm && (
            <div className="mb-6">
              <NewCollectionForm
                onCreated={() => {
                  setShowForm(false)
                  mutate()
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading collections...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-sm font-mono text-destructive">
                Failed to connect to API. Is <span className="text-foreground">localhost:3000</span> running?
              </p>
            </div>
          )}

          {!isLoading && !error && collections && collections.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">No collections yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create one above to get started.
              </p>
            </div>
          )}

          {collections && collections.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collections.map((col) => (
                <CollectionCard key={col.id} collection={col} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
