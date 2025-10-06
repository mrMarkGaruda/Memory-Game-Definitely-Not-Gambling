import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

// --- Constants ------------------------------------------------------------
const HEROES = [
  { name: 'Lucky Lynx', symbol: '🃏', color: '#ffc966' },
  { name: 'Fortune Fox', symbol: '🦊', color: '#ff5b7c' },
  { name: 'Roulette Raven', symbol: '🦅', color: '#44e28f' },
  { name: 'Spin Shark', symbol: '🦈', color: '#7694ff' },
  { name: 'Dice Dragon', symbol: '🐉', color: '#ff8c3a' },
  { name: 'Jackpot Jackal', symbol: '🎰', color: '#e244ff' },
]
const TOTAL_PAIRS = HEROES.length
// Economy
const COIN_TO_DOLLAR_RATE = 0.01 // 1 coin = $0.01
const INITIAL_COINS = 1000 // $10
const MIN_BET = 50
const MAX_BET = 1000000
const MAX_PURCHASE = 10000000
const HOUSE_FEE_RATE = 0.02 // 2% house fee per round
const MAX_MISTAKES = 12 // Auto-lose at 12 mistakes
const BREAK_EVEN_MISTAKES = 6 // Break even at 6 mistakes
const PERFECT_WIN_MULTIPLIER = 2 // 2x bet (double money) with 0 mistakes
const MAX_LOG_ENTRIES = 250 // Limit log history for performance

// Calculate payout multiplier based on mistakes (linear scaling)
// 0 mistakes = 2x (double), 6 mistakes = 1x (break even), 12+ mistakes = 0x (lose all)
const calculatePayoutMultiplier = (mistakes) => {
  if (mistakes >= MAX_MISTAKES) return 0 // Auto-lose
  if (mistakes <= 0) return PERFECT_WIN_MULTIPLIER // Perfect win
  // Linear interpolation: 2.0 at 0 mistakes, 1.0 at 6 mistakes, 0.0 at 12 mistakes
  return Math.max(0, PERFECT_WIN_MULTIPLIER - (mistakes * (PERFECT_WIN_MULTIPLIER / MAX_MISTAKES)))
}

// --- Utilities --------------------------------------------------------------

// Fisher-Yates (Knuth) Shuffle for deck randomization
const shuffle = (array) => {
  let currentIndex = array.length
  let randomIndex

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }
  return array
}

const createDeck = () =>
  HEROES.flatMap((hero) => [
    { id: `${hero.name}-a`, pairId: hero.name, ...hero, isFlipped: false, isMatched: false, focusable: true },
    { id: `${hero.name}-b`, pairId: hero.name, ...hero, isFlipped: false, isMatched: false, focusable: true },
  ])

const formatCurrency = (amount) => amount.toLocaleString('en-US')
const toDollars = (coins) => (coins * COIN_TO_DOLLAR_RATE).toFixed(2)

// --- Components --------------------------------------------------------------

/**
 * Global Error Boundary component
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback" role="alert" aria-live="assertive">
          <h1>An unexpected error occurred.</h1>
          <p>We're sorry for the inconvenience. Please try refreshing the page.</p>
          <pre>{this.state.error.toString()}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Single Card component with flip animation and accessibility
 */
const Card = React.memo(({ card, onFlip, isActive }) => {
  const { id, symbol, color, isFlipped, isMatched, pairId } = card
  const cardRef = useRef(null)

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (isActive && !isFlipped && !isMatched) {
          onFlip(id)
        }
      }
    },
    [isActive, isFlipped, isMatched, onFlip, id]
  )

  const handleClick = useCallback(() => {
    if (isActive && !isFlipped && !isMatched) {
      onFlip(id)
    }
  }, [isActive, isFlipped, isMatched, onFlip, id])

  return (
    <div
      className={`card-container ${isFlipped ? 'flipped' : ''} ${isMatched ? 'matched' : ''}`}
      aria-label={`${isFlipped ? 'Flipped' : 'Covered'} card for ${pairId}`}
      role="button"
      tabIndex={isActive && !isFlipped && !isMatched ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={cardRef}
      style={isMatched ? { '--matched-color': color } : {}}
    >
      <div className="card-flipper">
        <div className="card-front" aria-hidden={isFlipped}>
          {isMatched ? (
            <span className="card-check">✅</span>
          ) : (
            <svg className="card-question-mark" viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M50 10C32.5 10 20 22.5 20 40C20 42.5 22 44.5 24.5 44.5C27 44.5 29 42.5 29 40C29 27.5 37.5 19 50 19C62.5 19 71 27.5 71 40C71 48 66 54 58 58C52 61 46 66 46 75V80C46 82.5 48 84.5 50.5 84.5C53 84.5 55 82.5 55 80V75C55 70 58 67 63 64C73 59 80 51 80 40C80 22.5 67.5 10 50 10Z"
                fill="currentColor"
              />
              <circle cx="50" cy="110" r="10" fill="currentColor" />
            </svg>
          )}
        </div>
        <div className="card-back" aria-hidden={!isFlipped} style={{ backgroundColor: color }}>
          <span className="card-symbol">{symbol}</span>
        </div>
      </div>
    </div>
  )
})

/**
 * Game Board component
 */
const GameBoard = ({ deck, onFlip, isActive, isResolving, gameStatus, overlayMessage, onOverlayClose }) => {
  return (
    <div className="game-board-container" role="grid" aria-label="Memory Game Board">
      <div className="game-board-grid">
        {deck.map((card) => (
          <Card key={card.id} card={card} onFlip={onFlip} isActive={isActive && !isResolving} />
        ))}
      </div>
      {gameStatus === 'WON' && (
        <RoundOverlay message={overlayMessage} type="win" onAction={onOverlayClose} />
      )}
      {gameStatus === 'LOST' && (
        <RoundOverlay message={overlayMessage} type="lose" onAction={onOverlayClose} />
      )}
    </div>
  )
}

/**
 * Round Completion Overlay
 */
const RoundOverlay = ({ message, type, onAction }) => {
  const isWin = type === 'win'
  const styleClass = isWin ? 'win-overlay' : 'lose-overlay'
  const buttonText = isWin ? 'Start Next Round' : 'Try Again'

  return (
    <div className="round-overlay-backdrop">
      <div className={`round-overlay-card ${styleClass}`} role="dialog" aria-modal="true" aria-labelledby="overlay-title">
        <h2 id="overlay-title" className="overlay-title">
          {isWin ? '🔥 VICTORY! 🔥' : '😔 GAME OVER 😔'}
        </h2>
        <p className="overlay-message">{message}</p>
        <button
          className={`overlay-button ${isWin ? 'button-win' : 'button-lose'}`}
          onClick={onAction}
          autoFocus
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

/**
 * Game Controls component
 */
const Controls = ({
  onStart,
  onWithdraw,
  onPurchase,
  canStart,
  isResolving,
  gameStatus,
  coins,
  betAmount,
  setBetAmount,
  minBet,
  purchaseAmount,
  setPurchaseAmount,
  coinToDollarRate,
}) => {
  const isGameActive = gameStatus === 'ACTIVE'

  return (
    <div className="controls-panel">
      <h2 className="panel-title">Game Controls</h2>

      {/* 1. Start/Restart Round */}
      <div className="control-group">
        <p className="control-label">Bet Amount (Coins):</p>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(parseInt(e.target.value) || minBet)}
          min={minBet}
          max={MAX_BET}
          step={50}
          className="control-input"
          disabled={isGameActive || isResolving}
          aria-label="Round Bet Amount"
        />
        <button
          className="control-button button-accent"
          onClick={onStart}
          disabled={!canStart || isResolving || isGameActive}
        >
          {isGameActive ? 'Game in Progress...' : 'Start New Round'}
        </button>
        {betAmount < minBet && (
          <p className="input-feedback-error">Min bet is {formatCurrency(minBet)} Coins.</p>
        )}
        {betAmount > coins && (
          <p className="input-feedback-error">Not enough coins for this bet!</p>
        )}
      </div>

      <hr className="control-divider" />

      {/* 2. Buy More Coins */}
      <div className="control-group">
        <p className="control-label">Purchase Coins:</p>
        <input
          type="number"
          value={purchaseAmount}
          onChange={(e) => setPurchaseAmount(parseInt(e.target.value) || minBet)}
          min={minBet}
          max={MAX_PURCHASE}
          step={100}
          className="control-input"
          aria-label="Coin Purchase Amount"
        />
        <button
          className="control-button button-positive"
          onClick={() => onPurchase(purchaseAmount)}
          disabled={purchaseAmount < minBet}
        >
          Buy {formatCurrency(purchaseAmount)} Coins (${toDollars(purchaseAmount)})
        </button>
        {purchaseAmount < minBet && (
          <p className="input-feedback-error">Min purchase is {formatCurrency(minBet)} Coins.</p>
        )}
      </div>

      <hr className="control-divider" />

      {/* 3. Withdraw */}
      <div className="control-group">
        <p className="control-label">Cash Out:</p>
        <button className="control-button button-negative" onClick={onWithdraw} disabled={isGameActive || isResolving}>
          Withdraw All Cash ($
          {toDollars(coins)})
        </button>
      </div>
    </div>
  )
}

/**
 * Minimal Stats Sidebar component
 */
const StatsSidebar = ({
  mistakes,
  pairsFound,
  totalPairs,
  status,
  coins,
  net,
  betAmount,
  potRemaining,
  profit,
}) => {
  return (
    <div className="stats-sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">Game Stats</h3>
        <div className="stat-row">
          <span className="stat-label">Status</span>
          <span className={`stat-value status-${status.toLowerCase()}`}>{status}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Pairs</span>
          <span className="stat-value text-positive">{pairsFound}/{totalPairs}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Mistakes</span>
          <span className="stat-value text-negative">{mistakes}</span>
        </div>
      </div>

      <div className="sidebar-section sidebar-highlight">
        <h3 className="sidebar-title">💰 Balance</h3>
        <div className="stat-value-large stat-coins">{formatCurrency(coins)}</div>
        <div className="stat-subtext">${toDollars(coins)}</div>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">Current Round</h3>
        <div className="stat-row">
          <span className="stat-label">� Bet</span>
          <span className="stat-value">{formatCurrency(betAmount)}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">🏆 Win</span>
          <span className="stat-value text-positive">+{formatCurrency(profit)}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">🎁 Pot Left</span>
          <span className="stat-value text-accent">{formatCurrency(potRemaining)}</span>
        </div>
      </div>

      <div className={`sidebar-section ${net >= 0 ? 'sidebar-profit' : 'sidebar-loss'}`}>
        <h3 className="sidebar-title">📊 Net P/L</h3>
        <div className={`stat-value-large ${net >= 0 ? 'text-positive' : 'text-negative'}`}>
          {net >= 0 ? '+' : ''}{formatCurrency(net)}
        </div>
        <div className={`stat-subtext ${net >= 0 ? 'text-positive' : 'text-negative'}`}>
          {net >= 0 ? '+' : ''}${toDollars(net)}
        </div>
      </div>
    </div>
  )
}

/**
 * Action Log component - Reimagined with event-based filtering
 */
const ActionLog = ({ logs }) => {
  // Group and filter logs to show only the most important events
  const importantLogs = useMemo(() => {
    const filtered = []
    const seen = new Set()
    
    // Process logs in reverse (newest first) to avoid duplicates
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i]
      
      // Create a unique key based on message content and timestamp proximity
      // This prevents showing duplicate events that happen in the same second
      const timeKey = Math.floor(new Date(`2000-01-01 ${log.timestamp}`).getTime() / 1000)
      const eventKey = `${log.type}-${timeKey}`
      
      // Only show critical event types
      const isCritical = ['bet', 'win', 'purchase', 'withdraw', 'system'].includes(log.type)
      
      if (isCritical && !seen.has(eventKey)) {
        seen.add(eventKey)
        filtered.push(log) // Keep newest first order
      }
    }
    
    // Return only last 6 critical events (already in newest-first order)
    return filtered.slice(0, 6)
  }, [logs])

  return (
    <div className="log-panel-compact">
      <h3 className="log-title-compact">Key Events</h3>
      <div className="log-window-compact" role="log" aria-live="polite">
        {importantLogs.length === 0 ? (
          <div className="log-empty">
            <span className="log-empty-icon">📋</span>
            <p>No events yet. Start a round!</p>
          </div>
        ) : (
          importantLogs.map((log, index) => (
            <div key={`${log.timestamp}-${index}`} className={`log-entry-compact log-${log.type}`}>
              <div className="log-header">
                <span className="log-timestamp-compact">{log.timestamp}</span>
                <span className={`log-icon log-icon-${log.type}`}>
                  {log.type === 'win' ? '✅' : log.type === 'bet' ? '🎲' : log.type === 'purchase' ? '💰' : log.type === 'withdraw' ? '�' : log.type === 'system' ? '⚡' : 'ℹ️'}
                </span>
              </div>
              <p className="log-message-compact">{log.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// --- Main App Component -----------------------------------------------------

function App() {
  const [coins, setCoins] = useState(INITIAL_COINS)
  const [realMoneySpent, setRealMoneySpent] = useState(0) // Tracks total coins purchased
  const [withdrawnCash, setWithdrawnCash] = useState(0) // Tracks total coins withdrawn
  const [betAmount, setBetAmount] = useState(MIN_BET)
  const [purchaseAmount, setPurchaseAmount] = useState(MIN_BET)

  const [deck, setDeck] = useState(shuffle(createDeck()))
  const [flippedCards, setFlippedCards] = useState([]) // Stores up to 2 cards {id, pairId}
  const [pairsFound, setPairsFound] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [isResolving, setIsResolving] = useState(false) // Blocks flips during match/mismatch resolution
  const [gameStatus, setGameStatus] = useState('IDLE') // IDLE, ACTIVE, WON, LOST

  const [logs, setLogs] = useState([])

  // Refs to prevent duplicate logs
  const lastLogRef = useRef({ message: '', timestamp: 0 })
  const roundStartedRef = useRef(false)

  // Derived state calculations
  const netResult = useMemo(() => coins - INITIAL_COINS - realMoneySpent + withdrawnCash, [
    coins,
    realMoneySpent,
    withdrawnCash,
  ])
  const canStart = coins >= betAmount && betAmount >= MIN_BET
  const isBoardActive = gameStatus === 'ACTIVE'

  // Round Economy Calculations
  const houseFee = useMemo(() => Math.floor(betAmount * HOUSE_FEE_RATE), [betAmount])
  
  // Calculate payout multiplier based on current mistakes
  const payoutMultiplier = useMemo(() => calculatePayoutMultiplier(mistakes), [mistakes])
  
  // Total payout changes dynamically based on mistakes
  const totalPayout = useMemo(() => Math.floor(betAmount * payoutMultiplier), [betAmount, payoutMultiplier])
  
  // Profit is what you win minus your bet
  const profit = useMemo(() => Math.max(0, totalPayout - betAmount), [totalPayout, betAmount])
  
  const potPerPair = useMemo(() => Math.floor(totalPayout / TOTAL_PAIRS), [totalPayout])
  const potRemaining = useMemo(() => potPerPair * (TOTAL_PAIRS - pairsFound), [potPerPair, pairsFound])

  // Utility function to add a log entry with deduplication
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const now = Date.now()
    
    // Prevent duplicate logs within 500ms with same message
    if (lastLogRef.current.message === message && now - lastLogRef.current.timestamp < 500) {
      return
    }
    
    lastLogRef.current = { message, timestamp: now }
    
    setLogs((prevLogs) => {
      const newLogs = [...prevLogs, { timestamp, message, type }]
      // Keep only last 50 logs for performance
      if (newLogs.length > 50) {
        return newLogs.slice(-50)
      }
      return newLogs
    })
  }, [])

  /**
   * Initial Setup & Reset
   */
  useEffect(() => {
    // Initial log - only run once on mount
    addLog(`💎 Welcome! Starting balance: ${formatCurrency(INITIAL_COINS)} coins ($${toDollars(INITIAL_COINS)})`, 'system')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Core Game Logic: Handle Card Flip
   */
  const handleFlip = useCallback(
    (cardId) => {
      if (isResolving || gameStatus !== 'ACTIVE') return

      setDeck((prevDeck) =>
        prevDeck.map((card) => (card.id === cardId ? { ...card, isFlipped: true } : card))
      )

      const flippedCard = deck.find((c) => c.id === cardId)
      if (flippedCard) {
        setFlippedCards((prevFlipped) => {
          if (prevFlipped.length < 2) {
            return [...prevFlipped, { id: cardId, pairId: flippedCard.pairId }]
          }
          return prevFlipped
        })
      }
    },
    [isResolving, gameStatus, deck]
  )

  /**
   * Match/Mismatch Resolution Effect
   */
  useEffect(() => {
    if (flippedCards.length === 2) {
      const [card1, card2] = flippedCards
      const isMatch = card1.pairId === card2.pairId
      setIsResolving(true)

      const resolveTimeout = setTimeout(() => {
        if (isMatch) {
          // --- MATCH FOUND ---
          setDeck((prevDeck) =>
            prevDeck.map((card) =>
              card.id === card1.id || card.id === card2.id ? { ...card, isMatched: true, isFlipped: true } : card
            )
          )
          setPairsFound((prevPairs) => prevPairs + 1)
          setCoins((prevCoins) => prevCoins + potPerPair)
          // Only log match, not balance update (shows in header)
        } else {
          // --- MISMATCH ---
          setDeck((prevDeck) =>
            prevDeck.map((card) =>
              card.id === card1.id || card.id === card2.id ? { ...card, isFlipped: false } : card
            )
          )
          setMistakes((prevMistakes) => prevMistakes + 1)
          // Don't log every mismatch - too noisy
        }

        // Cleanup
        setFlippedCards([])
        setIsResolving(false)
      }, 1000) // 1 second delay to view result

      return () => clearTimeout(resolveTimeout)
    }
  }, [flippedCards, potPerPair])

  /**
   * Win/Loss Condition Check Effect
   */
  useEffect(() => {
    if (gameStatus !== 'ACTIVE') return

    if (pairsFound === TOTAL_PAIRS) {
      // WIN - Give back the FULL payout (including remainder from rounding)
      const fullPotWinnings = totalPayout - (potPerPair * pairsFound) // Calculate any remainder
      if (fullPotWinnings > 0) {
        setCoins(prevCoins => {
          const newCoins = prevCoins + fullPotWinnings
          addLog(`🎉 ROUND WON! Collected final pot: ${formatCurrency(fullPotWinnings)} coins. Total won: ${formatCurrency(totalPayout)} coins!`, 'win')
          return newCoins
        })
      }
      setGameStatus('WON')
      addLog(`✨ Perfect! You matched all ${TOTAL_PAIRS} pairs and won ${formatCurrency(totalPayout)} coins ($${toDollars(totalPayout)}) - that's +${formatCurrency(profit)} profit!`, 'system')
      return
    }

    if (mistakes >= TOTAL_PAIRS * 2) { // Example loss condition: more mistakes than total cards
        // Refund remaining pot base if loss condition met
        setCoins(prevCoins => {
            const refund = potRemaining;
            const newCoins = prevCoins + refund;
            addLog(`💔 Round LOST (${mistakes} mistakes). Refunded ${formatCurrency(refund)} coins from remaining pot.`, 'system');
            return newCoins;
        });
        setGameStatus('LOST')
        addLog(`� House keeps ${formatCurrency(houseFee)} coins fee. Better luck next time!`, 'system')
    }
  }, [pairsFound, mistakes, gameStatus, potRemaining, addLog, totalPayout, potPerPair, houseFee, profit])

  /**
   * Round Management Handlers
   */
  const handleStartRound = useCallback(() => {
    if (!canStart) {
      return
    }

    // 1. Deduct Bet
    setCoins((prevCoins) => prevCoins - betAmount)
    addLog(`🎲 Round Started - Bet: ${formatCurrency(betAmount)} coins. Win: ${formatCurrency(totalPayout)} coins (+${formatCurrency(profit)} profit)`, 'bet')

    // 2. Reset Game State
    setFlippedCards([])
    setPairsFound(0)
    setMistakes(0)
    setIsResolving(false)
    setGameStatus('ACTIVE')
    setDeck(shuffle(createDeck()))
    roundStartedRef.current = true
  }, [betAmount, canStart, totalPayout, profit, addLog])

  const handlePurchase = useCallback(
    (amount) => {
      const amountToBuy = Math.min(Math.max(MIN_BET, amount), MAX_PURCHASE)
      setCoins((prevCoins) => prevCoins + amountToBuy)
      setRealMoneySpent((prevSpent) => prevSpent + amountToBuy)
      addLog(`💰 Purchased ${formatCurrency(amountToBuy)} coins ($${toDollars(amountToBuy)})`, 'purchase')
    },
    [addLog]
  )

  const handleWithdrawAll = useCallback(() => {
    const cashOut = coins
    setWithdrawnCash((prevWithdrawn) => prevWithdrawn + cashOut)
    addLog(`💸 Withdrew ${formatCurrency(cashOut)} coins ($${toDollars(cashOut)})`, 'withdraw')
    setCoins(0)
    setBetAmount(MIN_BET) // Reset bet to min since coins are 0
  }, [coins, addLog])

  const handleRestartAfterResolution = useCallback(() => {
    setGameStatus('IDLE')
    roundStartedRef.current = false
    // A fresh deck will be loaded on the next 'Start New Round'
  }, [])

  // Determine overlay message
  const overlayMessage =
    gameStatus === 'WON'
      ? `You won ${formatCurrency(totalPayout)} coins ($${toDollars(totalPayout)}) - that's +${formatCurrency(profit)} profit! House kept ${formatCurrency(houseFee)} coins fee.`
      : `You lost with ${mistakes} mistakes. ${formatCurrency(potRemaining)} coins were refunded. House kept ${formatCurrency(houseFee)} coins fee.`

  return (
    <ErrorBoundary>
      <div className="app-container">
        <div className="app-main">
          {/* Left Sidebar - Stats */}
          <aside className="sidebar-left">
            <div className="app-branding">
              <h1 className="app-logo">🎴 Hero Match</h1>
            </div>
            <StatsSidebar
              mistakes={mistakes}
              pairsFound={pairsFound}
              totalPairs={TOTAL_PAIRS}
              status={gameStatus}
              coins={coins}
              net={netResult}
              betAmount={betAmount}
              potRemaining={potRemaining}
              profit={profit}
            />
          </aside>

          {/* Center - Game Board */}
          <main className="game-area">
            <GameBoard
              deck={deck}
              onFlip={handleFlip}
              isActive={isBoardActive}
              isResolving={isResolving}
              gameStatus={gameStatus}
              overlayMessage={overlayMessage}
              onOverlayClose={handleRestartAfterResolution}
            />
          </main>

          {/* Right Sidebar - Controls & Logs */}
          <aside className="sidebar-right">
            <Controls
              onStart={handleStartRound}
              onWithdraw={handleWithdrawAll}
              onPurchase={handlePurchase}
              canStart={canStart}
              isResolving={isResolving}
              gameStatus={gameStatus}
              coins={coins}
              betAmount={betAmount}
              setBetAmount={(v) => setBetAmount(Math.min(Math.max(MIN_BET, v), MAX_BET))}
              minBet={MIN_BET}
              purchaseAmount={purchaseAmount}
              setPurchaseAmount={(v) =>
                setPurchaseAmount(Math.min(Math.max(MIN_BET, v), MAX_PURCHASE))
              }
              coinToDollarRate={COIN_TO_DOLLAR_RATE}
            />
            <ActionLog logs={logs} />
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  )
}

// NOTE: We wrap the final component for export inside an ErrorBoundary to match the original main.jsx
export default App
