import { useCallback, useEffect, useRef, useState } from 'react'
import { Wand2, Trash2, EyeOff, Download, ShieldOff } from 'lucide-react'
import { api, DEMO } from '../services/api'
import { Player, PlayerHandle } from '../components/Player'
import { MemoryCard } from '../components/MemoryCard'
import { Confirm, ErrorBox, Progress, Skeleton, fmt } from '../components/ui'
import { useJob } from '../hooks/useJob'
import { useToast } from '../hooks/useToast'
import type { Job, Memory, Story, Transcript } from '../types'

export function Studio({ storyId, seekTo, onBack, onDeleted }: { storyId: string; seekTo?: number; onBack: () => void; onDeleted: () => void }) {
  const toast = useToast(); const player = useRef<PlayerHandle>(null)
  const [story, setStory] = useState<Story | null>(null); const [tr, setTr] = useState<Transcript | null | undefined>(undefined)
  const [mem, setMem] = useState<Memory[]>([]); const [dirty, setDirty] = useState(false); const [confirmDel, setConfirmDel] = useState(false); const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const [s, t, m] = await Promise.all([api.stories().then(l => l.find(x => x.id === storyId) || null), api.transcript(storyId), api.storyMemories(storyId)])
    setStory(s); setTr(t); setMem(m); setDirty(false)
  }, [storyId])
  useEffect(() => { load().catch(e => setErr(e.message)) }, [load])
  useEffect(() => { if (seekTo !== undefined) setTimeout(() => player.current?.seek(seekTo), 400) }, [seekTo, tr])
  const tJob = useJob(useCallback(() => { toast('Transcript ready'); load() }, [load, toast]))
  const eJob = useJob(useCallback((j: Job) => { toast(`${j.result?.saved ?? 0} memory candidates saved for review`); load() }, [load, toast]))
  const upd = (id: string, patch: Partial<{ text: string; speaker: string | null; redacted: boolean }>) => { setTr(t => t && ({ ...t, segments: t.segments.map(s => s.id === id ? { ...s, ...patch } : s) })); setDirty(true) }
  const save = async () => { try { await api.saveTranscript(storyId, tr!.segments.map(s => ({ id: s.id, text: s.text, speaker: s.speaker, redacted: s.redacted }))); toast('Transcript saved (original ASR text is kept)'); load() } catch (e: any) { toast(e.message, true) } }
  const review = async (m: Memory, ok: boolean) => { try { ok ? await api.approve(m.id) : await api.reject(m.id); load() } catch (e: any) { toast(e.message, true) } }
  if (err) return <ErrorBox msg={err} />
  if (!story || tr === undefined) return <Skeleton rows={5} />
  const pending = mem.filter(m => m.status === 'pending_review'); const done = mem.filter(m => m.status !== 'pending_review')
  return <div className="space-y-5">
    <button className="btn-ghost" onClick={onBack}>← Stories</button>
    <header><h2 className="font-serif text-3xl">{story.title}</h2><p className="text-muted">{story.storyteller || 'Storyteller not set'} · {story.recorded_on || 'date not provided'} · consent {story.consent ? 'given' : 'withdrawn'}</p></header>
    <Player ref={player} storyId={storyId} />
    <div className="flex flex-wrap gap-2">
      {!DEMO && <button className="btn" disabled={tJob.busy} onClick={() => tJob.start(() => api.transcribe(storyId))}>{tr ? 'Re-transcribe' : 'Transcribe locally (Whisper)'}</button>}
      {!DEMO && tr && <button className="btn" disabled={eJob.busy} onClick={() => eJob.start(() => api.extract(storyId))}><Wand2 size={16} aria-hidden /> Discover the memories in this story</button>}
      {!DEMO && <button className="btn-ghost" onClick={() => api.exportMd(storyId).catch(e => toast(e.message, true))}><Download size={16} aria-hidden /> Markdown</button>}
      {!DEMO && <button className="btn-ghost" onClick={async () => { await api.setConsent(storyId, !story.consent); load() }}><ShieldOff size={16} aria-hidden /> {story.consent ? 'Withdraw consent' : 'Restore consent'}</button>}
      {!DEMO && <button className="btn-danger" onClick={() => setConfirmDel(true)}><Trash2 size={16} aria-hidden /> Delete story</button>}</div>
    {tJob.job && tJob.busy && <Progress value={tJob.job.progress} label="Transcribing on this computer" />}{tJob.error && <ErrorBox msg={tJob.error} />}
    {eJob.job && eJob.busy && <Progress value={eJob.job.progress} label="Gemma is reading the transcript" />}{eJob.error && <ErrorBox msg={eJob.error} />}
    {eJob.job?.status === 'done' && eJob.job.result.rejected?.length > 0 && <p className="text-sm text-amber">{eJob.job.result.rejected.length} candidate(s) were discarded because their evidence could not be verified in the transcript.</p>}
    <section aria-labelledby="tr"><h3 id="tr" className="font-serif text-2xl mb-2">Transcript</h3>
      {tr ? <><p className="text-sm text-muted mb-2">Detected language: {tr.language} {tr.language_probability !== undefined && `(confidence ${Math.round(tr.language_probability * 100)}%)`}. Automatic transcription can be wrong, especially for Telugu–English mixing — please correct it. Speaker names are assigned manually.</p>
        <ol className="space-y-2">{tr.segments.map(s => <li key={s.id} className="card !p-3">
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted">
            <button className="underline text-amber" onClick={() => player.current?.playRange(s.start, s.end)} aria-label={`Play segment from ${fmt(s.start)}`}>{fmt(s.start)}–{fmt(s.end)}</button>
            <input className="input !w-40 !py-1" placeholder="Speaker" aria-label="Speaker" value={s.speaker ?? ''} disabled={DEMO} onChange={e => upd(s.id, { speaker: e.target.value || null })} />
            {!DEMO && <button className="btn-ghost !py-1" onClick={() => upd(s.id, { redacted: !s.redacted })}><EyeOff size={14} aria-hidden /> {s.redacted ? 'Unredact' : 'Redact'}</button>}</div>
          {s.redacted ? <p className="italic text-muted mt-1">[redacted]</p> :
            <textarea className="input mt-1" rows={2} value={s.text} disabled={DEMO} aria-label={`Transcript text ${fmt(s.start)}`} onChange={e => upd(s.id, { text: e.target.value })} />}
          {s.text !== s.original_text && <p className="text-xs text-muted mt-1">Original: {s.original_text}</p>}</li>)}</ol>
        {dirty && <button className="btn mt-3" onClick={save}>Save transcript changes</button>}</> :
        <p className="text-muted">No transcript yet. Transcription runs locally with Whisper — this can take a while on CPU.</p>}</section>
    {pending.length > 0 && <section aria-labelledby="pend"><h3 id="pend" className="font-serif text-2xl mb-2">Memory candidates to review</h3>
      <p className="text-sm text-muted mb-2">Each candidate quotes the transcript. Nothing enters the archive until you approve it.</p>
      <div className="space-y-3">{pending.map(m => <MemoryCard key={m.id} m={{ ...m, story_title: story.title }} onOpen={(_, t) => player.current?.seek(t)} actions={<>
        <button className="btn !py-1" onClick={() => review(m, true)}>Approve</button><button className="btn-ghost !py-1" onClick={() => review(m, false)}>Reject</button></>} />)}</div></section>}
    {done.length > 0 && <section aria-labelledby="rev"><h3 id="rev" className="font-serif text-2xl mb-2">Reviewed</h3><div className="space-y-3">{done.map(m => <MemoryCard key={m.id} m={{ ...m, story_title: story.title }} onOpen={(_, t) => player.current?.seek(t)} />)}</div></section>}
    <Confirm open={confirmDel} title="Delete this story?" confirmLabel="Delete" body="Removes the encrypted audio, transcript, memories and embeddings from this vault. Deleted files can’t be guaranteed unrecoverable on SSDs, but they remain encrypted."
      onNo={() => setConfirmDel(false)} onYes={async () => { await api.deleteStory(storyId); toast('Story deleted'); onDeleted() }} />
  </div>
}
