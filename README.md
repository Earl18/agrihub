# SysArch MERN Structure

This project is now organized as a MERN workspace with a dedicated React frontend and an Express/Mongo backend.

## Frontend

- Location: `frontend/`
- Stack: React, TypeScript, Vite, React Router, Tailwind CSS, Radix UI
- Source root: `frontend/src`
- Existing UI preserved under `frontend/src/app`

## Backend

- Location: `backend/`
- Stack: Node.js, Express, MongoDB, Mongoose
- API root: `/api/v1`
- Included starter auth endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/health`

## Dependencies

- Root `package.json` manages the workspace and runs frontend and backend together.
- `frontend/package.json` contains React/UI/build dependencies.
- `backend/package.json` contains Node/Express/Mongo dependencies.

## Run

1. Install workspace dependencies from the repo root:

```bash
npm install
```

2. Copy the root environment example:

```bash
cp .env.example .env
```

3. Start both apps:

```bash
npm run dev
```

## Notes

- The active frontend source lives in `frontend/src`.
- The project root is now the single workspace entrypoint for dependency installation and scripts.
- The source tree is kept non-redundant at the root level: `frontend/` for client code and `backend/` for server code.
- Both frontend and backend now read from the single root `.env`.
