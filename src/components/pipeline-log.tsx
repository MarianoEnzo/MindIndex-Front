'use client'

import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'pending' | 'processing' | 'done'

export interface PipelineStep {
  id: string
  label: string
  status: StepStatus
  durationMs?: number
}

function PipelineStepRow({ step }: { step: PipelineStep }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="mt-0.5 shrink-0">
        {step.status === 'done' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
        ) : step.status === 'processing' ? (
          <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
        )}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={cn(
            'font-mono text-xs leading-relaxed',
            step.status === 'done' && 'text-accent',
            step.status === 'processing' && 'text-foreground',
            step.status === 'pending' && 'text-muted-foreground/40',
          )}
        >
          {step.label}
        </span>
        {step.status === 'done' && step.durationMs !== undefined && step.durationMs > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground/50">
            {step.durationMs}ms
          </span>
        )}
      </div>
    </div>
  )
}

interface PipelineLogProps {
  steps: PipelineStep[]
  waitingLabel: string
}

export function PipelineLog({ steps, waitingLabel }: PipelineLogProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/50">
        <span>$ {waitingLabel}</span>
        <span className="animate-pulse text-accent">_</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col divide-y divide-border/30">
      {steps.map((step) => (
        <PipelineStepRow key={step.id} step={step} />
      ))}
    </div>
  )
}
