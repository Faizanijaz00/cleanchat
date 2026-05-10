import type { DragEvent } from 'react'
import { useAnalysisStore, useFindChannel } from '../state/store'
import { colorFor, symbolFor, type Item } from '../state/types'
import { EditableSpan } from '../../../lib/EditableSpan'

type Props = {
  item: Item
  showSource?: boolean
  highlight?: boolean
  dim?: boolean
}

function flashChannel(channelId: string) {
  window.dispatchEvent(new CustomEvent('analysis:flash-channel', { detail: channelId }))
}

export function ItemCard({ item, showSource = false, highlight = false, dim = false }: Props) {
  const { dispatch } = useAnalysisStore()
  const found = useFindChannel(showSource ? item.channelId : null)

  function onDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
    ;(e.currentTarget as HTMLElement).classList.add('dragging')
  }
  function onDragEnd(e: DragEvent<HTMLDivElement>) {
    ;(e.currentTarget as HTMLElement).classList.remove('dragging')
  }

  return (
    <div
      className={`item${highlight ? ' sort-active' : ''}${dim ? ' sort-skipped' : ''}`}
      data-item-id={item.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <EditableSpan
        className="item-text"
        value={item.text}
        multiline
        onCommit={(text) => {
          if (!text.trim()) dispatch({ type: 'deleteItem', id: item.id })
          else dispatch({ type: 'updateItemText', id: item.id, text })
        }}
      />
      {showSource && found ? (
        <span
          className="item-cat"
          data-channel-id={item.channelId}
          style={{ background: colorFor(item.channelId), cursor: 'pointer' }}
          title={`From ${found.group.name} · ${found.channel.name} · click to find on left`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            flashChannel(item.channelId)
          }}
        >
          {symbolFor(found.channel)}
        </span>
      ) : showSource ? (
        <span className="item-cat" style={{ background: '#555' }} title="Channel deleted">?</span>
      ) : null}
      <button
        className="item-del"
        type="button"
        title="Delete item"
        onClick={(e) => {
          e.stopPropagation()
          dispatch({ type: 'deleteItem', id: item.id })
        }}
      >
        ×
      </button>
    </div>
  )
}
