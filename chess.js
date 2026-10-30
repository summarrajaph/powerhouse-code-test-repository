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

  // True if any piece of colour `byColor` attacks the square (row, col).
  // Works outward from the target square, so it does not depend on move
  // generation. Pawns attack diagonally forward only (never straight ahead),
  // and the square itself may be empty or occupied.
  function isSquareAttacked(board, row, col, byColor) {
    const isAttacker = (r, c, types) => {
      const p = getPiece(board, r, c);
      return !!(p && p.color === byColor && types.includes(p.type));
    };

    // Pawns: a White pawn attacks upward (row - 1), so it sits one row below the target.
    const pawnRow = byColor === WHITE ? row + 1 : row - 1;
    if (isAttacker(pawnRow, col - 1, 'p') || isAttacker(pawnRow, col + 1, 'p')) return true;

    for (const [dr, dc] of KNIGHT_OFFSETS) {
      if (isAttacker(row + dr, col + dc, 'n')) return true;
    }

    for (const [dr, dc] of KING_OFFSETS) {
      if (isAttacker(row + dr, col + dc, 'k')) return true;
    }

    // Sliding attackers: the first piece along each ray decides.
    const rays = [
      [ROOK_DIRECTIONS, 'rq'],
      [BISHOP_DIRECTIONS, 'bq'],
    ];
    for (const [directions, types] of rays) {
      for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c)) {
          const p = board[r][c];
          if (p) {
            if (p.color === byColor && types.includes(p.type)) return true;
            break;
          }
          r += dr;
          c += dc;
        }
      }
    }

    return false;
  }

  function findKing(board, color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const p = board[row][col];
        if (p && p.type === 'k' && p.color === color) return { row, col };
      }
    }
    return null;
  }

  function isInCheck(board, color) {
    const king = findKing(board, color);
    return !!king && isSquareAttacked(board, king.row, king.col, opponent(color));
  }

  // Returns a new state with the move played and the turn passed to the opponent.
  // The input state is not modified. `promotionType` picks the piece a pawn
  // promotes to (defaults to queen; a choice prompt is added later).
  function applyMove(state, move, promotionType) {
    const board = cloneBoard(state.board);
    const piece = board[move.from.row][move.from.col];
    board[move.from.row][move.from.col] = null;
    board[move.to.row][move.to.col] = move.promotion
      ? createPiece(promotionType || 'q', piece.color)
      : piece;

    // En passant: the captured pawn sits beside the mover, not on the destination square.
    if (move.enPassant) {
      board[move.from.row][move.to.col] = null;
    }

    // Castling: the king has moved two squares; bring the rook to the square it crossed.
    if (move.castle) {
      const row = move.from.row;
      const rookFrom = move.castle === 'kingSide' ? 7 : 0;
      const rookTo = move.castle === 'kingSide' ? 5 : 3;
      board[row][rookTo] = board[row][rookFrom];
      board[row][rookFrom] = null;
    }

    return {
      ...state,
      board,
      turn: opponent(state.turn),
      castling: updateCastlingRights(state.castling, piece, move),
      // After a double step, the square the pawn skipped over may be captured onto
      // en passant by the opponent's very next move only; any other move clears it.
      enPassant: move.doublePawnPush
        ? { row: (move.from.row + move.to.row) / 2, col: move.from.col }
        : null,
    };
  }

  // Home squares of the rooks, keyed by colour and side.
  const ROOK_HOMES = {
    w: { queenSide: { row: 7, col: 0 }, kingSide: { row: 7, col: 7 } },
    b: { queenSide: { row: 0, col: 0 }, kingSide: { row: 0, col: 7 } },
  };

  function cloneCastling(castling) {
    return {
      w: { ...castling.w },
      b: { ...castling.b },
    };
  }

  // Castling rights after a move: a side loses both rights once its king moves,
  // and loses one right once that rook leaves its home square or is captured on it.
  // Rights are never regained, so they double as a "has moved" record.
  function updateCastlingRights(castling, piece, move) {
    const rights = cloneCastling(castling);

    if (piece.type === 'k') {
      rights[piece.color].kingSide = false;
      rights[piece.color].queenSide = false;
    }

    for (const color of [WHITE, BLACK]) {
      for (const side of ['kingSide', 'queenSide']) {
        const home = ROOK_HOMES[color][side];
        const touched =
          (move.from.row === home.row && move.from.col === home.col) ||
          (move.to.row === home.row && move.to.col === home.col);
        if (touched) rights[color][side] = false;
      }
    }

    return rights;
  }

  // True if playing the move would leave the mover's own king attacked.
  // The move is tried on a copy of the board, so pins, discovered attacks,
  // the king walking into check and failing to answer a check are all caught.
  function leavesKingInCheck(state, move) {
    const mover = state.board[move.from.row][move.from.col];
    const next = applyMove(state, move);
    return isInCheck(next.board, mover.color);
  }

  // Legal castling moves for the side to move. Requirements:
  // - the right is still held (king and that rook have never moved, rook not captured);
  // - king and rook are actually on their home squares;
  // - every square between them is empty;
  // - the king is not in check, and neither the square it crosses nor the one
  //   it lands on is attacked.
  function generateCastlingMoves(state) {
    const color = state.turn;
    const board = state.board;
    const row = color === WHITE ? 7 : 0;
    const enemy = opponent(color);
    const moves = [];

    const king = board[row][4];
    if (!king || king.type !== 'k' || king.color !== color) return moves;
    if (isSquareAttacked(board, row, 4, enemy)) return moves;

    const sides = [
      { side: 'kingSide', rookCol: 7, between: [5, 6], kingPath: [5, 6], kingTo: 6 },
      { side: 'queenSide', rookCol: 0, between: [1, 2, 3], kingPath: [3, 2], kingTo: 2 },
    ];
    for (const s of sides) {
      if (!state.castling[color][s.side]) continue;
      const rook = board[row][s.rookCol];
      if (!rook || rook.type !== 'r' || rook.color !== color) continue;
      if (s.between.some((c) => board[row][c])) continue;
      if (s.kingPath.some((c) => isSquareAttacked(board, row, c, enemy))) continue;
      moves.push(createMove(row, 4, row, s.kingTo, { castle: s.side }));
    }
    return moves;
  }

  // En passant captures available to the pawn on (row, col), if any. The target
  // square is only set immediately after an opposing double step, so the capture
  // is possible on that one move only.
  function generateEnPassantMoves(state, row, col) {
    const ep = state.enPassant;
    const pawn = getPiece(state.board, row, col);
    if (!ep || !pawn || pawn.type !== 'p' || pawn.color !== state.turn) return [];
    const dir = pawn.color === WHITE ? -1 : 1;
    if (ep.row !== row + dir || Math.abs(ep.col - col) !== 1) return [];
    const victim = getPiece(state.board, row, ep.col);
    if (!victim || victim.type !== 'p' || victim.color === pawn.color) return [];
    return [createMove(row, col, ep.row, ep.col, { capture: true, enPassant: true })];
  }

  // Moves that depend on game history rather than just the board.
  function generateSpecialMoves(state, row, col, piece) {
    if (piece.type === 'k') return generateCastlingMoves(state);
    if (piece.type === 'p') return generateEnPassantMoves(state, row, col);
    return [];
  }

  // Fully legal moves for the piece on (row, col). Only the side to move has legal moves.
  function generateLegalMoves(state, row, col) {
    const piece = getPiece(state.board, row, col);
    if (!piece || piece.color !== state.turn) return [];
    const moves = generatePieceMoves(state.board, row, col);
    moves.push(...generateSpecialMoves(state, row, col, piece));
    return moves.filter((m) => !leavesKingInCheck(state, m));
  }

  // All legal moves for the side to move.
  function generateAllLegalMoves(state) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        moves.push(...generateLegalMoves(state, row, col));
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
    applyMove,
    updateCastlingRights,
    isSquareAttacked,
    findKing,
    isInCheck,
    leavesKingInCheck,
    generateCastlingMoves,
    generateEnPassantMoves,
    generateLegalMoves,
    generateAllLegalMoves,
  };

  root.Chess = Chess;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Chess;
  }
})(typeof window !== 'undefined' ? window : globalThis);
