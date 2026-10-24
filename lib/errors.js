// lib/errors.js
//
// Plain error classes only — deliberately ZERO imports from 'next' or
// anything framework-specific. This means any file, anywhere (a Next.js
// route, a standalone script run with plain `node`, a future CLI tool)
// can import these safely. The Next.js-specific piece that turns these
// into HTTP responses lives separately, in lib/http-errors.js — see
// that file for why this split exists.

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class LimitExceededError extends Error {
  constructor(message) {
    super(message)
    this.name = 'LimitExceededError'
  }
}

// 400 - the request body failed validation (bad/missing fields). The
// message is written to be shown to the user.
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

// 409 - the request is valid, but the thing it targets is in the wrong
// state (e.g. answering a client request that was already answered).
export class ConflictError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConflictError'
  }
}