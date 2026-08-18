# Groq Proxy Plan

Status: **Done.** Flagged as a good follow-up during the multi-chat + auth
work (see `multi-chat-auth-plan.md`), then approved and built.

Shipped mostly as planned, in the same order: additive backend route first
(commit `2af90a6`), verified live, then the frontend cutover (commit
`d7772b2`), verified live including a check that the shipped bundle
contains no trace of the API key.

One thing not in the original plan: the Groq client can't be constructed
at module load time in the backend route file. ES module imports are
evaluated before the importing file's own top-level code, including its
`dotenv.config()` call, so a module-level client would read `undefined`
for the key in local dev (harmless in production, since Render injects
env vars directly, but it broke local testing). Fixed by creating the
client lazily on first use instead.

The "further option" below (persisting atomically alongside the
completion call) was not built, still worth considering later.

## The problem

The frontend calls Groq directly from the browser
(`chatbot/src/api/groq.js`, `dangerouslyAllowBrowser: true`), using
`VITE_GROQ_API_KEY` from its own `.env`. That key ships in the client
bundle and is visible in any request from devtools. Right now anyone who
opens the network tab can lift the key and use it against the developer's
own Groq quota. The chatbot repo's README already flags this as a known
shortcut.

Adding real user accounts raises the stakes on this a bit: the app now has
named accounts making requests, but the actual LLM call still happens
outside any backend control, so there's no way to rate-limit or attribute
usage per account, and the exposed key issue doesn't go away just because
auth was added elsewhere.

## Proposed change

Move the Groq call server-side.

**Backend (`chatbot-backend`)**
- Add `groq-sdk` as a dependency.
- Add `GROQ_API_KEY` as a server-side env var (set in Render's dashboard,
  same manual step as `JWT_SECRET` was, not settable via anything available
  in this environment).
- New authenticated route, e.g. `POST /api/chat/completion`, taking
  `{ messages }` and returning the assistant's reply. Gated by
  `authenticateJWT` like everything else, both so it's consistent with the
  rest of the API and so the endpoint can't be used as an open relay by
  anyone who isn't logged in.

**Frontend (`chatbot`)**
- Replace `src/api/groq.js` with a call to the new backend endpoint instead
  of the Groq SDK directly.
- Remove `groq-sdk` from `package.json` and `VITE_GROQ_API_KEY` from the
  frontend `.env` / Netlify env vars, no longer needed client-side.
- Update the README's "Notes" section, which currently documents the
  exposed-key tradeoff, that section goes away once this ships.

## A further option worth considering (bigger change, not required)

Right now sending a message is two separate frontend calls: get the
completion, then separately persist it via `PATCH`/`POST /api/chat`. If
the second call fails after the first succeeds, the UI shows a message
that never actually got saved. Once the completion call is already
server-side, it's a natural next step to have that same endpoint also
persist the user message and assistant reply atomically, so the frontend
makes one call and the two steps can't drift apart. This would change the
contract of the existing chat endpoints, more invasive than the proxy
alone, so it's called out separately rather than bundled by default.

## Rollout order, if approved

1. Backend: add the proxy route. Purely additive, the existing frontend
   doesn't call it yet, so this is zero-risk to deploy on its own.
2. Frontend: switch to calling the new backend endpoint instead of Groq
   directly.
3. Once confirmed working live, remove the now-unused `VITE_GROQ_API_KEY`
   from Netlify's env vars and `groq-sdk` from the frontend's
   dependencies.

Lower risk than the auth rollout was: the old and new code paths don't
interact, so there's no equivalent of the "gate the app before enforcing
the backend" ordering problem that auth had.

## Rough sizing

Smaller than the auth work. One new backend route, one frontend API call
swap, an env var migration. A single focused session, not multiple.
