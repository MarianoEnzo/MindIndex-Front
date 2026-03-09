'use client'

import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'pending' | 'processing' | 'done'

export interface PipelineStep {
  id: string
  label: string
  status: StepStatus
}

interface PipelineStepRowProps {
  step: PipelineStep
}

function PipelineStepRow({ step }: PipelineStepRowProps) {
  return (
    <div className="flex items-start gap-2 py-1">
      {step.status === 'done' ? (
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
      ) : step.status === 'processing' ? (
        <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent animate-spin" />
      ) : (
        <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      )}
      <span
        className={cn(
          'font-mono text-xs leading-relaxed',
          step.status === 'done' && 'text-accent',
          step.status === 'processing' && 'text-foreground',
          step.status === 'pending' && 'text-muted-foreground',
        )}
      >
        {step.label}
      </span>
    </div>
  )
}

interface PipelineLogProps {
  steps: PipelineStep[]
}

export function PipelineLog({ steps }: PipelineLogProps) {
  if (steps.length === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        Waiting for query...
      </p>
    )
  }
  return (
    <div className="flex flex-col">
      {steps.map((step) => (
        <PipelineStepRow key={step.id} step={step} />
      ))}
    </div>
  )
}
