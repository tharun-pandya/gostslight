import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
type T = { id: number; msg: string; bad?: boolean }
const Ctx = createContext<(m: string, bad?: boolean) => void>(() => {})
export const useToast = () => useContext(Ctx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, set] = useState<T[]>([])
  const push = useCallback((msg: string, bad?: boolean) => {
    const id = Date.now() + Math.random(); set(i => [...i, { id, msg, bad }]); setTimeout(() => set(i => i.filter(x => x.id !== id)), 5000)
  }, [])
  return <Ctx.Provider value={push}>{children}
    <div className="fixed bottom-4 right-4 z-50 space-y-2" role="status" aria-live="polite">
      {items.map(t => <div key={t.id} className={`rounded-lg px-4 py-2 shadow-lg border ${t.bad ? 'bg-red-950 border-red-400 text-red-100' : 'bg-forest border-emerald-300/40'}`}>{t.msg}</div>)}
    </div></Ctx.Provider>
}
