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

  // Currently selected square as { row, col }, or null, and its candidate moves.
  let selected = null;
  let selectedMoves = [];

  function clearSelection() {
    selected = null;
    selectedMoves = [];
  }

  function selectSquare(row, col) {
    selected = { row, col };
    selectedMoves = Chess.generateLegalMoves(state, row, col);
  }

  function findSelectedMove(row, col) {
    return selectedMoves.find((m) => m.to.row === row && m.to.col === col) || null;
  }

  // Plays a move chosen from the highlighted destinations, then passes the turn.
  // Promotions first ask which piece the pawn should become.
  function makeMove(move) {
    if (move.promotion) {
      openPromotionPrompt(move);
      return;
    }
    commitMove(move);
  }

  function commitMove(move, promotionType) {
    state = Chess.applyMove(state, move, promotionType);
    clearSelection();
    render();
  }

  // --- Promotion prompt ---------------------------------------------------

  const PROMOTION_TYPES = ['q', 'r', 'b', 'n'];
  let promotionEl;
  let promotionChoicesEl;
  // The promotion move waiting for a piece choice, or null when no prompt is open.
  let pendingPromotion = null;

  function openPromotionPrompt(move) {
    pendingPromotion = move;
    const color = state.board[move.from.row][move.from.col].color;
    promotionChoicesEl.innerHTML = '';
    for (const type of PROMOTION_TYPES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'promotion-choice';
      btn.dataset.type = type;
      btn.setAttribute('aria-label', PIECE_NAMES[type]);
      btn.title = PIECE_NAMES[type][0].toUpperCase() + PIECE_NAMES[type].slice(1);
      const glyph = document.createElement('span');
      glyph.className = 'piece ' + (color === Chess.WHITE ? 'white' : 'black');
      glyph.textContent = PIECE_GLYPHS[type];
      btn.appendChild(glyph);
      promotionChoicesEl.appendChild(btn);
    }
    promotionEl.hidden = false;
    const first = promotionChoicesEl.querySelector('button');
    if (first) first.focus();
  }

  function closePromotionPrompt() {
    pendingPromotion = null;
    promotionEl.hidden = true;
  }

  function choosePromotion(type) {
    if (!pendingPromotion || !PROMOTION_TYPES.includes(type)) return;
    const move = pendingPromotion;
    closePromotionPrompt();
    commitMove(move, type);
  }

  // Cancelling leaves the pawn where it was, still selected, so the player can choose again.
  function cancelPromotion() {
    if (!pendingPromotion) return;
    closePromotionPrompt();
    render();
  }

  function onPromotionClick(event) {
    const btn = event.target.closest('.promotion-choice');
    if (btn) choosePromotion(btn.dataset.type);
  }

  // Central click handler for a board square.
  function handleSquareClick(row, col) {
    // The board is inert while the promotion choice is open.
    if (pendingPromotion) return;
    const piece = state.board[row][col];
    const move = selected ? findSelectedMove(row, col) : null;

    if (move) {
      makeMove(move);
      return;
    }

    if (piece && piece.color === state.turn) {
      // Clicking the already-selected piece toggles the selection off.
      if (selected && selected.row === row && selected.col === col) {
        clearSelection();
      } else {
        selectSquare(row, col);
      }
    } else {
      clearSelection();
    }
    render();
  }

  // One delegated listener on the board handles clicks on any square,
  // including clicks that land on the piece glyph inside it.
  function onBoardClick(event) {
    const square = event.target.closest('.square');
    if (!square || !boardEl.contains(square)) return;
    handleSquareClick(Number(square.dataset.row), Number(square.dataset.col));
  }

  // Deselect without moving, re-rendering only if something was selected.
  function cancelSelection() {
    if (!selected || pendingPromotion) return;
    clearSelection();
    render();
  }

  // Clicking anywhere outside the board clears the selection.
  function onDocumentClick(event) {
    if (!boardEl.contains(event.target)) cancelSelection();
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (pendingPromotion) cancelPromotion();
    else cancelSelection();
  }

  // Row 0 (rank 8) is drawn first, so White ends up at the bottom.
  function renderBoard() {
    boardEl.innerHTML = '';
    // Only the side to move can be in check (the other side's king is always safe).
    const checkedKing = Chess.isInCheck(state.board, state.turn)
      ? Chess.findKing(state.board, state.turn)
      : null;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        const isLight = (row + col) % 2 === 0; // a8 (0,0) and h1 (7,7) are light
        square.className = 'square ' + (isLight ? 'light' : 'dark');
        square.dataset.row = row;
        square.dataset.col = col;

        const inCheck = !!checkedKing && checkedKing.row === row && checkedKing.col === col;
        if (inCheck) {
          square.classList.add('in-check');
        }
        if (selected && selected.row === row && selected.col === col) {
          square.classList.add('selected');
        }
        const target = selected ? findSelectedMove(row, col) : null;
        if (target) {
          square.classList.add(target.capture ? 'capture-target' : 'move-target');
        }

        const name = Chess.squareName(row, col);
        const piece = state.board[row][col];
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.className = 'piece ' + (piece.color === Chess.WHITE ? 'white' : 'black');
          pieceEl.textContent = PIECE_GLYPHS[piece.type];
          square.appendChild(pieceEl);
          const colorName = piece.color === Chess.WHITE ? 'White' : 'Black';
          square.setAttribute(
            'aria-label',
            `${name}, ${colorName} ${PIECE_NAMES[piece.type]}${inCheck ? ', in check' : ''}`
          );
        } else {
          square.setAttribute('aria-label', name);
        }

        boardEl.appendChild(square);
      }
    }
  }

  function renderStatus() {
    const player = state.turn === Chess.WHITE ? 'White' : 'Black';
    const check = Chess.isInCheck(state.board, state.turn);
    statusEl.textContent = check ? `${player} to move - Check!` : `${player} to move`;
    statusEl.className = 'status ' + (state.turn === Chess.WHITE ? 'turn-white' : 'turn-black');
  }

  function render() {
    renderBoard();
    renderStatus();
  }

  function newGame() {
    state = Chess.createInitialState();
    closePromotionPrompt();
    clearSelection();
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    boardEl = document.getElementById('board');
    promotionEl = document.getElementById('promotion');
    promotionChoicesEl = document.getElementById('promotion-choices');
    promotionChoicesEl.addEventListener('click', onPromotionClick);
    document.getElementById('promotion-cancel').addEventListener('click', cancelPromotion);
    // Keep prompt clicks from reaching the document "click outside clears selection" handler.
    promotionEl.addEventListener('click', (event) => event.stopPropagation());
    boardEl.addEventListener('click', onBoardClick);
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    statusEl = document.getElementById('status');
    document.getElementById('new-game').addEventListener('click', newGame);
    render();
  });
})();
