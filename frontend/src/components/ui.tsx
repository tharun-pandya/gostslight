import { ReactNode, useEffect, useRef } from 'react'
import { Flame } from 'lucide-react'

export const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
export const Empty = ({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) =>
  <div className="card text-center py-10"><Flame className="mx-auto text-marigold flame" aria-hidden /><h3 className="font-serif text-xl mt-2">{title}</h3>
    {hint && <p className="text-muted mt-1 max-w-md mx-auto">{hint}</p>}<div className="mt-4">{children}</div></div>
export const Skeleton = ({ rows = 3 }: { rows?: number }) => <div className="space-y-3" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton" />)}</div>
export const ErrorBox = ({ msg }: { msg: string }) => <div role="alert" className="rounded-lg border border-red-400/60 bg-red-950/50 text-red-100 px-3 py-2">{msg}</div>
export const Progress = ({ value, label }: { value: number; label: string }) =>
  <div><div className="text-sm text-muted">{label} — {Math.round(value * 100)}%</div>
    <div className="h-2 rounded bg-white/10" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-2 rounded bg-marigold" style={{ width: `${value * 100}%` }} /></div></div>

export function Confirm({ open, title, body, confirmLabel, onYes, onNo }: { open: boolean; title: string; body: string; confirmLabel: string; onYes: () => void; onNo: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (open) ref.current?.focus() }, [open])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onNo(); if (open) window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [open, onNo])
  if (!open) return null
  return <div className="fixed inset-0 z-40 bg-black/70 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
    <div className="card max-w-md w-full"><h3 className="font-serif text-xl">{title}</h3><p className="text-muted my-3">{body}</p>
      <div className="flex gap-2 justify-end"><button ref={ref} className="btn-ghost" onClick={onNo}>Cancel</button><button className="btn-danger" onClick={onYes}>{confirmLabel}</button></div></div></div>
}
