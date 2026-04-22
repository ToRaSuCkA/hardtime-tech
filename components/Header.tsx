import { Clock, AlertTriangle } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-ht-border bg-ht-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ht-accent/20 border border-ht-accent/30">
            <Clock className="w-4 h-4 text-ht-accent" />
          </div>
          <span className="font-bold text-lg tracking-tight text-ht-text">
            Hard<span className="text-ht-accent">Time</span>
          </span>
          <span className="hidden sm:inline text-ht-muted text-xs border border-ht-border rounded px-2 py-0.5 ml-1">
            Lifecycle Intelligence
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-ht-muted">
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            AI estimates are indicative only
          </span>
        </div>
      </div>
    </header>
  )
}
