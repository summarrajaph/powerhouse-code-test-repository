# Chess

A two-player chess game for one device, written in plain HTML, CSS and
JavaScript with no frameworks, build step or dependencies.

White and Black take turns on the same screen. All standard rules are enforced:
legal moves only, check, checkmate, stalemate, castling, en passant and pawn
promotion.

## How to run

There is nothing to install or build.

### Option 1: open the file directly

Open `index.html` in a modern web browser (Chrome, Firefox, Edge or Safari),
for example by double-clicking it in your file manager or dragging it onto a
browser window.

### Option 2: serve it locally

Any static file server works. From the project folder, run one of:

```sh
# Python 3
python3 -m http.server 8000

# Node.js
npx serve .
```

Then open <http://localhost:8000> (or the address `npx serve` prints).

## How to play

- **Move:** click one of your pieces to select it. Its legal destinations are
  highlighted: a dot marks an empty square and a ring marks a capture. Click a
  highlighted square to move there.
- **Change or cancel a selection:** click another of your own pieces to select
  it instead. Click the selected piece again, any non-highlighted square or
  anywhere outside the board, or press `Esc`, to deselect.
- **Turn:** the indicator above the board shows whose turn it is.
- **Check:** the checked king's square is shown in red and the indicator says
  "Check!". Moves that would leave your own king in check are never offered.
- **Castling:** select the king and click the square two files to the left or
  right (g1/c1 for White, g8/c8 for Black). The rook moves automatically.
  Castling is only offered when it is legal.
- **En passant:** when it is available, the capturing square is highlighted
  like any other move.
- **Promotion:** move a pawn to the last rank and choose queen, rook, bishop or
  knight in the prompt. Press Cancel or `Esc` to take the move back and choose
  another.
- **Game end:** checkmate (naming the winner) or stalemate (a draw) is
  announced over the board, and no further moves can be made.
- **New Game:** resets the board to the starting position with White to move.

Not included: play against the computer, online play, saving games,
drag-and-drop, move history, undo, a clock, board flipping, and draw rules
other than stalemate.

## Project files

| File         | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| `index.html` | Page structure: status, New Game button, board, dialogs    |
| `style.css`  | Board, piece, highlight and dialog styling                 |
| `chess.js`   | Game rules and state (no browser code), exposed as `Chess` |
| `main.js`    | Rendering and click handling                               |

`chess.js` also works as a Node.js module (`require('./chess.js')`), which is
useful for testing the rules without a browser.
