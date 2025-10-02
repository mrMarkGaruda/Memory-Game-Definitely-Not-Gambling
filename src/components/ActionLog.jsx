import { useEffect, useRef, useState } from 'react'

/**
 * ActionLog renders a categorized chronological feed.
 * Auto-scrolls only if the user hasn't scrolled upward manually.
 */
export function ActionLog({ logs }) {
  const containerRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (autoScroll) {
      el.scrollTop = 0 // newest at top
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    // If user scrolls down more than 40px from top, disable auto-scroll (because list is reversed visually)
    setAutoScroll(el.scrollTop < 40)
  }

  return (
    <div className="panel panel--log" aria-label="Action log" role="log" aria-live="polite">
      <div className="panel__head">
        <h2 className="panel__title">🎰 Action Log</h2>
        {!autoScroll && (
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              setAutoScroll(true)
            }}
            aria-label="Scroll to most recent log entries"
          >Latest ↓</button>
        )}
      </div>
      <div className="log-window" ref={containerRef} onScroll={handleScroll}>
        {logs.length === 0 && (
          <div className="log-empty">No activity yet. Start a round to generate events.</div>
        )}
        {logs.map((entry, index) => (
          <div key={`${entry.timestamp}-${index}`} className="log-entry">
            <span className="log-meta">
              <span className="log-time">{entry.timestamp}</span>
              <span className={`log-badge log-badge--${entry.type}`}>{entry.type}</span>
            </span>
            <span className="log-message">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActionLog
