export interface Story { id: string; title: string; storyteller?: string; recorded_on?: string | null; places: string[]; language?: string; duration?: number | null; consent: boolean; status: string; format?: string; detected_language?: string }
export interface Segment { id: string; start: number; end: number; text: string; original_text: string; speaker: string | null; redacted: boolean }
export interface Transcript { language: string; language_probability?: number; segments: Segment[]; edited?: boolean }
export interface Evidence { segment_id: string; start_seconds: number; end_seconds: number; exact_quote: string }
export interface Memory { id: string; story_id: string; category: string; title: string; description: string; confidence: number; status: string; evidence: Evidence[]; story_title?: string; storyteller?: string; recorded_on?: string | null; uncertain?: boolean }
export interface Citation { story_id: string; story_title: string; segment_id: string; start: number; end: number; text: string }
export interface AskResult { answer: string; citations: Citation[]; mode: 'gemma' | 'abstained' | 'evidence_only'; notice?: string }
export interface Job { id: string; kind: string; story_id: string; status: 'queued' | 'running' | 'done' | 'failed'; progress: number; error: string | null; result: any }
export interface Collection { id: string; name: string; memory_ids: string[]; note: string }
export interface VaultStatus { exists: boolean; unlocked: boolean; demo_mode: boolean; idle_lock_seconds: number }
