import demo from './demo.json'
import type { Story, Transcript, Memory, AskResult, Job, Collection, VaultStatus, Citation } from '../types'

export let DEMO: boolean = import.meta.env.VITE_DEMO_MODE === 'true'
export const enableSample = () => { DEMO = true }
let session: string | null = null
let onLocked: () => void = () => {}
export const setOnLocked = (f: () => void) => { onLocked = f }
const off = () => { throw new Error('Disabled in demo mode: the public demo only shows fictional sample memories.') }

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as any) }
  if (session) headers['X-Session'] = session
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const r = await fetch('/api/v1' + path, { ...init, headers })
  if (r.status === 401 && session) { session = null; onLocked() }
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).detail ?? m } catch {} ; throw new Error(typeof m === 'string' ? m : 'Request failed') }
  const ct = r.headers.get('content-type') || ''
  return (ct.includes('json') ? r.json() : r.blob()) as any
}
const json = (b: unknown) => JSON.stringify(b)
const D: any = demo
const demoMemories = (): Memory[] => D.memories
const dl = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) }

export const api = {
  status: (): Promise<VaultStatus> => DEMO ? Promise.resolve({ exists: true, unlocked: true, demo_mode: true, idle_lock_seconds: 0 }) : req('/vault/status'),
  create: async (name: string, passphrase: string) => { if (DEMO) off(); const r: any = await req('/vault/create', { method: 'POST', body: json({ name, passphrase }) }); session = r.session; return r },
  unlock: async (passphrase: string) => { if (DEMO) off(); const r: any = await req('/vault/unlock', { method: 'POST', body: json({ passphrase }) }); session = r.session; return r },
  lock: async () => { if (!DEMO) await req('/vault/lock', { method: 'POST' }); session = null },
  deleteVault: async () => { if (DEMO) off(); await req('/vault?confirm=true', { method: 'DELETE' }); session = null },
  models: (): Promise<any> => DEMO ? Promise.resolve(null) : req('/models/status'),
  stories: async (): Promise<Story[]> => DEMO ? D.stories : (await req<any>('/stories')).items,
  createStory: (fd: FormData): Promise<Story> => DEMO ? off() : req('/stories', { method: 'POST', body: fd }),
  deleteStory: (id: string) => DEMO ? off() : req('/stories/' + id, { method: 'DELETE' }),
  setConsent: (id: string, consent: boolean) => DEMO ? off() : req('/stories/' + id + '/consent', { method: 'PATCH', body: json({ consent }) }),
  audio: async (id: string): Promise<string | null> => DEMO ? null : URL.createObjectURL(await req<Blob>('/stories/' + id + '/audio')),
  transcribe: (id: string): Promise<Job> => DEMO ? off() : req('/stories/' + id + '/transcribe', { method: 'POST' }),
  extract: (id: string): Promise<Job> => DEMO ? off() : req('/stories/' + id + '/extract', { method: 'POST' }),
  job: (id: string): Promise<Job> => req('/jobs/' + id),
  transcript: async (id: string): Promise<Transcript | null> => { if (DEMO) return { language: 'en', segments: D.transcripts[id] }; try { return await req('/stories/' + id + '/transcript') } catch { return null } },
  saveTranscript: (id: string, segments: { id: string; text: string; speaker: string | null; redacted: boolean }[]) => DEMO ? off() : req('/stories/' + id + '/transcript', { method: 'PUT', body: json({ segments }) }),
  storyMemories: async (id: string): Promise<Memory[]> => DEMO ? demoMemories().filter(m => m.story_id === id) : req('/stories/' + id + '/memories'),
  archive: async (q: Record<string, string> = {}): Promise<Memory[]> => {
    if (DEMO) return demoMemories().filter(m => (!q.category || m.category === q.category) && (!q.story_id || m.story_id === q.story_id))
    return (await req<any>('/memories?' + new URLSearchParams(q))).items },
  approve: (id: string) => DEMO ? off() : req('/memories/' + id + '/approve', { method: 'PATCH' }),
  reject: (id: string) => DEMO ? off() : req('/memories/' + id + '/reject', { method: 'PATCH' }),
  people: async (): Promise<{ name: string; stories: number; mentioned: number }[]> => {
    if (DEMO) { const n = new Map<string, number>(); D.stories.forEach((s: Story) => s.storyteller && n.set(s.storyteller, (n.get(s.storyteller) || 0) + 1)); return [...n].map(([name, stories]) => ({ name, stories, mentioned: 0 })) }
    return req('/people') },
  ask: async (q: string): Promise<AskResult> => { if (DEMO) { const hit = D.qa.find((x: any) => x.q === q); if (!hit) off(); return hit } return req('/ask', { method: 'POST', body: json({ query: q }) }) },
  demoQuestions: (): string[] => D.qa.map((x: any) => x.q),
  collections: async (): Promise<Collection[]> => DEMO ? [{ id: 'demo_c1', name: 'Kitchen & Village (DEMO DATA)', memory_ids: ['demo_m1', 'demo_m4', 'demo_m6'], note: 'A fictional remembrance collection.' }] : req('/collections'),
  createCollection: (name: string, memory_ids: string[], note: string) => DEMO ? off() : req('/collections', { method: 'POST', body: json({ name, memory_ids, note }) }),
  exportMd: async (story_id: string) => { if (DEMO) off(); dl(await req<Blob>('/exports/markdown', { method: 'POST', body: json({ story_id, confirm_plaintext: true }) }), 'story.md') },
  exportCollection: async (collection_id: string) => { if (DEMO) off(); dl(await req<Blob>('/exports/collection', { method: 'POST', body: json({ collection_id, confirm_plaintext: true }) }), 'remembrance.html') },
  exportEncrypted: async () => { if (DEMO) off(); dl(await req<Blob>('/exports/encrypted', { method: 'POST' }), 'ghostlight-archive.glar') },
}
export type { Citation }
