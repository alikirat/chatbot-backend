# Multi-Chat + Auth Architecture Plan

Status: **Done**. Originally written as a plan before any code was touched;
this doc now also records what actually shipped, since a couple of details
changed during implementation.

## Starting point

Before this work: no `User` model, no auth of any kind. `GET /api/chat/`
returned every chat in the database to any visitor, no filtering. CORS was
wide open. The Groq API key lived in the frontend `.env`, called directly
from the browser.

## Data model changes

- New `User` model: `email` (unique), `password` (bcrypt-hashed), timestamps.
- `Chat` model: add a `userId` field referencing `User`. Multi-chat support
  isn't really a separate feature, each chat was already its own document
  with its own message array, the only real gap was scoping chats to the
  account that owns them.
- Every `/api/chat` route needs an ownership check: `GET /` filters by
  `userId`, `GET/PATCH/DELETE /:id` verify the chat belongs to the requester,
  `POST /` sets `userId` from the verified token, never from the client body.

## Auth approach

JWT (`jsonwebtoken` + `bcrypt`), token in `localStorage`, matching the
pattern already proven on the Atlas Taxi backend. A seeded demo account with
a one-click "Use Demo Login" button, same UX precedent. No OAuth, sessions,
or email verification, unnecessary for a portfolio demo.

## Rollout order (as planned, then as actually shipped)

**Stage 1: backend auth foundation**
- `User` model, `authenticateJWT` middleware, `/api/auth/register` +
  `/api/auth/login`.
- `Chat.userId` added but left optional and unenforced at first, so nothing
  live broke while this was foundation-only.
- Seeded demo user (`demo@test.com`), dropped the 3 old pre-auth demo chats,
  reseeded 3 fresh ones tied to the new user.
- Shipped and verified live before moving on.

**Stage 2: gate the app + enforce ownership**

The original plan had this as backend-only ("retrofit chat routes with
userId scoping"), with frontend auth as a separate later stage. That
ordering would have broken the live app for real visitors the moment the
backend started requiring a token, since the frontend wasn't sending one
yet. Caught this before implementing and restructured for zero downtime:

1. Shipped the frontend first: login/signup screen gating the whole app,
   demo login button, JWT stored and attached to every chat request, logout,
   session persistence, 401 handling. Safe on its own since the backend
   wasn't checking the token yet, every request kept working exactly as
   before.
2. Verified the frontend was live and confirmed every real request was
   already carrying a valid token.
3. Only then shipped backend enforcement: `authenticateJWT` on all
   `/api/chat` routes, `Chat.userId` made required, ownership checks on
   every read/write.
4. Verified zero downtime: unauthenticated requests now 401, a fresh second
   test account got an empty chat list (real isolation, not just filtering
   that happened to look right), cross-user access to another account's
   chat by ID returned 403, and the already-deployed frontend kept working
   through the whole transition with no visible disruption.

Also fixed a pre-existing bug found while testing this (unrelated to auth):
continuing an existing chat failed because loaded messages carried Mongo's
`_id`/`timeStamp` fields, which Groq's API rejects. Stripped to
`{role, content}` before sending.

## Not done (explicitly out of scope)

- Proxying the Groq call through the backend to stop exposing the API key
  client-side. Flagged as a good idea to bundle in given the backend was
  already being touched, but not required for auth/multi-chat to work, and
  wasn't approved as part of this round.
