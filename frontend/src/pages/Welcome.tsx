import { useState } from 'react'
import { Flame, Lock, KeyRound, BookOpen } from 'lucide-react'
import { api, DEMO, enableSample } from '../services/api'
import { ErrorBox } from '../components/ui'
import type { VaultStatus } from '../types'

export function Welcome({ status, onReady }: { status: VaultStatus | null; onReady: () => void }) {
  const [mode, setMode] = useState<'home' | 'create' | 'unlock'>('home')
  const [name, setName] = useState(''); const [pass, setPass] = useState(''); const [pass2, setPass2] = useState('')
  const [ack, setAck] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const run = async (f: () => Promise<any>) => { setErr(''); setBusy(true); try { await f(); onReady() } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  const exists = status?.exists
  return <main className="min-h-screen grid place-items-center p-6"><div className="max-w-xl w-full">
    <div className="text-center mb-8"><Flame size={44} className="mx-auto text-marigold flame" aria-hidden />
      <h1 className="font-serif text-4xl md:text-5xl mt-3">Some voices deserve to stay.</h1>
      <p className="text-muted mt-3 text-lg">Preserve the stories, traditions, and memories of the people who shaped your life.</p>
      <p className="text-amber mt-2 italic">Don’t recreate the person. Preserve the moments.</p></div>
    {mode === 'home' && <div className="space-y-3">
      <button className="btn w-full justify-center" onClick={() => setMode('create')} disabled={DEMO || exists}><Lock size={18} aria-hidden /> Create a private memory vault</button>
      <button className="btn-ghost w-full justify-center" onClick={() => setMode('unlock')} disabled={DEMO || !exists}><KeyRound size={18} aria-hidden /> Unlock an existing vault</button>
      <button className="btn-ghost w-full justify-center" onClick={() => { enableSample(); onReady() }}><BookOpen size={18} aria-hidden /> Explore fictional sample memories</button>
      {DEMO && <p className="text-sm text-amber text-center">Demo uses fictional sample memories. Private uploads, recording and vault creation are disabled.</p>}
      <div className="card text-sm text-muted"><h2 className="font-serif text-ivory text-lg mb-1">Private by design</h2>
        Recordings are transcribed on this computer by Whisper and understood by Gemma running through Ollama. Nothing is sent to a hosted AI service.
        Everything is encrypted at rest with AES-256-GCM; the key is derived from your passphrase with Argon2id and kept only in memory while the vault is unlocked.</div></div>}
    {mode === 'create' && <form className="card space-y-3" onSubmit={e => { e.preventDefault(); run(() => api.create(name, pass)) }}>
      <label className="block">Vault name<input className="input mt-1" value={name} onChange={e => setName(e.target.value)} required maxLength={80} /></label>
      <label className="block">Passphrase (12+ characters)<input type="password" className="input mt-1" value={pass} onChange={e => setPass(e.target.value)} minLength={12} required autoComplete="new-password" /></label>
      <label className="block">Repeat passphrase<input type="password" className="input mt-1" value={pass2} onChange={e => setPass2(e.target.value)} required autoComplete="new-password" /></label>
      <p className="text-sm text-amber">Ghostlight never stores your passphrase and there is no recovery service. If you lose it, the vault cannot be recovered. Keep an encrypted export and the passphrase somewhere safe.</p>
      <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-1" /> I understand that losing my passphrase means losing access to my archive.</label>
      {pass && pass2 && pass !== pass2 && <ErrorBox msg="Passphrases do not match" />}{err && <ErrorBox msg={err} />}
      <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setMode('home')}>Back</button><button className="btn" disabled={busy || !ack || pass !== pass2 || pass.length < 12}>{busy ? 'Deriving key…' : 'Create vault'}</button></div></form>}
    {mode === 'unlock' && <form className="card space-y-3" onSubmit={e => { e.preventDefault(); run(() => api.unlock(pass)) }}>
      <label className="block">Passphrase<input type="password" className="input mt-1" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="current-password" /></label>
      {err && <ErrorBox msg={err} />}<div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setMode('home')}>Back</button><button className="btn" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock'}</button></div></form>}
  </div></main>
}
