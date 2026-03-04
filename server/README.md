# Server (Express + TypeScript MVC)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `MONGODB_URI` (e.g. `mongodb://localhost:27017/syntax-stories`)
   - Set `PORT` (default `5000`)

3. **JWT keys** (optional; needed for auth later)
   - Generate PEM files in `server/keys/`:
     ```bash
     npm run generate-keys
     ```
   - Or with OpenSSL:
     ```bash
     openssl genrsa -out keys/privateKey.pem 2048
     openssl rsa -in keys/privateKey.pem -pubout -out keys/publicKey.pem
     ```

4. **Run**
   - Dev: `npm run dev` (ts-node-dev)
   - Prod: `npm run build` then `npm start`

## Endpoints

- `GET /api/ping` → `SYNTAX STORIES`
- `GET /api/health` → `{ success, message, timestamp }`

## Structure (MVC)

- `src/config` – env, database, JWT keys
- `src/controllers` – request handlers
- `src/models` – Mongoose models
- `src/routes` – route definitions
- `src/middlewares` – error handler, etc.
- `src/app.ts` – Express app
- `src/index.ts` – entry (connect DB, listen)
