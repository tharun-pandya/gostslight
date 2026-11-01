import { useEffect, useState } from 'react'
import { api, DEMO } from '../services/api'
import { Confirm } from '../components/ui'
import { useToast } from '../hooks/useToast'

export function Settings({ onLock }: { onLock: () => void }) {
  const toast = useToast(); const [m, setM] = useState<any>(null); const [del, setDel] = useState(false)
  useEffect(() => { api.models().then(setM).catch(() => {}) }, [])
  const row = (n: string, s?: { ready: boolean; detail: string }) => s && <li className="flex justify-between gap-3 border-b border-bronze/20 py-1"><span>{n}</span><span className={s.ready ? 'text-emerald-300' : 'text-amber'}>{s.ready ? 'ready' : 'not ready'} — {s.detail}</span></li>
  return <div className="space-y-5 max-w-2xl"><h2 className="font-serif text-3xl">Privacy &amp; Settings</h2>
    <section className="card space-y-2"><h3 className="font-serif text-xl">How your memories are protected</h3>
      <ul className="list-disc ml-5 text-muted space-y-1"><li>Transcription (Whisper), memory extraction (Gemma via Ollama) and search run on this computer. No hosted AI APIs, analytics or telemetry.</li>
        <li>Audio, transcripts, memories and embeddings are encrypted with AES-256-GCM. The key comes from your passphrase via Argon2id and lives only in memory while unlocked; the vault auto-locks after inactivity.</li>
        <li>Deleting removes the encrypted files and database rows. On SSDs and journaling file systems, physical erasure can’t be guaranteed — but without the key the data stays unreadable.</li>
        <li>Ghostlight never clones voices, impersonates a storyteller, or recognises faces.</li></ul></section>
    {!DEMO && <section className="card"><h3 className="font-serif text-xl mb-2">Local models</h3>{m ? <><ul>{row('Whisper', m.whisper)}{row('Gemma ' + m.gemma?.model, m.gemma)}{row('Embeddings', m.embeddings)}</ul>
      {m.available_ram_gb !== null && <p className="text-sm text-muted mt-2">Available RAM: {m.available_ram_gb} GB. {m.warning}</p>}<p className="text-sm text-muted">Models are never downloaded automatically — see docs/MODEL_SETUP.md.</p></> : <p className="text-muted">Checking…</p>}</section>}
    {!DEMO && <section className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={async () => { await api.lock(); onLock() }}>Lock vault now</button>
      <button className="btn-ghost" onClick={() => { if (window.confirm('This file contains ALL your private memories, encrypted with your vault key. Continue?')) api.exportEncrypted().catch(e => toast(e.message, true)) }}>Export encrypted archive</button>
      <button className="btn-danger" onClick={() => setDel(true)}>Delete entire vault</button></section>}
    <Confirm open={del} title="Delete the entire vault?" confirmLabel="Delete everything" body="All stories, recordings, transcripts and memories will be removed and the key discarded. This cannot be undone."
      onNo={() => setDel(false)} onYes={async () => { await api.deleteVault(); setDel(false); onLock() }} /></div>
}
