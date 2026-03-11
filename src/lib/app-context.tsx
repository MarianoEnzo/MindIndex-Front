import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'dark' | 'light'
export type Lang = 'en' | 'es'

export interface Translations {
  tagline: string
  badge: string
  collections: string
  newCollection: string
  docs: string
  chunks: string
  chat: string
  viewDetails: string
  noCollections: string
  noCollectionsHint: string
  loading: string
  apiError: string
  formTitle: string
  formName: string
  formNamePlaceholder: string
  formNameRequired: string
  formDescription: string
  formDescriptionPlaceholder: string
  formUpload: string
  formUploadPlaceholder: string
  create: string
  creating: string
  cancel: string
  formError: string
  chatPlaceholder: string
  chatEmpty: string
  pipeline: string
  pipelineWaiting: string
  home: string
  builtBy: string
  stepEmbed: string
  stepRetrieve: string
  stepRetrieveDone: (n: number, score: string) => string
  stepLlm: string
  stepRespond: string
}

const en: Translations = {
  tagline: 'Upload documents. Ask questions. Get answers backed by your data.',
  badge: 'RAG · Vector Search · LLM',
  collections: 'Collections',
  newCollection: 'New Collection',
  docs: 'docs',
  chunks: 'chunks',
  chat: 'Chat',
  viewDetails: 'View details',
  noCollections: 'No collections yet.',
  noCollectionsHint: 'Create one above to get started.',
  loading: 'Loading collections...',
  apiError: 'Failed to connect to API.',
  formTitle: 'New Collection',
  formName: 'Name',
  formNamePlaceholder: 'e.g. Research Papers Q1',
  formNameRequired: 'Collection name is required.',
  formDescription: 'Description',
  formDescriptionPlaceholder: 'Optional',
  formUpload: 'Upload PDF (optional)',
  formUploadPlaceholder: 'Choose a PDF file...',
  create: 'Create',
  creating: 'Creating...',
  cancel: 'Cancel',
  formError: 'Failed to create collection. Is the API server running?',
  chatPlaceholder: 'Ask a question...',
  chatEmpty: 'Ask anything about the documents in',
  pipeline: 'pipeline',
  pipelineWaiting: 'waiting for query',
  home: 'Home',
  builtBy: 'Built by',
  stepEmbed: 'Generating query embedding',
  stepRetrieve: 'Retrieving relevant chunks',
  stepRetrieveDone: (n, score) => `Retrieved ${n} chunks · top score: ${score}`,
  stepLlm: 'Sending context to LLM',
  stepRespond: 'Generating response',
}

const es: Translations = {
  tagline: 'Subí documentos. Hacé preguntas. Obtené respuestas basadas en tus datos.',
  badge: 'RAG · Búsqueda Vectorial · LLM',
  collections: 'Colecciones',
  newCollection: 'Nueva Colección',
  docs: 'docs',
  chunks: 'chunks',
  chat: 'Chat',
  viewDetails: 'Ver detalles',
  noCollections: 'Sin colecciones aún.',
  noCollectionsHint: 'Creá una arriba para empezar.',
  loading: 'Cargando colecciones...',
  apiError: 'No se pudo conectar a la API.',
  formTitle: 'Nueva Colección',
  formName: 'Nombre',
  formNamePlaceholder: 'ej. Papers de Investigación Q1',
  formNameRequired: 'El nombre es obligatorio.',
  formDescription: 'Descripción',
  formDescriptionPlaceholder: 'Opcional',
  formUpload: 'Subir PDF (opcional)',
  formUploadPlaceholder: 'Elegí un archivo PDF...',
  create: 'Crear',
  creating: 'Creando...',
  cancel: 'Cancelar',
  formError: 'Error al crear la colección. ¿Está corriendo el servidor?',
  chatPlaceholder: 'Hacé una pregunta...',
  chatEmpty: 'Preguntá sobre los documentos de',
  pipeline: 'pipeline',
  pipelineWaiting: 'esperando consulta',
  home: 'Inicio',
  builtBy: 'Creado por',
  stepEmbed: 'Generando embedding de la consulta',
  stepRetrieve: 'Recuperando chunks relevantes',
  stepRetrieveDone: (n, score) => `${n} chunks recuperados · score máx: ${score}`,
  stepLlm: 'Enviando contexto al LLM',
  stepRespond: 'Generando respuesta',
}

interface AppContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const AppContext = createContext<AppContextValue | null>(null)

/**
 * Provides theme, language, and translation state to the entire application.
 * Persists theme and language preferences to localStorage.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('mi-theme') as Theme) ?? 'dark'
  })
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('mi-lang') as Lang) ?? 'en'
  })

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('mi-theme', t)
  }

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('mi-lang', l)
  }

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const t = lang === 'en' ? en : es

  return (
    <AppContext.Provider value={{ theme, setTheme, lang, setLang, t }}>
      {children}
    </AppContext.Provider>
  )
}

/**
 * Returns the current app context (theme, language, translations, and their setters).
 * Must be called inside an {@link AppProvider}.
 * @throws If used outside of an AppProvider.
 */
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
