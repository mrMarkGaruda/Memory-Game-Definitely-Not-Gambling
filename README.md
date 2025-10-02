# Memory Game: Definitely Not Gambling

A high-roller themed memory experience that pairs quick card-matching rounds with a full chip-tracking overlay. Flip pairs, watch the bankroll move, buy back into the action, and cash out virtual winnings whenever you like.

## Core Features

- 🎴 Classic 6-pair memory board with smooth flip animations and instant feedback.
- 💸 Virtual chip economy with fair 1:1 cash-out rates—chips in equal dollars out.
- 🛒 Dedicated cage to top up your stack with multiple chip-pack options.
- 🏦 Cashier window to withdraw the entire stack using the active conversion rate.
- 🧾 Real-time action log capturing every buy-in, match, miss, and withdrawal.
- 📊 Live dashboard covering chip balance, cash spend, withdrawals, and round stats.

## Getting Started

```bash
npm install
npm run dev
```

Open the printed local URL in your browser. Hit **Start Round** to cover the buy-in, flip cards to lock in matches, and monitor how the balance responds.

## Available Scripts

- `npm run dev` – start a hot-reloading development server.
- `npm run build` – generate an optimized production bundle.
- `npm run preview` – serve the production build locally for smoke tests.
- `npm run lint` – run ESLint using the project configuration.

## Project Structure

- `src/App.jsx` – main game logic, UI state, and coin economy.
- `src/App.css` – layout, board styling, and flip effects.
- `src/index.css` – global typography, background, and button defaults.

## Deployment

Deploy the project to any static hosting provider (Vercel, Netlify, Render, etc.). Run `npm run build` and upload the contents of the `dist` folder. 

---

All currency inside the app is virtual. Exchange rate: 130 coins = $1.
