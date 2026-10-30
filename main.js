// UI layer: renders the board and handles user interaction.
'use strict';

(function () {
  // Solid glyphs are used for both sides; colour comes from CSS classes
  // so white and black pieces have identical shapes.
  const PIECE_GLYPHS = {
    k: '\u265A', // ♚
    q: '\u265B', // ♛
    r: '\u265C', // ♜
    b: '\u265D', // ♝
    n: '\u265E', // ♞
    p: '\u265F', // ♟
  };

  const PIECE_NAMES = {
    k: 'king',
    q: 'queen',
    r: 'rook',
    b: 'bishop',
    n: 'knight',
    p: 'pawn',
  };

  let state = Chess.createInitialState();
  let boardEl;
  let statusEl;

  // Row 0 (rank 8) is drawn first, so White ends up at the bottom.
  function renderBoard() {
    boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        const isLight = (row + col) % 2 === 0; // a8 (0,0) and h1 (7,7) are light
        square.className = 'square ' + (isLight ? 'light' : 'dark');
        square.dataset.row = row;
        square.dataset.col = col;

        const name = Chess.squareName(row, col);
        const piece = state.board[row][col];
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.className = 'piece ' + (piece.color === Chess.WHITE ? 'white' : 'black');
          pieceEl.textContent = PIECE_GLYPHS[piece.type];
          square.appendChild(pieceEl);
          const colorName = piece.color === Chess.WHITE ? 'White' : 'Black';
          square.setAttribute('aria-label', `${name}, ${colorName} ${PIECE_NAMES[piece.type]}`);
        } else {
          square.setAttribute('aria-label', name);
        }

        boardEl.appendChild(square);
      }
    }
  }

  function renderStatus() {
    const player = state.turn === Chess.WHITE ? 'White' : 'Black';
    statusEl.textContent = `${player} to move`;
    statusEl.className = 'status ' + (state.turn === Chess.WHITE ? 'turn-white' : 'turn-black');
  }

  function render() {
    renderBoard();
    renderStatus();
  }

  function newGame() {
    state = Chess.createInitialState();
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    boardEl = document.getElementById('board');
    statusEl = document.getElementById('status');
    document.getElementById('new-game').addEventListener('click', newGame);
    render();
  });
})();
