import { useEffect, useMemo, useRef, useState } from 'react'
import { EMOJI_DATA } from './emojiData'

type Props = {
  anchor: { x: number; y: number }
  onPick: (emoji: string | null) => void
  onClose: () => void
}

export function EmojiPicker({ anchor, onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return EMOJI_DATA
    return EMOJI_DATA.filter(([e, name]) => name.toLowerCase().includes(term) || e.includes(term))
  }, [q])

  // Position so it stays on screen
  const style: React.CSSProperties = {
    left: Math.min(anchor.x, window.innerWidth - 340),
    top: Math.min(anchor.y, window.innerHeight - 380),
  }

  return (
    <div className="emoji-popover" ref={ref} style={style}>
      <div className="emoji-search">
        <input
          ref={inputRef}
          placeholder="Search emoji…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="emoji-grid">
        {filtered.map(([e, name]) => (
          <button
            key={e + name}
            className="emoji-cell"
            onClick={() => onPick(e)}
            title={name}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="emoji-clear">
        <button onClick={() => onPick(null)}>Remove emoji</button>
      </div>
    </div>
  )
}
