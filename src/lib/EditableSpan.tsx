import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

type Props = {
  value: string
  placeholder?: string
  className?: string
  style?: CSSProperties
  disabled?: boolean
  multiline?: boolean // allow Enter inserts newline (default: blur on Enter)
  onCommit: (next: string) => void
  startEditingKey?: string // when this changes, force-focus and select-all
  children?: ReactNode
}

// Inline-editable span using contenteditable. Saves on blur. Enter blurs (single-line).
// Escape reverts to original value.
export function EditableSpan({
  value,
  placeholder,
  className,
  style,
  disabled,
  multiline,
  onCommit,
  startEditingKey,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const valRef = useRef(value)

  // Keep textContent in sync when value changes from outside (avoid wiping cursor while focused).
  useEffect(() => {
    valRef.current = value
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el) {
      el.textContent = value
    }
  }, [value])

  // Force-focus + select-all when caller bumps the key.
  useEffect(() => {
    if (!startEditingKey || disabled) return
    const el = ref.current
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [startEditingKey, disabled])

  return (
    <span
      ref={ref}
      className={className}
      style={style}
      contentEditable={!disabled}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={() => {
        const next = (ref.current?.textContent ?? '').replace(/\r/g, '')
        const cleaned = multiline ? next : next.replace(/\n/g, ' ')
        if (cleaned === valRef.current) return
        onCommit(cleaned)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          if (ref.current) ref.current.textContent = valRef.current
          ;(e.currentTarget as HTMLElement).blur()
        }
      }}
      onMouseDown={(e) => e.stopPropagation()} // don't initiate parent drag
      onClick={(e) => e.stopPropagation()}
      draggable={false}
    >
      {value}
    </span>
  )
}
