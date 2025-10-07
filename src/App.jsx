import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const HEROES = [
  { name: 'Lucky Lynx', symbol: '🃏', color: '#ffc966' },
  { name: 'Fortune Fox', symbol: '🦊', color: '#ff5b7c' },
  { name: 'Roulette Raven', symbol: '🦅', color: '#44e28f' },
  { name: 'Spin Shark', symbol: '🦈', color: '#7694ff' },
  { name: 'Dice Dragon', symbol: '🐉', color: '#ff8c3a' },
  { name: 'Jackpot Jackal', symbol: '🎰', color: '#e244ff' },
]

const COIN_RATE = 0.01
const INIT_COINS = 1000
const MIN_BET = 50
const MAX_BET = 1000000
const MAX_PURCHASE = 10000000
const HOUSE_FEE = 0.02
const MAX_MISTAKES = 12
const PERFECT_MULT = 2

const calcPayout = (m) => {
  if (m >= MAX_MISTAKES) return 0
  if (m <= 0) return PERFECT_MULT
  return Math.max(0, PERFECT_MULT - (m * (PERFECT_MULT / MAX_MISTAKES)))
}

const shuffle = (arr) => {
  let i = arr.length
  while (i !== 0) {
    let j = Math.floor(Math.random() * i)
    i--;
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const createDeck = () =>
  HEROES.flatMap((h) => [
    { id: `${h.name}-a`, pairId: h.name, ...h, isFlipped: false, isMatched: false },
    { id: `${h.name}-b`, pairId: h.name, ...h, isFlipped: false, isMatched: false },
  ])

const fmt = (n) => n.toLocaleString('en-US')
const toDollar = (n) => (n * COIN_RATE).toFixed(2)

const Card = React.memo(({ card, onFlip, isActive }) => {
  const handleClick = () => {
    if (isActive && !card.isFlipped && !card.isMatched) onFlip(card.id)
  }

  return (
    <div className={`card-container ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`} onClick={handleClick} style={card.isMatched ? { '--matched-color': card.color } : {}}>
      <div className="card-flipper">
        <div className="card-front">
          {card.isMatched ? (
            <svg className="card-check" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="#44e28f" stroke="#2dd477" strokeWidth="3"/>
              <path d="M30 50 L42 62 L70 34" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          ) : (
            <svg className="card-question-mark" viewBox="0 0 100 140">
              <path d="M50 10C32.5 10 20 22.5 20 40C20 42.5 22 44.5 24.5 44.5C27 44.5 29 42.5 29 40C29 27.5 37.5 19 50 19C62.5 19 71 27.5 71 40C71 48 66 54 58 58C52 61 46 66 46 75V80C46 82.5 48 84.5 50.5 84.5C53 84.5 55 82.5 55 80V75C55 70 58 67 63 64C73 59 80 51 80 40C80 22.5 67.5 10 50 10Z" fill="currentColor"/>
              <circle cx="50" cy="110" r="10" fill="currentColor"/>
            </svg>
          )}
        </div>
        <div className="card-back" style={{ backgroundColor: card.color }}>
          <span className="card-symbol">{card.symbol}</span>
        </div>
      </div>
    </div>
  )
})

const GameBoard = ({ deck, onFlip, isActive, isResolving, status, msg, onClose }) => (
  <div className="game-board-container">
    <div className="game-board-grid">
      {deck.map((c) => <Card key={c.id} card={c} onFlip={onFlip} isActive={isActive && !isResolving} />)}
    </div>
    {status === 'WON' && (
      <div className="round-overlay-backdrop">
        <div className="round-overlay-card win-overlay">
          <h2 className="overlay-title">VICTORY!</h2>
          <p className="overlay-message">{msg}</p>
          <button className="overlay-button button-win" onClick={onClose}>Start Next Round</button>
        </div>
      </div>
    )}
    {status === 'LOST' && (
      <div className="round-overlay-backdrop">
        <div className="round-overlay-card lose-overlay">
          <h2 className="overlay-title">GAME OVER</h2>
          <p className="overlay-message">{msg}</p>
          <button className="overlay-button button-lose" onClick={onClose}>Try Again</button>
        </div>
      </div>
    )}
  </div>
)

const Controls = ({ onStart, onWithdraw, onPurchase, canStart, isResolving, status, coins, bet, setBet, purchase, setPurchase }) => {
  const active = status === 'ACTIVE'
  return (
    <div className="controls-panel">
      <h2 className="panel-title">Game Controls</h2>
      <div className="control-group">
        <p className="control-label">Bet Amount (Coins):</p>
        <input type="number" value={bet} onChange={(e) => setBet(parseInt(e.target.value) || MIN_BET)} min={MIN_BET} max={MAX_BET} step={50} className="control-input" disabled={active || isResolving}/>
        <button className="control-button button-accent" onClick={onStart} disabled={!canStart || isResolving || active}>
          {active ? 'Game in Progress...' : 'Start New Round'}
        </button>
        {bet < MIN_BET && <p className="input-feedback-error">Min bet is {fmt(MIN_BET)} Coins.</p>}
        {bet > coins && <p className="input-feedback-error">Not enough coins for this bet!</p>}
      </div>
      <hr className="control-divider"/>
      <div className="control-group">
        <p className="control-label">Purchase Coins:</p>
        <input type="number" value={purchase} onChange={(e) => setPurchase(parseInt(e.target.value) || MIN_BET)} min={MIN_BET} max={MAX_PURCHASE} step={100} className="control-input"/>
        <button className="control-button button-positive" onClick={() => onPurchase(purchase)} disabled={purchase < MIN_BET}>
          Buy {fmt(purchase)} Coins (${toDollar(purchase)})
        </button>
        {purchase < MIN_BET && <p className="input-feedback-error">Min purchase is {fmt(MIN_BET)} Coins.</p>}
      </div>
      <hr className="control-divider"/>
      <div className="control-group">
        <p className="control-label">Cash Out:</p>
        <button className="control-button button-negative" onClick={onWithdraw} disabled={active || isResolving}>Withdraw All Cash (${toDollar(coins)})</button>
      </div>
    </div>
  )
}

const Stats = ({ mistakes, pairs, total, status, coins, net, bet, pot, profit }) => (
  <div className="stats-sidebar">
    <div className="sidebar-section">
      <h3 className="sidebar-title">Game Stats</h3>
      <div className="stat-row"><span className="stat-label">Status</span><span className={`stat-value status-${status.toLowerCase()}`}>{status}</span></div>
      <div className="stat-row"><span className="stat-label">Pairs</span><span className="stat-value text-positive">{pairs}/{total}</span></div>
      <div className="stat-row"><span className="stat-label">Mistakes</span><span className="stat-value text-negative">{mistakes}</span></div>
    </div>
    <div className="sidebar-section sidebar-highlight">
      <h3 className="sidebar-title">Balance</h3>
      <div className="stat-value-large stat-coins">{fmt(coins)}</div>
      <div className="stat-subtext">${toDollar(coins)}</div>
    </div>
    <div className="sidebar-section">
      <h3 className="sidebar-title">Current Round</h3>
      <div className="stat-row"><span className="stat-label">Bet</span><span className="stat-value">{fmt(bet)}</span></div>
      <div className="stat-row"><span className="stat-label">Win</span><span className="stat-value text-positive">+{fmt(profit)}</span></div>
      <div className="stat-row"><span className="stat-label">Pot Left</span><span className="stat-value text-accent">{fmt(pot)}</span></div>
    </div>
    <div className={`sidebar-section ${net >= 0 ? 'sidebar-profit' : 'sidebar-loss'}`}>
      <h3 className="sidebar-title">Net P/L</h3>
      <div className={`stat-value-large ${net >= 0 ? 'text-positive' : 'text-negative'}`}>{net >= 0 ? '+' : ''}{fmt(net)}</div>
      <div className={`stat-subtext ${net >= 0 ? 'text-positive' : 'text-negative'}`}>{net >= 0 ? '+' : ''}${toDollar(net)}</div>
    </div>
  </div>
)

const Log = ({ logs }) => {
  const important = useMemo(() => {
    const filtered = []
    const seen = new Set()
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i]
      const timeKey = Math.floor(new Date(`2000-01-01 ${log.time}`).getTime() / 1000)
      const key = `${log.type}-${timeKey}`
      const critical = ['bet', 'win', 'purchase', 'withdraw', 'system'].includes(log.type)
      if (critical && !seen.has(key)) {
        seen.add(key)
        filtered.push(log)
      }
    }
    return filtered.slice(0, 6)
  }, [logs])

  return (
    <div className="log-panel-compact">
      <h3 className="log-title-compact">Key Events</h3>
      <div className="log-window-compact">
        {important.length === 0 ? (
          <div className="log-empty"><span className="log-empty-icon">LOG</span><p>No events yet. Start a round!</p></div>
        ) : (
          important.map((l, i) => (
            <div key={`${l.time}-${i}`} className={`log-entry-compact log-${l.type}`}>
              <div className="log-header">
                <span className="log-timestamp-compact">{l.time}</span>
                <span className={`log-icon log-icon-${l.type}`}>
                  {l.type === 'win' ? 'WIN' : l.type === 'bet' ? 'BET' : l.type === 'purchase' ? 'BUY' : l.type === 'withdraw' ? 'OUT' : l.type === 'system' ? 'SYS' : 'INFO'}
                </span>
              </div>
              <p className="log-message-compact">{l.msg}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function App() {
  const [coins, setCoins] = useState(INIT_COINS)
  const [spent, setSpent] = useState(0)
  const [withdrawn, setWithdrawn] = useState(0)
  const [bet, setBet] = useState(MIN_BET)
  const [purchase, setPurchase] = useState(MIN_BET)
  const [deck, setDeck] = useState(shuffle(createDeck()))
  const [flipped, setFlipped] = useState([])
  const [pairs, setPairs] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [resolving, setResolving] = useState(false)
  const [status, setStatus] = useState('IDLE')
  const [logs, setLogs] = useState([])
  const [roundPayout, setRoundPayout] = useState(0)
  const lastLog = useRef({ msg: '', ts: 0 })

  const net = coins - INIT_COINS - spent + withdrawn
  const canStart = coins >= bet && bet >= MIN_BET
  const mult = calcPayout(mistakes)
  const payout = status === 'ACTIVE' ? roundPayout : Math.floor(bet * mult)
  const profit = Math.max(0, payout - bet)
  const perPair = Math.floor(payout / HEROES.length)
  const potLeft = perPair * (HEROES.length - pairs)
  const fee = Math.floor(bet * HOUSE_FEE)

  const addLog = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const now = Date.now()
    if (lastLog.current.msg === msg && now - lastLog.current.ts < 500) return
    lastLog.current = { msg, ts: now }
    setLogs((prev) => {
      const arr = [...prev, { time, msg, type }]
      return arr.length > 50 ? arr.slice(-50) : arr
    })
  }, [])

  useEffect(() => {
    addLog(`Welcome! Starting balance: ${fmt(INIT_COINS)} coins ($${toDollar(INIT_COINS)})`, 'system')
  }, [])

  const handleFlip = useCallback((id) => {
    if (resolving || status !== 'ACTIVE') return
    setDeck((prev) => prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c)))
    const card = deck.find((c) => c.id === id)
    if (card) setFlipped((prev) => prev.length < 2 ? [...prev, { id, pairId: card.pairId }] : prev)
  }, [resolving, status, deck])

  useEffect(() => {
    if (flipped.length === 2) {
      const [c1, c2] = flipped
      const match = c1.pairId === c2.pairId
      setResolving(true)
      const t = setTimeout(() => {
        if (match) {
          setDeck((prev) => prev.map((c) => c.id === c1.id || c.id === c2.id ? { ...c, isMatched: true, isFlipped: true } : c))
          setPairs((p) => p + 1)
          setCoins((c) => c + perPair)
        } else {
          setDeck((prev) => prev.map((c) => c.id === c1.id || c.id === c2.id ? { ...c, isFlipped: false } : c))
          setMistakes((m) => m + 1)
        }
        setFlipped([])
        setResolving(false)
      }, 1000)
      return () => clearTimeout(t)
    }
  }, [flipped, perPair])

  useEffect(() => {
    if (status !== 'ACTIVE') return
    if (pairs === HEROES.length) {
      const extra = payout - (perPair * pairs)
      if (extra > 0) {
        setCoins(c => {
          const nc = c + extra
          addLog(`ROUND WON! Collected final pot: ${fmt(extra)} coins. Total won: ${fmt(payout)} coins!`, 'win')
          return nc
        })
      }
      setStatus('WON')
      addLog(`Perfect! You matched all ${HEROES.length} pairs and won ${fmt(payout)} coins ($${toDollar(payout)}) - that's +${fmt(profit)} profit!`, 'system')
      return
    }
    if (mistakes >= MAX_MISTAKES / 2) {
      setStatus('LOST')
      addLog(`Round LOST with ${mistakes} mistakes. You only keep what you earned before losing.`, 'system')
      addLog(`House keeps ${fmt(fee)} coins fee. Better luck next time!`, 'system')
    }
  }, [pairs, mistakes, status, potLeft, payout, perPair, fee, profit, addLog])

  const startRound = () => {
    if (!canStart) return
    const currentPayout = Math.floor(bet * calcPayout(0))
    setRoundPayout(currentPayout)
    setCoins(c => c - bet)
    addLog(`Round Started - Bet: ${fmt(bet)} coins. Win: ${fmt(currentPayout)} coins (+${fmt(currentPayout - bet)} profit)`, 'bet')
    setFlipped([])
    setPairs(0)
    setMistakes(0)
    setResolving(false)
    setStatus('ACTIVE')
    setDeck(shuffle(createDeck()))
  }

  const buyCoins = (amt) => {
    const n = Math.min(Math.max(MIN_BET, amt), MAX_PURCHASE)
    setCoins(c => c + n)
    setSpent(s => s + n)
    addLog(`Purchased ${fmt(n)} coins ($${toDollar(n)})`, 'purchase')
  }

  const withdraw = () => {
    setWithdrawn(w => w + coins)
    addLog(`Withdrew ${fmt(coins)} coins ($${toDollar(coins)})`, 'withdraw')
    setCoins(0)
    setBet(MIN_BET)
  }

  const restart = () => setStatus('IDLE')

  const msg = status === 'WON'
    ? `You won ${fmt(payout)} coins ($${toDollar(payout)}) - that's +${fmt(profit)} profit! House kept ${fmt(fee)} coins fee.`
    : `You lost with ${mistakes} mistakes. ${fmt(potLeft)} coins were refunded. House kept ${fmt(fee)} coins fee.`

  return (
    <div className="app-container">
      <div className="app-main">
        <aside className="sidebar-left">
          <div className="app-branding"><h1 className="app-logo">Hero Match</h1></div>
          <Stats mistakes={mistakes} pairs={pairs} total={HEROES.length} status={status} coins={coins} net={net} bet={bet} pot={potLeft} profit={profit}/>
        </aside>
        <main className="game-area">
          <GameBoard deck={deck} onFlip={handleFlip} isActive={status === 'ACTIVE'} isResolving={resolving} status={status} msg={msg} onClose={restart}/>
        </main>
        <aside className="sidebar-right">
          <Controls onStart={startRound} onWithdraw={withdraw} onPurchase={buyCoins} canStart={canStart} isResolving={resolving} status={status} coins={coins} bet={bet} setBet={(v) => setBet(Math.min(Math.max(MIN_BET, v), MAX_BET))} purchase={purchase} setPurchase={(v) => setPurchase(Math.min(Math.max(MIN_BET, v), MAX_PURCHASE))}/>
          <Log logs={logs}/>
        </aside>
      </div>
    </div>
  )
}

export default App