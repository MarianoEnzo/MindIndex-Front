
import { useState, useRef, useEffect } from 'react'
import { ArrowUp, ArrowLeft, Globe, Linkedin, Mail, Sun, Moon, CircleHelp, X } from 'lucide-react'
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

const TIPS: Record<'en' | 'es', { id: string; title: string; desc: string; bad?: string; good?: string }[]> = {
  en: [
    {
      id: 'specific',
      title: 'Be specific',
      desc: 'Longer, descriptive questions generate richer embeddings that retrieve more relevant chunks.',
      bad: 'What is photosynthesis?',
      good: 'How do plants convert sunlight and CO₂ into glucose through photosynthesis?',
    },
    {
      id: 'terms',
      title: 'Use keywords from the document',
      desc: 'If you know the document uses specific terminology (proper names, technical terms, section titles), include them in your question.',
    },
    {
      id: 'one',
      title: 'Ask one thing at a time',
      desc: 'Each query retrieves the N chunks most similar to that question. A compound question splits the focus.',
      bad: 'What causes inflation, how does it affect employment, and what are the solutions?',
      good: 'Three separate questions',
    },
    {
      id: 'lang',
      title: 'Ask in the same language as the document',
      desc: 'The system replies in your language, but if the document is in English and you ask in English, semantic similarity is higher.',
    },
    {
      id: 'reformulate',
      title: 'If the answer seems incomplete, rephrase',
      desc: 'Different phrasings retrieve different chunks. Try synonyms or add more context to your question.',
    },
  ],
  es: [
    {
      id: 'specific',
      title: 'Sé específico',
      desc: 'Preguntas más largas y descriptivas generan embeddings más ricos que encuentran mejor los chunks relevantes.',
      bad: '¿Qué es la fotosíntesis?',
      good: '¿Cómo convierten las plantas la luz solar y el CO₂ en glucosa mediante la fotosíntesis?',
    },
    {
      id: 'terms',
      title: 'Incluí términos clave del documento',
      desc: 'Si sabés que el documento usa cierta terminología (nombres propios, términos técnicos, títulos de sección), usalos en la pregunta.',
    },
    {
      id: 'one',
      title: 'Preguntá una cosa a la vez',
      desc: 'Cada query recupera los N chunks más similares a esa pregunta. Una pregunta compuesta divide la atención.',
      bad: '¿Qué causa la inflación, cómo afecta al empleo y cuáles son las soluciones?',
      good: 'Tres preguntas separadas',
    },
    {
      id: 'lang',
      title: 'Preguntá en el mismo idioma del documento',
      desc: 'El sistema responde en tu idioma, pero si el documento está en español y preguntás en español, la similitud semántica es más alta.',
    },
    {
      id: 'reformulate',
      title: 'Si la respuesta parece incompleta, reformulá',
      desc: 'Distintas formulaciones de la misma pregunta recuperan distintos chunks. Intentá con sinónimos o más contexto.',
    },
  ],
}

/**
 * Full-page chat view for querying a collection via streaming SSE.
 * Manages message history, pipeline step state, and tips visibility.
 * @param collectionId - ID of the collection to query against.
 * @param collectionName - Display name shown in the header and empty state.
 */
export function ChatView({ collectionId, collectionName }: ChatPageProps) {
  const navigate = useNavigate()
  const { theme, setTheme, lang, setLang, t } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const [showTips, setShowTips] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const tipsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showTips) return
    const handler = (e: MouseEvent) => {
      if (tipsRef.current && !tipsRef.current.contains(e.target as Node)) {
        setShowTips(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTips])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Submits the user's query, streams SSE events from the backend, and updates
   * pipeline step state in real time. Appends the final answer and sources to the message list.
   */
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
        if (event.step === 'embedding') {
          if (!embedStartTime) embedStartTime = Date.now()
          embedStep = { ...embedStep, status: event.status === 'done' ? 'done' : 'processing' }
          setSteps([embedStep, retrieveStep, llmStep, respondStep])
        } else if (event.step === 'retrieval') {
          if (event.status === 'processing') {
            if (!embedStartTime) embedStartTime = Date.now()
            embedStep = { ...embedStep, status: 'done' }
            retrieveStep = { ...retrieveStep, status: 'processing' }
            setSteps([embedStep, retrieveStep, llmStep, respondStep])
          } else if (event.status === 'done') {
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
          }
        } else if (event.step === 'claude' && event.status === 'done') {
          const llmMs = retrievalDoneTime ? Date.now() - retrievalDoneTime : undefined
          llmStep = { ...llmStep, status: 'done', durationMs: llmMs }
          respondStep = { ...respondStep, status: 'done' }
          setSteps([embedStep, retrieveStep, llmStep, respondStep])
          finalAnswer = event.answer
          finalSources = event.sources
          break
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

  /** Submits the form on Enter, allowing Shift+Enter for newlines. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex flex-col flex-1 min-w-0">
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

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center min-h-full py-8">
              <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                  <p className="font-mono text-xs text-accent/50 tracking-widest uppercase mb-2">
                    [ {collectionName} ]
                  </p>
                  <p className="text-2xl font-bold text-foreground">MindIndex</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.chatEmpty}{' '}
                    <span className="text-foreground font-medium">{collectionName}</span>.
                  </p>
                </div>

                <div className="border border-border rounded-lg bg-card/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/60 flex items-center gap-2">
                    <span className="text-accent/50 font-mono text-xs select-none">//</span>
                    <span className="font-mono text-xs text-accent/70 tracking-wide">
                      {lang === 'en' ? 'how to get better results' : 'cómo obtener mejores resultados'}
                    </span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {TIPS[lang].map((tip, i) => (
                      <div key={tip.id} className="px-4 py-3">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-mono text-[10px] text-accent/40 shrink-0 select-none">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="font-mono text-xs text-accent font-medium">{tip.title}</span>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground leading-relaxed pl-6">
                          {tip.desc}
                        </p>
                        {(tip.bad || tip.good) && (
                          <div className="mt-1.5 pl-6 flex flex-col gap-0.5">
                            {tip.bad && (
                              <p className="font-mono text-[10px] text-muted-foreground/60">
                                <span className="text-red-500/70 mr-1.5">✗</span>
                                {tip.bad}
                              </p>
                            )}
                            {tip.good && (
                              <p className="font-mono text-[10px] text-muted-foreground/60">
                                <span className="text-accent/70 mr-1.5">✓</span>
                                {tip.good}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

        <div className="px-6 pb-6 pt-3 border-t border-border shrink-0">
          <div className="mx-auto max-w-2xl relative">
            {showTips && (
              <div
                ref={tipsRef}
                className="absolute bottom-full mb-2 left-0 right-0 border border-border rounded-lg bg-card shadow-lg z-10 overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-accent/50 font-mono text-xs select-none">//</span>
                    <span className="font-mono text-xs text-accent/70 tracking-wide">
                      {lang === 'en' ? 'how to get better results' : 'cómo obtener mejores resultados'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTips(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
                  {TIPS[lang].map((tip, i) => (
                    <div key={tip.id} className="px-4 py-2.5">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-mono text-[10px] text-accent/40 shrink-0 select-none">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-xs text-accent font-medium">{tip.title}</span>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground leading-relaxed pl-6">
                        {tip.desc}
                      </p>
                      {(tip.bad || tip.good) && (
                        <div className="mt-1 pl-6 flex flex-col gap-0.5">
                          {tip.bad && (
                            <p className="font-mono text-[10px] text-muted-foreground/60">
                              <span className="text-red-500/70 mr-1.5">✗</span>
                              {tip.bad}
                            </p>
                          )}
                          {tip.good && (
                            <p className="font-mono text-[10px] text-muted-foreground/60">
                              <span className="text-accent/70 mr-1.5">✓</span>
                              {tip.good}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                  type="button"
                  onClick={() => setShowTips((v) => !v)}
                  className={`h-7 w-7 rounded-md flex items-center justify-center transition-all shrink-0 ${
                    showTips
                      ? 'text-accent bg-accent/10'
                      : 'text-muted-foreground hover:text-accent hover:bg-accent/10'
                  }`}
                  aria-label="Tips for better results"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
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
      </div>

      <aside className="hidden lg:flex w-72 border-l border-border flex-col bg-card shrink-0">
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <p className="font-mono text-xs tracking-wider">
            <span className="text-muted-foreground">{'>'}</span>{' '}
            <span className="text-accent">{t.pipeline}</span>
          </p>
        </div>

        <div className="px-5 py-3 border-b border-border shrink-0">
          <EcgLine active={loading} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PipelineLog steps={steps} waitingLabel={t.pipelineWaiting} />
        </div>

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

