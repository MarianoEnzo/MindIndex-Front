'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Chunk } from '@/lib/api'

interface SourcesProps {
  sources: Chunk[]
}

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
            <div key={chunk.id ?? i} className="font-mono text-xs leading-relaxed text-accent/90">
              <span className="text-muted-foreground mr-2">#{i + 1}</span>
              <span className="text-foreground">{chunk.documentName}</span>
              {chunk.pageNumber != null && (
                <span className="text-muted-foreground"> · p.{chunk.pageNumber}</span>
              )}
              <span className="text-accent ml-2">
                score: {typeof chunk.score === 'number' ? chunk.score.toFixed(4) : chunk.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
