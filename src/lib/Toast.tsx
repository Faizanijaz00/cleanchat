import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastApi = (msg: string) => void

const ToastCtx = createContext<ToastApi>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  const toast = useCallback<ToastApi>((m) => {
    setMsg(m)
    setShow(true)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setShow(false), 1700)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={`toast${show ? ' show' : ''}`}>{msg}</div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
