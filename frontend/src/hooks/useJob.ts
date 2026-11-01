import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import type { Job } from '../types'

/** Starts a job and polls real progress until it is done or failed. */
export function useJob(onDone?: (j: Job) => void) {
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number>()
  const stop = () => window.clearTimeout(timer.current)
  useEffect(() => stop, [])
  const start = useCallback(async (fn: () => Promise<Job>) => {
    setError(null)
    try {
      let j = await fn(); setJob(j)
      const poll = async () => {
        j = await api.job(j.id); setJob(j)
        if (j.status === 'done') onDone?.(j)
        else if (j.status === 'failed') setError(j.error || 'Job failed')
        else timer.current = window.setTimeout(poll, 1000)
      }
      timer.current = window.setTimeout(poll, 600)
    } catch (e: any) { setError(e.message) }
  }, [onDone])
  const busy = !!job && (job.status === 'queued' || job.status === 'running') && !error
  return { job, error, busy, start }
}
