function Card({ card, isActive, onFlip, boardLocked }) {
  const disabled = isActive || card.isMatched || boardLocked
  return (
    <button
      type="button"
      className={`card ${card.isMatched ? 'card--matched' : ''} ${isActive ? 'card--flipped' : ''}`}
      onClick={onFlip}
      disabled={disabled}
      aria-label={card.isMatched ? `${card.name} matched` : `Hidden card`}
    >
      <span className="card__face card__face--front">
        {card.symbol} <span>{card.name}</span>
      </span>
      <span className="card__face card__face--back">?</span>
    </button>
  )
}

export function GameBoard({ deck, onFlip, isActive, isResolving }) {
  return (
    <div className="board" aria-live="polite" aria-label="Card board">
      {deck.map((card, index) => (
        <Card
          key={card.id}
          card={card}
          isActive={card.isFlipped || card.isMatched}
          boardLocked={!isActive || isResolving}
          onFlip={() => isActive && onFlip(index)}
        />
      ))}
      {!isActive && (
        <div className="board-overlay" aria-hidden="true">
          <p>Start a round to play</p>
        </div>
      )}
    </div>
  )
}

export default GameBoard
