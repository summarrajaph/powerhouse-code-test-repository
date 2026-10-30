// Chess game logic: board state and rules (no DOM access).
'use strict';

(function (root) {
  const WHITE = 'w';
  const BLACK = 'b';

  // Piece types: p = pawn, n = knight, b = bishop, r = rook, q = queen, k = king.
  const BACK_RANK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const FILES = 'abcdefgh';

  function createPiece(type, color) {
    return { type, color };
  }

  // Board is an 8x8 array indexed [row][col].
  // row 0 is rank 8 (Black's back rank), row 7 is rank 1 (White's back rank).
  // col 0 is file a, col 7 is file h.
  function createInitialBoard() {
    const board = [];
    for (let row = 0; row < 8; row++) {
      board.push(new Array(8).fill(null));
    }
    for (let col = 0; col < 8; col++) {
      board[0][col] = createPiece(BACK_RANK[col], BLACK);
      board[1][col] = createPiece('p', BLACK);
      board[6][col] = createPiece('p', WHITE);
      board[7][col] = createPiece(BACK_RANK[col], WHITE);
    }
    return board;
  }

  function createInitialState() {
    return {
      board: createInitialBoard(),
      turn: WHITE,
      // Castling rights, cleared when a king or rook moves or a rook is captured.
      castling: {
        w: { kingSide: true, queenSide: true },
        b: { kingSide: true, queenSide: true },
      },
      // Square a pawn may capture onto en passant, as { row, col }, or null.
      enPassant: null,
      // 'playing' | 'checkmate' | 'stalemate'
      status: 'playing',
      winner: null,
    };
  }

  function cloneBoard(board) {
    return board.map((row) => row.map((p) => (p ? { ...p } : null)));
  }

  function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function getPiece(board, row, col) {
    return inBounds(row, col) ? board[row][col] : null;
  }

  function opponent(color) {
    return color === WHITE ? BLACK : WHITE;
  }

  function squareName(row, col) {
    return FILES[col] + (8 - row);
  }

  const Chess = {
    WHITE,
    BLACK,
    createPiece,
    createInitialBoard,
    createInitialState,
    cloneBoard,
    inBounds,
    getPiece,
    opponent,
    squareName,
  };

  root.Chess = Chess;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chess;
  }
})(typeof window !== 'undefined' ? window : globalThis);
