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

  function createMove(fromRow, fromCol, toRow, toCol, extra) {
    return { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, ...extra };
  }

  // Pseudo-legal pawn moves: single and double steps forward onto empty squares,
  // and diagonal captures of opposing pieces. White moves up the board (row - 1).
  function generatePawnMoves(board, row, col) {
    const pawn = board[row][col];
    const moves = [];
    const dir = pawn.color === WHITE ? -1 : 1;
    const startRow = pawn.color === WHITE ? 6 : 1;
    const promotionRow = pawn.color === WHITE ? 0 : 7;

    const oneRow = row + dir;
    if (inBounds(oneRow, col) && !board[oneRow][col]) {
      moves.push(createMove(row, col, oneRow, col, { promotion: oneRow === promotionRow }));
      const twoRow = row + 2 * dir;
      if (row === startRow && !board[twoRow][col]) {
        moves.push(createMove(row, col, twoRow, col, { doublePawnPush: true }));
      }
    }

    for (const dc of [-1, 1]) {
      const r = row + dir;
      const c = col + dc;
      const target = getPiece(board, r, c);
      if (target && target.color !== pawn.color) {
        moves.push(createMove(row, col, r, c, { capture: true, promotion: r === promotionRow }));
      }
    }

    return moves;
  }

  const KNIGHT_OFFSETS = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  const KING_OFFSETS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ];

  // Moves for pieces that jump to fixed offsets (knight, king). A target square
  // is allowed if it is on the board and empty or holds an opposing piece.
  function generateStepMoves(board, row, col, offsets) {
    const piece = board[row][col];
    const moves = [];
    for (const [dr, dc] of offsets) {
      const r = row + dr;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const target = board[r][c];
      if (!target) {
        moves.push(createMove(row, col, r, c));
      } else if (target.color !== piece.color) {
        moves.push(createMove(row, col, r, c, { capture: true }));
      }
    }
    return moves;
  }

  function generateKnightMoves(board, row, col) {
    return generateStepMoves(board, row, col, KNIGHT_OFFSETS);
  }

  // Ordinary one-square king moves; castling is added in a later step.
  function generateKingMoves(board, row, col) {
    return generateStepMoves(board, row, col, KING_OFFSETS);
  }

  const ROOK_DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const BISHOP_DIRECTIONS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const QUEEN_DIRECTIONS = ROOK_DIRECTIONS.concat(BISHOP_DIRECTIONS);

  // Moves for sliding pieces: travel along each direction until the edge of the
  // board or the first piece. An opposing piece may be captured; the ray stops either way.
  function generateSlidingMoves(board, row, col, directions) {
    const piece = board[row][col];
    const moves = [];
    for (const [dr, dc] of directions) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push(createMove(row, col, r, c));
        } else {
          if (target.color !== piece.color) {
            moves.push(createMove(row, col, r, c, { capture: true }));
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }

  function generateBishopMoves(board, row, col) {
    return generateSlidingMoves(board, row, col, BISHOP_DIRECTIONS);
  }

  function generateRookMoves(board, row, col) {
    return generateSlidingMoves(board, row, col, ROOK_DIRECTIONS);
  }

  function generateQueenMoves(board, row, col) {
    return generateSlidingMoves(board, row, col, QUEEN_DIRECTIONS);
  }

  const GENERATORS = {
    p: generatePawnMoves,
    n: generateKnightMoves,
    b: generateBishopMoves,
    r: generateRookMoves,
    q: generateQueenMoves,
    k: generateKingMoves,
  };

  // True if the move's destination holds a piece of the mover's own colour.
  function capturesOwnPiece(board, move) {
    const mover = board[move.from.row][move.from.col];
    const target = board[move.to.row][move.to.col];
    return !!(mover && target && target.color === mover.color);
  }

  // Pseudo-legal moves for the piece on (row, col), ignoring check.
  // Moves landing on a friendly piece are always removed here, so no caller
  // can ever receive a move that captures one of its own pieces.
  function generatePieceMoves(board, row, col) {
    const piece = getPiece(board, row, col);
    if (!piece) return [];
    return GENERATORS[piece.type](board, row, col).filter((m) => !capturesOwnPiece(board, m));
  }

  // Pseudo-legal moves for every piece of the given colour.
  function generateAllMoves(board, color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color) {
          moves.push(...generatePieceMoves(board, row, col));
        }
      }
    }
    return moves;
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
    createMove,
    generatePawnMoves,
    generateKnightMoves,
    generateKingMoves,
    generateBishopMoves,
    generateRookMoves,
    generateQueenMoves,
    capturesOwnPiece,
    generatePieceMoves,
    generateAllMoves,
  };

  root.Chess = Chess;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chess;
  }
})(typeof window !== 'undefined' ? window : globalThis);
