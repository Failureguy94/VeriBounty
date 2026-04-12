# VeriBounty Backend

Node.js + Express + TypeScript backend with MongoDB Atlas (Mongoose) and Zod validation.

## Setup

1. Copy `.env.example` to `.env` and fill `MONGODB_URI`.
2. Install dependencies:
   `npm install`
3. Run in development:
   `npm run dev`

## Endpoints

- `POST /claims` - create claim
- `GET /claims` - list claims (`?status=open|claimed|verdict_submitted|resolved`)
- `GET /claims/:bountyPDA` - get single claim
- `POST /evidence` - submit evidence
- `GET /reputation/:wallet` - get wallet reputation

## Health

- `GET /health`
