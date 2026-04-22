import type { EolStatus } from '@/lib/types'

const LABEL: Record<EolStatus, string> = {
  active:           'Active',
  eol:              'End of Life',
  'end-of-sale':    'End of Sale',
  'end-of-support': 'End of Support',
  unknown:          'Unknown',
}

const COLOR: Record<EolStatus, string> = {
  active:           'bg-green-900/50 text-green-400 border border-green-700/60',
  eol:              'bg-red-900/50 text-red-400 border border-red-700/60',
  'end-of-sale':    'bg-orange-900/50 text-orange-400 border border-orange-700/60',
  'end-of-support': 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/60',
  unknown:          'bg-gray-800/50 text-gray-400 border border-gray-600/60',
}

export function StatusBadge({ status }: { status: EolStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${COLOR[status]}`}>
      {LABEL[status]}
    </span>
  )
}
