'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, ArrowLeft, Globe, Linkedin, Mail, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { streamChat } from '@/lib/api'
import type { Chunk } from '@/lib/api'
import { Sources } from '@/components/sources'
import { EcgLine } from '@/components/ecg-line'
import { PipelineLog } from '@/components/pipeline-log'
import type { PipelineStep } from '@/components/pipeline-log'
import { useApp } from '@/lib/app-context'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Chunk[]
}

interface ChatPageProps {
  collectionId: string
  collectionName: string
}

export function ChatView({ collectionId, collectionName }: ChatPageProps) {
  const navigate = useNavigate()
  const { theme, setTheme, lang, setLang, t } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = input.trim()
    if (!query || loading) return

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: query }])
    setInput('')
    setLoading(true)

    let embedStep: PipelineStep = { id: 'embed', label: t.stepEmbed, status: 'pending' }
    let retrieveStep: PipelineStep = { id: 'retrieve', label: t.stepRetrieve, status: 'pending' }
    let llmStep: PipelineStep = { id: 'llm', label: t.stepLlm, status: 'pending' }
    let respondStep: PipelineStep = { id: 'respond', label: t.stepRespond, status: 'pending' }
    setSteps([embedStep, retrieveStep, llmStep, respondStep])

    let embedStartTime = 0
    let retrievalDoneTime = 0
    let finalAnswer = ''
    let finalSources: Chunk[] = []

    try {
      for await (const event of streamChat(query, collectionId)) {
        if (event.step === 'embedding' && event.status === 'processing') {
          embedStartTime = Date.now()
          embedStep = { ...embedStep, status: 'processing' }
          setSteps([embedStep, retrieveStep, llmStep, respondStep])
        } else if (event.step === 'retrieval' && event.status === 'done') {
          const elapsedMs = embedStartTime ? Date.now() - embedStartTime : undefined
          retrievalDoneTime = Date.now()
          embedStep = { ...embedStep, status: 'done', durationMs: elapsedMs }
          retrieveStep = {
            id: 'retrieve',
            label: t.stepRetrieveDone(event.chunks.length, event.topSimilarity.toFixed(3)),
            status: 'done',
            durationMs: elapsedMs,
          }
          llmStep = { ...llmStep, status: 'processing' }
          setSteps([embedStep, retrieveStep, llmStep, respondStep])
        } else if (event.step === 'claude' && event.status === 'done') {
          const llmMs = retrievalDoneTime ? Date.now() - retrievalDoneTime : undefined
          llmStep = { ...llmStep, status: 'done', durationMs: llmMs }
          respondStep = { ...respondStep, status: 'done' }
          setSteps([embedStep, retrieveStep, llmStep, respondStep])
          finalAnswer = event.answer
          finalSources = event.sources
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: finalAnswer || 'No response received.',
          sources: finalSources,
        },
      ])
    } catch {
      setSteps(
        [embedStep, retrieveStep, llmStep, respondStep].map((s) =>
          s.status !== 'done' ? { ...s, label: s.label + ' [error]', status: 'done' as const } : s,
        ),
      )
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'An error occurred. Please check the API server and try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left: Conversation */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.home}
            </button>
            <span className="text-border text-xs">·</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
              {collectionName}
            </span>
          </div>
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
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="font-mono text-xs text-accent/60 tracking-widest uppercase">
                [ {collectionName} ]
              </p>
              <p className="text-3xl font-bold text-foreground">MindIndex</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t.chatEmpty}{' '}
                <span className="text-foreground font-medium">{collectionName}</span>.
              </p>
            </div>
          )}

          <div className="mx-auto max-w-2xl flex flex-col gap-6">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                {msg.role === 'user' ? (
                  <div className="max-w-lg bg-accent/10 border border-accent/20 rounded-lg px-4 py-2.5 text-sm text-foreground leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <Sources sources={msg.sources} />
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1 text-muted-foreground font-mono text-sm">
                <span className="text-accent animate-pulse">▋</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 pb-6 pt-3 border-t border-border shrink-0">
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
            <div className="flex items-end gap-2 border border-border rounded-lg bg-card px-3 py-2 focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition-all">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.chatPlaceholder}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed max-h-32 font-mono"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-7 w-7 rounded-md bg-accent flex items-center justify-center text-black hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right: Pipeline panel */}
      <aside className="hidden lg:flex w-72 border-l border-border flex-col bg-card shrink-0">
        {/* Pipeline header */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <p className="font-mono text-xs tracking-wider">
            <span className="text-muted-foreground">{'>'}</span>{' '}
            <span className="text-accent">{t.pipeline}</span>
          </p>
        </div>

        {/* ECG */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <EcgLine active={loading} />
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PipelineLog steps={steps} waitingLabel={t.pipelineWaiting} />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <div className="flex flex-col gap-2.5">
            <p className="font-mono text-[10px] text-muted-foreground/50 mb-1">
              Mariano Quiroga
            </p>
            <a
              href="https://www.mequiroga.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <Globe className="h-3 w-3 shrink-0" />
              mequiroga.com
            </a>
            <a
              href="https://www.linkedin.com/in/mariano-quirogait/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <Linkedin className="h-3 w-3 shrink-0" />
              LinkedIn
            </a>
            <a
              href="mailto:marianoenzo00@gmail.com"
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <Mail className="h-3 w-3 shrink-0" />
              marianoenzo00@gmail.com
            </a>
          </div>
        </div>
      </aside>
    </div>
  )
}

