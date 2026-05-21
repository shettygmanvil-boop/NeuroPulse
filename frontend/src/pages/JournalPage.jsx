import React, { useState } from 'react'
import { useHealth } from '../context/HealthContext'

/**
 * JournalPage
 * Text/Voice journal input page. Minimal shell to extend later.
 */
export default function JournalPage() {
  const { addEntry } = useHealth()
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    addEntry({ type: 'text', content: text, createdAt: Date.now() })
    setText('')
  }

  return (
    <section className="np-journal">
      <h2>Journal</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your thoughts or record voice..."
          rows={8}
        />
        <div>
          <button type="submit" className="btn primary">
            Save Entry
          </button>
        </div>
      </form>
    </section>
  )
}
