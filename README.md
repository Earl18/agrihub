# AgriHub

AgriHub is a MERN-based farm management platform that combines a marketplace, labor booking, service booking, profile management, KYC-style role verification, and an admin control center.

The project is organized as a workspace with:

- `frontend/` for the React + TypeScript + Vite client
- `backend/` for the Express + MongoDB API

## Current Website Features

### User-side features

- Authentication with email/password
- Email verification, password reset, and email-change verification flows
- Profile management with editable personal information and avatar upload
- Dashboard with role-aware summary cards and recent activity
- Marketplace browsing for buyers and sellers
- Labor booking flow with real user-specific active bookings and history
- Laborer dashboard and labor profile snapshot
- Services browsing and booking
- Seller and laborer KYC-style verification flows with document upload

### Admin-side features

- Admin dashboard for users, listings, labor bookings, service bookings, and verification reviews
- Verification approval and rejection flow
- Account penalty / restriction controls

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Radix UI
- Lucide React

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Nodemailer
- Supabase Storage

## Project Structure

```text
SysArch/
  frontend/
  backend/
  package.json
  package-lock.json
  .env
```

## Available Scripts

Run these from the repo root:

```bash
npm install
npm run dev
```

Other useful scripts:

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run start
```

## Environment Setup

This project reads environment variables from the root `.env` file.

Create a `.env` file in the project root and add the values your setup needs:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=your_sender_email

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_BUCKET=verification-documents
SUPABASE_PROFILE_BUCKET=profile-pictures

VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Running Locally

1. Install dependencies:

```bash
npm install
```

2. Add the root `.env` file.

3. Start both apps:

```bash
npm run dev
```

4. Open the frontend:

- [http://localhost:5173](http://localhost:5173)

5. Backend API base:

- [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

## API Notes

Main API root:

- `/api/v1`

Examples of active areas in the API:

- `/api/v1/auth/*`
- `/api/v1/data/me`
- `/api/v1/data/dashboard`
- `/api/v1/data/marketplace`
- `/api/v1/data/labor`
- `/api/v1/data/labor/book`
- `/api/v1/data/services`
- `/api/v1/admin/*`

## Data / Seed Behavior

- The backend seeds demo data on startup.
- Seeded data powers the marketplace, labor, service, and admin views.
- Real user-specific labor bookings are now stored on the signed-in account and shown in that user's labor tabs.

## Notes

- Frontend source lives in `frontend/src`.
- Backend source lives in `backend/src`.
- The backend expects MongoDB, SMTP, and Supabase to be configured for the full experience.
- Google Maps autocomplete in the profile page requires `VITE_GOOGLE_MAPS_API_KEY`.
- Some dashboard and role flows are intentionally role-aware, so what a buyer, seller, laborer, or admin sees can differ.
