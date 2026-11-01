import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { api, DEMO } from '../services/api'

export interface PlayerHandle { seek: (t: number) => void; playRange: (a: number, b: number) => void }
/** Accessible native <audio> controls + WaveSurfer waveform bound to the same element. */
export const Player = forwardRef<PlayerHandle, { storyId: string }>(({ storyId }, ref) => {
  const audio = useRef<HTMLAudioElement>(null); const wave = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string | null>(null); const [err, setErr] = useState('')
  const stopAt = useRef<number | null>(null)
  useImperativeHandle(ref, () => ({
    seek: t => { if (audio.current) { audio.current.currentTime = t } },
    playRange: (a, b) => { if (audio.current) { audio.current.currentTime = a; stopAt.current = b; audio.current.play().catch(() => {}) } } }))
  useEffect(() => { let u: string | null = null; api.audio(storyId).then(x => { u = x; setUrl(x) }).catch(e => setErr(e.message)); return () => { if (u) URL.revokeObjectURL(u) } }, [storyId])
  useEffect(() => {
    if (!url || !audio.current || !wave.current) return
    let ws: any
    import('wavesurfer.js').then(m => { ws = m.default.create({ container: wave.current!, media: audio.current!, waveColor: '#a9744a', progressColor: '#e0a526', height: 56 }) }).catch(() => {})
    return () => { try { ws?.destroy() } catch {} }
  }, [url])
  if (DEMO) return <div className="card text-sm text-muted">The public demo has no audio. In the local app, the original recording plays here with a waveform.</div>
  if (err) return <div role="alert" className="text-red-200">{err}</div>
  if (!url) return <div className="skeleton h-14" />
  return <div className="card"><div ref={wave} aria-hidden />
    <audio ref={audio} src={url} controls className="w-full mt-2" aria-label="Original recording"
      onTimeUpdate={e => { if (stopAt.current !== null && e.currentTarget.currentTime >= stopAt.current) { e.currentTarget.pause(); stopAt.current = null } }} /></div>
})
