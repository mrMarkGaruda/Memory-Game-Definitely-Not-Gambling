export function Controls({
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
  coinToDollarRate
}) {
  return (
    <div className="panel panel--controls" aria-label="Game controls & economy">
      <div className="panel__section">
        <h2 className="panel__title">Round</h2>
        <label className="field">
          <span className="field__label">Bet Amount</span>
          <input
            type="number"
            min={minBet}
            step={minBet}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(minBet, Number(e.target.value) || minBet))}
            className="field__input"
            aria-label="Bet amount in coins"
          />
        </label>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onStart}
            disabled={!canStart || isResolving}
            aria-disabled={!canStart || isResolving}
            aria-label={gameStatus === 'playing' ? `Restart round. Costs ${betAmount} coins` : `Start round. Costs ${betAmount} coins`}
          >
            {gameStatus === 'playing' ? `Restart (-${betAmount})` : `Start (-${betAmount})`}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onWithdraw}
            disabled={coins === 0}
            aria-disabled={coins === 0}
          >Withdraw All</button>
        </div>
      </div>
      <div className="panel__section">
        <h3 className="subheading">Buy Coins (1:1)</h3>
        <div className="flex-row">
          <label className="field field--inline">
            <span className="field__label">Amount</span>
            <input
              type="number"
              min={minBet}
              step={minBet}
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(Math.max(minBet, Number(e.target.value) || minBet))}
              className="field__input"
              aria-label="Purchase amount in coins"
            />
          </label>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onPurchase(purchaseAmount)}
          >Buy (+{purchaseAmount})
          </button>
        </div>
        <p className="tiny-note">Cost: {(purchaseAmount * coinToDollarRate).toFixed(2)} USD at {coinToDollarRate.toFixed(2)} $/coin.</p>
      </div>
    </div>
  )
}

export default Controls
