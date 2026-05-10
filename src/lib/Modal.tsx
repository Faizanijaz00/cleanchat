import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ModalConfig = {
  title: string
  text: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
}

type ModalApi = (cfg: ModalConfig) => void

const ModalCtx = createContext<ModalApi>(() => {})

export function ModalProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<ModalConfig | null>(null)

  const open = useCallback<ModalApi>((c) => setCfg(c), [])
  const close = useCallback(() => setCfg(null), [])

  return (
    <ModalCtx.Provider value={open}>
      {children}
      {cfg && (
        <div className="modal-overlay show" onClick={(e) => { if (e.currentTarget === e.target) close() }}>
          <div className="modal">
            <h3>{cfg.title}</h3>
            <p>{cfg.text}</p>
            <div className="actions">
              <button className="ghost" onClick={close}>{cfg.cancelLabel ?? 'Cancel'}</button>
              <button
                className={cfg.danger ? 'danger' : 'primary'}
                onClick={() => { cfg.onConfirm(); close() }}
              >
                {cfg.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalCtx.Provider>
  )
}

export function useModal() {
  return useContext(ModalCtx)
}
