# Chatbot Backend API

Backend API for the [Chatbot](https://github.com/alikirat/chatbot) app. Handles
user accounts and persists chat conversations, each scoped to the account that
owns it.

**Live API:** https://akdev-chatbot-api.onrender.com
**Frontend:** [chatbot](https://github.com/alikirat/chatbot) ([live demo](https://akdev-chatbot.netlify.app))

> 📌 **Note:** This is a portfolio/demo project. All data is for testing purposes only. Please don't enter real personal information.

## Features

- User accounts with JWT-based authentication (register/login, bcrypt-hashed passwords)
- Chats are scoped per user: each account only sees and can modify its own conversations
- Full CRUD for chats (create, list, get, update, delete), each with its own message history
- Proxies AI completions through Groq server-side, so the API key stays out of the browser

## Tech Stack

Node.js, Express, MongoDB with Mongoose, JWT (`jsonwebtoken`) + `bcrypt` for auth, `groq-sdk`, Helmet, CORS, Morgan.

## API Endpoints

### Auth
```
POST /api/auth/register   Create a new account
POST /api/auth/login      Log in, returns a JWT
```

### Chat (all routes require a valid JWT)
```
GET    /api/chat/             Get the authenticated user's chats
GET    /api/chat/:id          Get a specific chat (must be owned by the user)
POST   /api/chat              Create a new chat
PATCH  /api/chat/:id          Add messages or update the title of a chat
DELETE /api/chat/:id          Delete a chat
POST   /api/chat/completion   Proxy a chat completion through Groq
```

### Health
```
GET /api/health   Returns { "status": "ok" }
```

## Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/alikirat/chatbot-backend
   cd chatbot-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key_here
   GROQ_API_KEY=your_groq_api_key_here
   PORT=4000
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

Server runs on `http://localhost:4000` by default.

## Testing

The test suite uses Vitest and Supertest against an in-memory MongoDB
(`mongodb-memory-server`), so it never touches a real database or the real
Groq API:

```bash
npm test
```

Tests live in `tests/` and cover auth (register/login), chat creation and
per-user listing, and ownership checks on chats (a user can only view,
update, or delete their own chats), plus the completion proxy's auth
requirement.

## Related Repository

**Frontend:** [https://github.com/alikirat/chatbot](https://github.com/alikirat/chatbot)
