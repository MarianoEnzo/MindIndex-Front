
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Chunk } from '@/lib/api'

interface SourcesProps {
  sources: Chunk[]
}

/**
 * Collapsible list of source chunks referenced in an assistant message.
 * Shows document name, page number, and similarity score for each chunk when expanded.
 */
export function Sources({ sources }: SourcesProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 font-mono text-xs text-accent hover:opacity-80 transition-opacity"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Sources ({sources.length})
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5 pl-4 border-l border-accent/30">
          {sources.map((chunk, i) => (
            <div key={chunk.id ?? i} className="font-mono text-xs leading-relaxed">
              <span className="text-muted-foreground mr-2">#{i + 1}</span>
              {chunk.documentName && (
                <span className="text-foreground">{chunk.documentName}</span>
              )}
              {chunk.pageNumber != null && (
                <span className="text-muted-foreground"> · p.{chunk.pageNumber}</span>
              )}
              {(() => {
                const s = chunk.score ?? chunk.similarity
                return typeof s === 'number' && s > 0
                  ? <span className="text-accent ml-2">score: {s.toFixed(4)}</span>
                  : null
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
