import { Play } from 'lucide-react'
import type { Memory } from '../types'
import { fmt } from './ui'

export function MemoryCard({ m, onOpen, actions }: { m: Memory; onOpen?: (storyId: string, t: number) => void; actions?: React.ReactNode }) {
  const e = m.evidence[0]
  return <article className="card border-l-4 border-l-marigold">
    <div className="flex items-center justify-between text-xs text-muted"><span className="uppercase tracking-wide">{m.category.replaceAll('_', ' ')}</span>
      <span>{m.status.replace('_', ' ')}{m.uncertain ? ' · uncertain' : ''}</span></div>
    <h3 className="font-serif text-xl mt-1">{m.title}</h3><p className="text-ivory/90">{m.description}</p>
    <blockquote className="mt-2 border-l-2 border-bronze pl-3 italic text-amber">“{e.exact_quote}”</blockquote>
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
      <span>{m.story_title ?? 'Source story'} · {fmt(e.start_seconds)}–{fmt(e.end_seconds)}</span>
      {onOpen && <button className="btn-ghost !py-1" onClick={() => onOpen(m.story_id, e.start_seconds)} aria-label={`Open source recording for ${m.title} at ${fmt(e.start_seconds)}`}><Play size={14} aria-hidden /> Listen to source</button>}
      {actions}</div></article>
}
