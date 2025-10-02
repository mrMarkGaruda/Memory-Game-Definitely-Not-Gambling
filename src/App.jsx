import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ActionLog from './components/ActionLog.jsx'
import Controls from './components/Controls.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import GameBoard from './components/GameBoard.jsx'

// --- Constants ------------------------------------------------------------
const HEROES = [
  { name: 'Lucky Lynx', symbol: '🃏' },
  { name: 'Fortune Fox', symbol: '🦊' },
  { name: 'Roulette Raven', symbol: '🦅' },
  { name: 'Spin Shark', symbol: '🦈' },
  { name: 'Dice Dragon', symbol: '🐉' },
  { name: 'Jackpot Jackal', symbol: '🟥' },
]
const TOTAL_PAIRS = HEROES.length
// Economy (refined fairness system)
const COIN_TO_DOLLAR_RATE = 0.01 // 1 coin = $0.01
const INITIAL_COINS = 1000 // $10
const INITIAL_SPENT_DOLLARS = 10
const MIN_BET = 50
const MAX_BET = 1000000
const MAX_PURCHASE = 10000000
const HOUSE_FEE_RATE = 0.02 // 2% house fee per round

const createDeck = () =>
  HEROES.flatMap((hero) => [
    { id: `${hero.name}-a`, pairId: hero.name, ...hero, isFlipped: false, isMatched: false },
    { id: `${hero.name}-b`, pairId: hero.name, ...hero, isFlipped: false, isMatched: false },
  ]).sort(() => Math.random() - 0.5)

// --- Main Component -------------------------------------------------------
function App() {
  const [deck, setDeck] = useState(createDeck)
  const [flippedIndexes, setFlippedIndexes] = useState([])
  const [isResolving, setIsResolving] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const [pairsFound, setPairsFound] = useState(0)
  const [gameStatus, setGameStatus] = useState('idle')
  const [coins, setCoins] = useState(INITIAL_COINS)
  const [realMoneySpent, setRealMoneySpent] = useState(INITIAL_SPENT_DOLLARS)
  const [withdrawnCash, setWithdrawnCash] = useState(0)
  const [betAmount, setBetAmount] = useState(300)
  const [purchaseAmount, setPurchaseAmount] = useState(500)
  const [potPerPair, setPotPerPair] = useState(0)
  const [potRemainder, setPotRemainder] = useState(0)
  const [potRemaining, setPotRemaining] = useState(0)
  const [houseFee, setHouseFee] = useState(0)
  const performanceAppliedRef = useRef(false)
  const [logs, setLogs] = useState(() => [
    {
      type: 'system',
      message: 'Session started. 1000 coins seeded for $10. 1 coin = $0.01. Deposits & withdrawals 1:1.',
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const resolveTimeout = useRef(null)

  const addLog = useCallback((entry, type = 'system') => {
    setLogs((prev) => [
      {
        type,
        message: entry,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ].slice(0, 250))
  }, [])

  // Formatting helpers
  const fmtCoins = useCallback((n) => new Intl.NumberFormat('en-US').format(n), [])
  const fmtUSD = useCallback((n) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), [])

  const netResult = useMemo(
    () => Number((withdrawnCash - realMoneySpent).toFixed(2)),
    [withdrawnCash, realMoneySpent]
  )

  // Cleanup on unmount
  useEffect(() => () => {
    if (resolveTimeout.current) window.clearTimeout(resolveTimeout.current)
  }, [])

  // Round completion detection
  useEffect(() => {
    if (gameStatus === 'playing' && pairsFound === TOTAL_PAIRS) {
      setGameStatus('finished')
      setCoins((prev) => {
        let credit = 0
        if (potRemaining > 0) {
          credit += potRemaining // includes remainder (and any unmatched leftover safety)
          addLog(`Unclaimed pot remainder returned +${fmtCoins(potRemaining)}.`, 'transaction')
        }
        if (!performanceAppliedRef.current && mistakes <= 2) {
          const perf = Math.round(betAmount * 0.05)
          if (perf > 0) {
            credit += perf
            performanceAppliedRef.current = true
            addLog(`Performance bonus +${fmtCoins(perf)} (≤2 mistakes).`, 'match')
          }
        }
        if (credit > 0) addLog(`End round credit +${fmtCoins(credit)}.`, 'transaction')
        return prev + credit
      })
      const ratingEmoji = mistakes <= 2 ? '😎' : mistakes <= 5 ? '🙂' : '😬'
      addLog(`Round complete. Mistakes: ${mistakes}. Performance: ${ratingEmoji}.`, 'game')
    }
  }, [pairsFound, mistakes, gameStatus, addLog, potRemaining, betAmount])

  const handleStartRound = () => {
    if (resolveTimeout.current) {
      window.clearTimeout(resolveTimeout.current)
      resolveTimeout.current = null
    }

    let adjustedBet = Math.min(betAmount, coins, MAX_BET)
    if (adjustedBet !== betAmount) {
      setBetAmount(adjustedBet)
    }
    if (coins < adjustedBet || adjustedBet < MIN_BET) {
      addLog(`Cannot start. Bet must be between ${MIN_BET} and your balance (${coins}).`, 'system')
      return
    }

    performanceAppliedRef.current = false
    const prevCoins = coins
    const fee = Math.floor(adjustedBet * HOUSE_FEE_RATE)
    const potValue = adjustedBet - fee
    const perPair = Math.floor(potValue / TOTAL_PAIRS)
    const remainder = potValue - perPair * TOTAL_PAIRS
    setCoins((p) => p - adjustedBet)
    setHouseFee(fee)
    setPotPerPair(perPair)
    setPotRemainder(remainder)
    setPotRemaining(potValue)
    addLog(`Round started. Bet -${fmtCoins(adjustedBet)} (${fmtCoins(prevCoins)} → ${fmtCoins(prevCoins - adjustedBet)}).`, 'transaction')
    if (fee > 0) addLog(`House fee withheld ${fmtCoins(fee)} (${(HOUSE_FEE_RATE*100).toFixed(1)}%).`, 'system')
    addLog(`Pot ${fmtCoins(potValue)}: per pair ${fmtCoins(perPair)}${remainder ? `, remainder ${fmtCoins(remainder)}` : ''}.`, 'game')

    setDeck(createDeck())
  addLog(`Deck shuffled. ${TOTAL_PAIRS} pairs in play.`, 'game')

    setFlippedIndexes([])
    setIsResolving(false)
    setMistakes(0)
    setPairsFound(0)
    setGameStatus('playing')
    addLog('Round active. Match pairs to drain pot; remainder + bonus awarded at end.', 'game')
  }

  const handleFlip = (index) => {
    if (isResolving || flippedIndexes.includes(index) || deck[index].isMatched) {
      return
    }

    const card = deck[index]
    addLog(`Card flipped at position ${index + 1}: ${card.name} ${card.symbol}`, 'game')

    setDeck((prevDeck) =>
      prevDeck.map((card, i) => (i === index ? { ...card, isFlipped: true } : card))
    )
    const updatedFlipped = [...flippedIndexes, index]
    setFlippedIndexes(updatedFlipped)

    if (updatedFlipped.length === 2) {
      const [firstIndex, secondIndex] = updatedFlipped
      const firstCard = deck[firstIndex]
      const secondCard = deck[secondIndex]
      
      addLog(`Comparing cards: ${firstCard.name} vs ${secondCard.name}. Checking for match...`, 'game')
      setIsResolving(true)

      if (resolveTimeout.current) {
        window.clearTimeout(resolveTimeout.current)
      }

      resolveTimeout.current = window.setTimeout(() => {
        setDeck((prevDeck) => {
          const firstCard = prevDeck[firstIndex]
          const secondCard = prevDeck[secondIndex]

          if (!firstCard || !secondCard) {
            return prevDeck
          }

          if (firstCard.pairId === secondCard.pairId) {
            setPairsFound((prev) => {
              const newCount = prev + 1
              addLog(`Match: ${firstCard.name}. (${newCount}/${TOTAL_PAIRS})`, 'match')
              // Reward only if pot has enough (StrictMode duplicate guard)
              setPotRemaining((prevRemain) => {
                if (prevRemain >= potPerPair) {
                  setCoins((prevCoins) => prevCoins + potPerPair)
                  addLog(`Reward +${fmtCoins(potPerPair)}. Pot left ${fmtCoins(prevRemain - potPerPair)}.`, 'transaction')
                  return prevRemain - potPerPair
                }
                addLog('Duplicate match detected – reward skipped (debug guard).', 'system')
                return prevRemain
              })
              return newCount
            })
            
            return prevDeck.map((card, i) =>
              i === firstIndex || i === secondIndex
                ? { ...card, isMatched: true, isFlipped: true }
                : card
            )
          }

          setMistakes((prev) => prev + 1)
          addLog(`Miss: ${firstCard.name} ≠ ${secondCard.name}.`, 'miss')
          addLog('Cards hidden again.', 'game')
          
          return prevDeck.map((card, i) =>
            i === firstIndex || i === secondIndex ? { ...card, isFlipped: false } : card
          )
        })

        setFlippedIndexes([])
        setIsResolving(false)
        resolveTimeout.current = null
      }, 900)
    }
  }

  const handlePurchase = (amount) => {
    if (amount <= 0) return
    const safeAmount = Math.min(amount, MAX_PURCHASE)
    if (safeAmount !== amount) setPurchaseAmount(safeAmount)
    const prevCoins = coins
    const prevSpent = realMoneySpent
    const dollars = safeAmount * COIN_TO_DOLLAR_RATE
    setCoins((p) => p + safeAmount)
    setRealMoneySpent((p) => Number((p + dollars).toFixed(2)))
    addLog(`Deposit: +${fmtCoins(safeAmount)} coins for ${fmtUSD(dollars)}.`, 'transaction')
    addLog(`Coins ${fmtCoins(prevCoins)} → ${fmtCoins(prevCoins + safeAmount)}. Spent ${fmtUSD(prevSpent)} → ${fmtUSD(prevSpent + dollars)}.`, 'transaction')
  }

  const handleWithdrawAll = () => {
    if (coins === 0) {
      addLog('Withdrawal request denied: No coins available in balance to withdraw.', 'system')
      return
    }

    const cashOut = Number((coins * COIN_TO_DOLLAR_RATE).toFixed(2))
    const previousWithdrawn = withdrawnCash
    const coinsWithdrawn = coins
    
    addLog(`Withdrawal: ${fmtCoins(coinsWithdrawn)} coins → ${fmtUSD(cashOut)} (1:1).`, 'transaction')
    
    setCoins(0)
    setWithdrawnCash((prev) => Number((prev + cashOut).toFixed(2)))
    
    const newWithdrawn = Number((previousWithdrawn + cashOut).toFixed(2))
    const newNet = Number((newWithdrawn - realMoneySpent).toFixed(2))
    addLog(`Withdrawn total ${fmtUSD(previousWithdrawn)} → ${fmtUSD(newWithdrawn)}. Net now ${fmtUSD(newNet)}.`, 'system')
  }

  const isBoardActive = gameStatus === 'playing'
  const canStart = coins >= betAmount && betAmount >= MIN_BET

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Definitely Not Gambling</h1>
        <div className="header-metrics">
          <div className="metric"><span className="metric__label">Coins</span><span className="metric__value">{coins}</span></div>
          <div className="metric"><span className="metric__label">Spent</span><span className="metric__value">${realMoneySpent.toFixed(2)}</span></div>
            <div className="metric"><span className="metric__label">Withdrawn</span><span className="metric__value">${withdrawnCash.toFixed(2)}</span></div>
          <div className={`metric metric--net ${netResult >= 0 ? 'positive' : 'negative'}`}>
            <span className="metric__label">Net</span>
            <span className="metric__value">${netResult.toFixed(2)}</span>
          </div>
        </div>
      </header>
      <div className="app-grid">
        <div className="left-column">
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
            setPurchaseAmount={(v) => setPurchaseAmount(Math.min(Math.max(MIN_BET, v), MAX_PURCHASE))}
            coinToDollarRate={COIN_TO_DOLLAR_RATE}
          />
          <StatsPanel
            mistakes={mistakes}
            pairsFound={pairsFound}
            totalPairs={TOTAL_PAIRS}
            status={gameStatus}
            coins={coins}
            spent={realMoneySpent}
            withdrawn={withdrawnCash}
            net={netResult}
            betAmount={betAmount}
            potPerPair={potPerPair}
            houseFee={houseFee}
            potRemaining={potRemaining}
          />
        </div>
        <div className="center-column">
          <GameBoard
            deck={deck}
            onFlip={handleFlip}
            isActive={isBoardActive}
            isResolving={isResolving}
          />
        </div>
        <div className="right-column">
          <ActionLog logs={logs} />
        </div>
      </div>
    </div>
  )
}

export default App