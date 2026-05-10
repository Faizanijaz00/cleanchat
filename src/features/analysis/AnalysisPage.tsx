import { Link } from '@tanstack/react-router'
import { useRef } from 'react'
import { AnalysisStoreProvider, useAnalysisStore } from './state/store'
import { ToastProvider, useToast } from '../../lib/Toast'
import { ModalProvider } from '../../lib/Modal'
import { Tree } from './components/Tree'
import { Inbox } from './components/Inbox'
import { Categories } from './components/Categories'
import './analysis.css'

function AnalysisInner() {
  const { state, dispatch } = useAnalysisStore()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const totalItems = state.items.length
  const totalCats = state.categories.length

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `telegram-analysis-${date}.json`
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
        if (!data || typeof data !== 'object') throw new Error('Invalid')
        const groups = Array.isArray(data.groups) ? data.groups : []
        const items = Array.isArray(data.items) ? data.items : []
        const categories = Array.isArray(data.categories) ? data.categories : []
        dispatch({ type: 'replace', state: { groups, items, categories } })
        toast('Imported')
      } catch {
        toast('Invalid file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="analysis">
      <div className="topbar">
        <h1>Groupchat Analysis</h1>
        <span className="stats">
          · {totalItems} item{totalItems !== 1 ? 's' : ''} · {totalCats} categor{totalCats !== 1 ? 'ies' : 'y'}
        </span>
        <div className="spacer" />
        <button onClick={exportData}>Export</button>
        <button onClick={() => fileInputRef.current?.click()}>Import</button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          style={{ display: 'none' }}
          onChange={importData}
        />
        <Link to="/">← Planner</Link>
      </div>
      <div className="main">
        <Tree />
        <Inbox />
        <Categories />
      </div>
    </div>
  )
}

export function AnalysisPage() {
  return (
    <ToastProvider>
      <ModalProvider>
        <AnalysisStoreProvider>
          <AnalysisInner />
        </AnalysisStoreProvider>
      </ModalProvider>
    </ToastProvider>
  )
}
