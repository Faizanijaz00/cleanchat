import { useState, type DragEvent } from 'react'
import type { Channel, RatingKey } from '../state/types'
import { usePlannerStore } from '../state/store'
import { EditableSpan } from '../../../lib/EditableSpan'
import { EmojiPicker } from './EmojiPicker'

const RATING_LABELS: Record<RatingKey, string> = {
  urgency: 'Urgency',
  importance: 'Importance',
  universality: 'Universality',
}
const RATING_KEYS: RatingKey[] = ['urgency', 'importance', 'universality']

type Props = {
  channel: Channel
  locked?: boolean
}

export function ChannelCard({ channel, locked = false }: Props) {
  const { dispatch } = usePlannerStore()
  const [emojiAnchor, setEmojiAnchor] = useState<{ x: number; y: number } | null>(null)

  function onDragStart(e: DragEvent<HTMLLIElement>) {
    if (locked) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', channel.id)
    ;(e.currentTarget as HTMLElement).classList.add('dragging')
  }
  function onDragEnd(e: DragEvent<HTMLLIElement>) {
    ;(e.currentTarget as HTMLElement).classList.remove('dragging')
  }

  return (
    <li
      className={`channel${channel.pinned ? ' pinned' : ''}`}
      data-channel-id={channel.id}
      draggable={!locked}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className={`channel-icon${channel.emoji ? ' has-emoji' : ''}`}
        title="Click to pick emoji"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setEmojiAnchor({ x: rect.right + 8, y: rect.top })
        }}
      >
        {channel.emoji ? (
          <span style={{ fontSize: 22, lineHeight: 1 }}>{channel.emoji}</span>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
            <path d="M9.7 17.5L9.4 21c.4 0 .6-.2.8-.4l2-1.9 4.1 3c.7.4 1.3.2 1.5-.7l2.7-12.6c.3-1.1-.4-1.6-1.1-1.3L3.6 13.2c-1.1.4-1 1-.2 1.3l4.1 1.3 9.4-5.9c.4-.3.8-.1.5.2" />
          </svg>
        )}
      </div>
      <div className="channel-body">
        <EditableSpan
          className="channel-name"
          value={channel.name}
          disabled={locked}
          onCommit={(name) => dispatch({ type: 'updateChannel', id: channel.id, patch: { name: name || 'Untitled channel' } })}
        />
        <EditableSpan
          className="channel-desc"
          value={channel.desc || ''}
          placeholder="Add description..."
          disabled={locked}
          onCommit={(desc) => dispatch({ type: 'updateChannel', id: channel.id, patch: { desc } })}
        />
        {RATING_KEYS.map((key) => {
          const value = (channel[key] as number | undefined) ?? 0
          return (
            <div key={key} className={`rating-row ${key}`}>
              <div className="rating-label">{RATING_LABELS[key]}</div>
              <div className="rating-dots">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`rating-dot${n <= value ? ' filled' : ''}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      const next = value === n ? 0 : n
                      dispatch({ type: 'updateChannel', id: channel.id, patch: { [key]: next } })
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="channel-actions">
        <button
          className={`icon-btn pin${channel.pinned ? ' active' : ''}`}
          title={channel.pinned ? 'Unpin' : 'Pin to top'}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'togglePin', id: channel.id })
          }}
        >
          <svg viewBox="0 0 24 24" fill={channel.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} width="13" height="13">
            <path d="M16 9V4l1-1V2H7v1l1 1v5l-2 2v2h5v7l1 1 1-1v-7h5v-2l-2-2z" />
          </svg>
        </button>
        <button
          className="icon-btn del"
          title="Delete"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'deleteChannel', id: channel.id })
          }}
        >
          ×
        </button>
      </div>
      {emojiAnchor && (
        <EmojiPicker
          anchor={emojiAnchor}
          onPick={(emoji) => {
            dispatch({ type: 'updateChannel', id: channel.id, patch: { emoji: emoji ?? undefined } })
            setEmojiAnchor(null)
          }}
          onClose={() => setEmojiAnchor(null)}
        />
      )}
    </li>
  )
}
