import { Link } from '@tanstack/react-router'
import { usePlannerStore } from '../state/store'
import { useToast } from '../../../lib/Toast'
import { useModal } from '../../../lib/Modal'
import { useRef } from 'react'
import { uid } from '../../../lib/uid'
import type { PlannerState } from '../state/types'
import { migrate } from '../state/storage'

export function Topbar() {
  const { state, dispatch } = usePlannerStore()
  const toast = useToast()
  const modal = useModal()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const groupCount = state.groups.length
  const channelCount = state.groups.reduce((acc, g) => acc + g.channels.length, 0)
  const unassignedCount = state.unassignedPages.reduce((acc, p) => acc + p.channels.length, 0)

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `telegram-plan-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Exported')
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(String(ev.target?.result ?? ''))
        if (!data || typeof data !== 'object' || !Array.isArray(data.groups)) throw new Error('Invalid')
        const migrated = migrate(data)
        dispatch({ type: 'replace', state: migrated })
        toast('Imported')
      } catch {
        toast('Invalid file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function confirmReset() {
    modal({
      title: 'Reset everything?',
      text: 'This will clear all your groups and channels. Consider exporting first.',
      danger: true,
      confirmLabel: 'Reset',
      onConfirm: () => {
        const p1 = { id: uid(), name: 'Page 1', channels: [] }
        const p2 = { id: uid(), name: 'Page 2', channels: [] }
        const bp1 = { id: uid(), name: 'Page 1' }
        const fresh: PlannerState = {
          groups: [],
          unassignedPages: [p1, p2],
          activeUnassignedPage: p1.id,
          boardPages: [bp1],
          activeBoardPage: bp1.id,
        }
        dispatch({ type: 'replace', state: fresh })
        toast('Reset')
      },
    })
  }

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <svg width="20" height="20" viewBox="0 0 240 240" fill="currentColor">
            <path d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0zm55.5 82.4l-19.5 92c-1.5 6.5-5.3 8.1-10.7 5.1l-29.6-21.8-14.3 13.7c-1.6 1.6-2.9 2.9-5.9 2.9l2.1-29.9 54.5-49.2c2.4-2.1-.5-3.3-3.7-1.2l-67.3 42.4-29-9.1c-6.3-2-6.4-6.3 1.3-9.3l113.2-43.6c5.2-2 9.8 1.2 8.1 9z" />
          </svg>
        </div>
        <span>Telegram Group Planner</span>
        <span className="stats">
          · {groupCount} group{groupCount !== 1 ? 's' : ''} · {channelCount} channel{channelCount !== 1 ? 's' : ''}
          {unassignedCount ? ` · ${unassignedCount} unassigned` : ''}
        </span>
      </div>
      <div className="actions">
        <Link className="btn analysis-cta" to="/analysis">
          📊 Analysis
        </Link>
        <button className="btn ghost" onClick={exportData}>Export</button>
        <button className="btn ghost" onClick={() => fileInputRef.current?.click()}>Import</button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          style={{ display: 'none' }}
          onChange={importData}
        />
        <button className="btn ghost" onClick={confirmReset}>Reset</button>
        <button className="btn primary" onClick={() => dispatch({ type: 'addGroup' })}>+ Group Chat</button>
      </div>
    </div>
  )
}
