'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { chat } from '@/lib/api'
import type { Chunk } from '@/lib/api'
import { Sources } from '@/components/sources'
import { EcgLine } from '@/components/ecg-line'
import { PipelineLog } from '@/components/pipeline-log'
import type { PipelineStep } from '@/components/pipeline-log'

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

function buildPipelineSteps(query: string, chunks?: Chunk[], done = false): PipelineStep[] {
  const topScore = chunks && chunks.length > 0
    ? Math.max(...chunks.map((c) => c.score ?? 0))
    : null

  return [
    {
      id: 'embed',
      label: 'Generating query embedding...',
      status: done ? 'done' : 'processing',
    },
    {
      id: 'retrieve',
      label:
        done && chunks
          ? `Retrieved ${chunks.length} chunks (top similarity: ${topScore?.toFixed(2) ?? '—'})`
          : 'Retrieving relevant chunks...',
      status: done ? 'done' : 'pending',
    },
    {
      id: 'llm',
      label: 'Sending context to Claude...',
      status: done ? 'done' : 'pending',
    },
    {
      id: 'respond',
      label: 'Streaming response...',
      status: done ? 'done' : 'pending',
    },
  ]
}

export function ChatView({ collectionId, collectionName }: ChatPageProps) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = input.trim()
    if (!query || loading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // animate pipeline steps progressively
    setSteps(buildPipelineSteps(query))

    // step 1 done after a tick
    await delay(600)
    setSteps([
      { id: 'embed', label: 'Generating query embedding...', status: 'done' },
      { id: 'retrieve', label: 'Retrieving relevant chunks...', status: 'processing' },
      { id: 'llm', label: 'Sending context to Claude...', status: 'pending' },
      { id: 'respond', label: 'Streaming response...', status: 'pending' },
    ])

    try {
      const result = await chat(query, collectionId)

      const topScore =
        result.sources && result.sources.length > 0
          ? Math.max(...result.sources.map((c) => c.score ?? 0))
          : null

      setSteps([
        { id: 'embed', label: 'Generating query embedding...', status: 'done' },
        {
          id: 'retrieve',
          label: `Retrieved ${result.sources?.length ?? 0} chunks (top similarity: ${topScore?.toFixed(2) ?? '—'})`,
          status: 'done',
        },
        { id: 'llm', label: 'Sending context to Claude...', status: 'done' },
        { id: 'respond', label: 'Streaming response...', status: 'done' },
      ])

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setSteps((prev) =>
        prev.map((s) => (s.status !== 'done' ? { ...s, status: 'done', label: s.label + ' [error]' } : s)),
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
        <header className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>
          <span className="text-border">·</span>
          <span className="text-sm font-medium text-foreground">{collectionName}</span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-2xl font-bold text-foreground">MindIndex</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Ask anything about the documents in{' '}
                <span className="text-foreground font-medium">{collectionName}</span>.
              </p>
            </div>
          )}

          <div className="mx-auto max-w-2xl flex flex-col gap-6">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                {msg.role === 'user' ? (
                  <div className="max-w-lg bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground leading-relaxed">
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
              <div className="flex gap-1.5 items-center text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
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
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed max-h-32"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-7 w-7 rounded-md bg-accent flex items-center justify-center text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
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
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pipeline
          </p>
        </div>
        <div className="px-5 pt-4 border-b border-border">
          <EcgLine active={loading} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PipelineLog steps={steps} />
        </div>
      </aside>
    </div>
  )
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
