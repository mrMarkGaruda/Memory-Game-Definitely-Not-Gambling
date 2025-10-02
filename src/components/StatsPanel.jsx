export function StatsPanel({ mistakes, pairsFound, totalPairs, status, coins, spent, withdrawn, net, betAmount, potPerPair, houseFee, potRemaining }) {
  return (
    <div className="panel panel--stats" aria-label="Round and account statistics">
      <h2 className="panel__title">Stats</h2>
      <ul className="stat-list">
        <li><span className="stat-label">Pairs</span><span className="stat-value">{pairsFound}/{totalPairs}</span></li>
        <li><span className="stat-label">Mistakes</span><span className="stat-value">{mistakes}</span></li>
        <li><span className="stat-label">Status</span><span className="stat-value">{status}</span></li>
        <li><span className="stat-label">Bet</span><span className="stat-value">{betAmount}</span></li>
  <li><span className="stat-label">Per Match</span><span className="stat-value">{potPerPair}</span></li>
  <li><span className="stat-label">House Fee</span><span className="stat-value">{houseFee}</span></li>
  <li><span className="stat-label">Pot Left</span><span className="stat-value">{potRemaining}</span></li>
      </ul>
      <div className="divider" />
      <ul className="stat-list">
        <li><span className="stat-label">Coins</span><span className="stat-value">{coins}</span></li>
        <li><span className="stat-label">Spent</span><span className="stat-value">${spent.toFixed(2)}</span></li>
        <li><span className="stat-label">Withdrawn</span><span className="stat-value">${withdrawn.toFixed(2)}</span></li>
        <li><span className="stat-label">Net</span><span className={`stat-value ${net >= 0 ? 'positive' : 'negative'}`}>${net.toFixed(2)}</span></li>
      </ul>
      <p className="tiny-note">Exchange: 1 coin = $0.01. Fair 1:1 economy.</p>
    </div>
  )
}

export default StatsPanel
