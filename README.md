# Login Portal

Minimal full-stack login page built with:

- Bun-style workspace setup at the root
- Node.js + Express backend
- React + Vite frontend

## Structure

- `frontend/` React login UI
- `backend/` Express API with a single login endpoint

## Demo credentials

- Email: `demo@site.com`
- Password: `newpassword123`

## Features

- Standard login with email and password
- OTP verification: If password is incorrect, a 6-digit OTP is sent to the user's email for verification

## Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Configure Gmail SMTP settings in `backend/.env`:
   - `GMAIL_USER=threadspaceofficial@gmail.com`
   - `GMAIL_PASS`: App password for the Gmail account
   
   To get an app password:
   - Go to Google Account settings
   - Enable 2-factor authentication on threadspaceofficial@gmail.com
   - Generate an app password for "Mail"
   - Use that app password as GMAIL_PASS (not the regular password)

## Run with Bun

```bash
bun install
bun run dev
```

## Run with npm

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

Backend runs on `http://localhost:4001`


backend
cd "C:\Users\Hp\Documents\New project"
npm.cmd --workspace backend run dev
 
 frontend
 cd "C:\Users\Hp\Documents\New project"
npm.cmd --workspace frontend run dev

2nd backend link
cd "C:\Users\Hp\Documents\New project" && npm --workspace backend run dev
