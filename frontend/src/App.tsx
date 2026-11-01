import { useCallback, useEffect, useState } from 'react'
import { Home as HomeIcon, BookOpen, Mic, Archive as ArchiveIcon, MessageCircle, Flame, Shield, Lock } from 'lucide-react'
import { api, DEMO, setOnLocked } from './services/api'
import { Welcome } from './pages/Welcome'
import { Home, Stories, Archive } from './pages/Lists'
import { Record } from './pages/Record'
import { Studio } from './pages/Studio'
import { Ask } from './pages/Ask'
import { Collections } from './pages/Collections'
import { Settings } from './pages/Settings'
import { ToastProvider } from './hooks/useToast'
import type { VaultStatus } from './types'

const NAV = [['home', 'Home', HomeIcon], ['stories', 'Stories', BookOpen], ['record', 'Record', Mic], ['archive', 'Memory Archive', ArchiveIcon], ['ask', 'Ask Memories', MessageCircle], ['collections', 'Collections', Flame], ['settings', 'Privacy & Settings', Shield]] as const

export default function App() {
  const [status, setStatus] = useState<VaultStatus | null>(null); const [ready, setReady] = useState(false)
  const [view, setView] = useState('home'); const [story, setStory] = useState<{ id: string; t?: number } | null>(null)
  const refresh = useCallback(() => api.status().then(s => { setStatus(s); if (DEMO) setReady(true) }).catch(() => setStatus({ exists: false, unlocked: false, demo_mode: false, idle_lock_seconds: 0 })), [])
  useEffect(() => { refresh(); setOnLocked(() => { setReady(false); refresh() }) }, [refresh])
  const go = (v: string) => { setStory(null); setView(v) }
  const open = (id: string, t?: number) => { setView('stories'); setStory({ id, t }) }
  if (!ready) return <ToastProvider><Welcome status={status} onReady={() => { refresh(); setReady(true) }} /></ToastProvider>
  return <ToastProvider><div className="md:flex min-h-screen">
    <nav aria-label="Main" className="md:w-60 md:shrink-0 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-bronze/40 bg-panel/80 p-3">
      <div className="hidden md:flex items-center gap-2 font-serif text-2xl px-2 mb-4"><Flame className="text-marigold flame" aria-hidden /> Ghostlight</div>
      <ul className="flex md:flex-col gap-1 overflow-x-auto">{NAV.map(([id, label, Icon]) => <li key={id}><button onClick={() => go(id)} aria-current={view === id ? 'page' : undefined}
        className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 w-full text-left ${view === id ? 'bg-marigold text-night' : 'hover:bg-white/5'}`}><Icon size={18} aria-hidden />{label}</button></li>)}</ul>
      {!DEMO && <button className="btn-ghost mt-4 hidden md:flex" onClick={async () => { await api.lock(); setReady(false); refresh() }}><Lock size={16} aria-hidden /> Lock</button>}</nav>
    <main className="flex-1 p-4 md:p-8 max-w-4xl">
      {DEMO && <div role="note" className="mb-4 rounded-lg border border-amber/60 bg-amber/10 px-3 py-2 text-amber">DEMO DATA — Demo uses fictional sample memories. Private uploads, recording, and local AI are disabled.</div>}
      {view === 'home' && <Home go={go} open={open} />}
      {view === 'stories' && (story ? <Studio key={story.id} storyId={story.id} seekTo={story.t} onBack={() => setStory(null)} onDeleted={() => setStory(null)} /> : <Stories open={id => open(id)} go={go} />)}
      {view === 'record' && <Record onCreated={id => open(id)} />}
      {view === 'archive' && <Archive open={open} />}
      {view === 'ask' && <Ask open={open} />}
      {view === 'collections' && <Collections open={open} />}
      {view === 'settings' && <Settings onLock={() => { setReady(false); refresh() }} />}
    </main></div></ToastProvider>
}
