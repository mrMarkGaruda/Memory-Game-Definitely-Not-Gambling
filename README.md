# Memory Game

This app is a flip-card matching game with a pretend coin balance.

## How it works

- Start a round to place a bet. The bet is taken from your coins.
- Flip two cards at a time. Matching pairs pay out coins from a fixed pot.
- After six mistakes the round ends and you lose the rest of the pot.
- You can buy more coins or withdraw all coins whenever you want.

## Run the app

```bash
npm run dev
```

## Files

- `src/App.jsx` has the game state, coin math, and layout.
- `src/App.css` has the styles for the board, cards, and panels.
- `src/index.css` has base fonts and button styles.

## Note

All coins in the game are virtual.
