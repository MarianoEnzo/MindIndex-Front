'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, FileText, X, Loader2, Upload, MessageSquare,
  Globe, Linkedin, Mail, Sun, Moon,
} from 'lucide-react'
import { getCollections, createCollection, uploadPDF } from '@/lib/api'
import type { Collection } from '@/lib/api'
import useSWR from 'swr'
import { useApp } from '@/lib/app-context'

// ─── Toggles ──────────────────────────────────────────────────────────────────

function Toggles() {
  const { theme, setTheme, lang, setLang } = useApp()
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        className="font-mono text-xs px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-all"
      >
        {lang === 'en' ? 'ES' : 'EN'}
      </button>
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-all"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ─── Collection Card ───────────────────────────────────────────────────────────

function CollectionCard({ collection }: { collection: Collection }) {
  const { t } = useApp()
  return (
    <div className="group relative flex flex-col gap-3 rounded-lg border border-border border-l-2 border-l-accent bg-card p-4 transition-all hover:border-accent/50 hover:bg-card/80">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug">
          {collection.name}
        </p>
        <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
      </div>

      {collection.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {collection.description}
        </p>
      )}

      <div className="flex gap-4 font-mono text-xs">
        <span>
          <span className="text-accent font-medium">{collection.documentCount ?? 0}</span>{' '}
          <span className="text-muted-foreground">{t.docs}</span>
        </span>
        <span>
          <span className="text-accent font-medium">{collection.chunkCount ?? 0}</span>{' '}
          <span className="text-muted-foreground">{t.chunks}</span>
        </span>
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-border/60">
        <Link
          to={`/chat/${collection.id}`}
          className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {t.chat}
        </Link>
        <Link
          to={`/collections/${collection.id}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.viewDetails}
        </Link>
      </div>
    </div>
  )
}

// ─── New Collection Form ───────────────────────────────────────────────────────

interface NewCollectionFormProps {
  onCreated: () => void
  onCancel: () => void
}

function NewCollectionForm({ onCreated, onCancel }: NewCollectionFormProps) {
  const { t } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t.formNameRequired)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const col = await createCollection(name.trim(), description.trim())
      if (file) await uploadPDF(file, col.id)
      onCreated()
    } catch {
      setError(t.formError)
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all font-mono'

  return (
    <div className="border border-border border-l-2 border-l-accent rounded-lg p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">{t.formTitle}</p>
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
          <label className="font-mono text-xs text-muted-foreground" htmlFor="col-name">
            {t.formName} <span className="text-accent">*</span>
          </label>
          <input
            id="col-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.formNamePlaceholder}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs text-muted-foreground" htmlFor="col-desc">
            {t.formDescription}
          </label>
          <input
            id="col-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.formDescriptionPlaceholder}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs text-muted-foreground" htmlFor="col-file">
            {t.formUpload}
          </label>
          <label
            htmlFor="col-file"
            className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-2.5 text-sm text-muted-foreground cursor-pointer hover:border-accent/50 hover:text-foreground transition-all bg-background"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate font-mono text-xs">
              {file ? file.name : t.formUploadPlaceholder}
            </span>
          </label>
          <input
            id="col-file"
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error && <p className="font-mono text-xs text-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-black text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? t.creating : t.create}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            {t.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const { t } = useApp()
  return (
    <footer className="border-t border-border py-8 px-6 mt-16">
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-mono text-xs text-muted-foreground">
          {t.builtBy}{' '}
          <a
            href="https://www.mequiroga.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-medium hover:text-accent transition-colors"
          >
            Mariano Quiroga
          </a>
        </span>
        <div className="flex items-center gap-5">
          <a
            href="https://www.mequiroga.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            mequiroga.com
          </a>
          <a
            href="https://www.linkedin.com/in/mariano-quirogait/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
          </a>
          <a
            href="mailto:marianoenzo00@gmail.com"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            marianoenzo00@gmail.com
          </a>
        </div>
      </div>
    </footer>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export function HomePage() {
  const [showForm, setShowForm] = useState(false)
  const { t } = useApp()
  const { data: collections, isLoading, error, mutate } = useSWR<Collection[]>(
    'collections',
    getCollections,
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-foreground tracking-tight">
            Mind<span className="text-accent">Index</span>
          </span>
          <Toggles />
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <p className="font-mono text-xs text-accent/70 tracking-widest uppercase mb-6">
            [ document intelligence ]
          </p>
          <h1 className="text-7xl sm:text-8xl font-bold tracking-tight text-foreground mb-4 leading-none">
            MindIndex
          </h1>
          <div className="mx-auto w-20 h-0.5 bg-accent mb-6" />
          <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            {t.tagline}
          </p>
          <div className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground border border-border rounded px-4 py-2">
            {t.badge}
          </div>
        </section>

        {/* Collections */}
        <section className="mx-auto max-w-4xl px-6 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.collections}
            </h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t.newCollection}
              </button>
            )}
          </div>

          {showForm && (
            <div className="mb-6">
              <NewCollectionForm
                onCreated={() => { setShowForm(false); mutate() }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-mono text-sm">{t.loading}</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-border border-l-2 border-l-destructive p-4 text-center">
              <p className="font-mono text-sm text-destructive">
                {t.apiError}{' '}
                <span className="text-foreground">localhost:3000</span>
              </p>
            </div>
          )}

          {!isLoading && !error && collections && collections.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="font-mono text-sm text-muted-foreground">{t.noCollections}</p>
              <p className="font-mono text-xs text-muted-foreground/60 mt-1">
                {t.noCollectionsHint}
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
      </main>

      <Footer />
    </div>
  )
}
