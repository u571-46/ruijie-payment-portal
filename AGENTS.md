# AI Agent Instructions for `ruijie-payment-portal`

## Project Summary
This is a small Node.js/Express payment portal for Ruijie WiFi vouchers.
- Backend: `server.js`
- Frontend: static content under `public/`
- Uploads: logo uploads are stored under `public/` and served at `/static`
- Payment integration: `midtrans-client` using server-side Snap transactions

## Run and local development
- Install dependencies with `npm install`
- Start the app with `npm start`
- The app listens on `PORT` or defaults to `8080`

## Important behavior to preserve
- `server.js` initializes Midtrans Snap client with environment variables:
  - `MIDTRANS_SERVER_KEY`
  - `MIDTRANS_CLIENT_KEY`
- Payment endpoint: `POST /api/pay`
- Voucher endpoint: `GET /api/get-voucher/:packageId`
- Admin page: `GET /admin/portal-config`
- Logo upload endpoint: `POST /admin/upload-logo`

## Key implementation details
- `public/index.html` is the main client UI and loads the Midtrans sandbox Snap JS widget
- Voucher codes are stored in-memory in `voucherPool` and are consumed FIFO
- No database is present; app state resets on server restart
- File uploads are handled by `multer` and always overwrite `public/logo.png`

## Safety and caution
- There is no authentication for admin routes
- There is no validation or sanitization beyond Multer file handling
- Do not assume persistence for vouchers or configuration data

## What an agent should do first
- Keep changes minimal and preserve the existing Express/HTML structure
- If modifying payments or voucher logic, maintain the current route names and request/response format
- If adding features, avoid introducing any hidden state that would conflict with in-memory voucher usage

## Useful file references
- `package.json` — dependencies and startup script
- `server.js` — all backend logic and route handlers
- `public/index.html` — frontend payment and UI code

## Quick commands (development)
- Install dependencies: `npm install`
- Start the app: `npm start` (runs `node server.js`)
- Run with example env: `MIDTRANS_SERVER_KEY=xxx MIDTRANS_CLIENT_KEY=yyy PORT=8080 node server.js`

## Files to open first
- `server.js` — voucher pool, Midtrans integration, and admin endpoints
- `public/index.html` — client payment flow and Snap integration
- `AGENTS.md` — this file with guidance for AI agents

## Notes for agents
- Preserve existing route names (`/api/pay`, `/api/get-voucher/:packageId`, `/admin/portal-config`, `/admin/upload-logo`).
- Voucher codes are stored in-memory in `voucherPool` and are consumed FIFO; do not introduce persistence without discussing trade-offs.
- Admin routes are unauthenticated; exercise caution when changing or exposing behavior.
- Keep changes minimal and link to existing files instead of duplicating documentation.

## Suggested next customizations
- Optionally add a short `.github/copilot-instructions.md` that points to this `AGENTS.md` (if CI/tools expect that path).
- Consider adding small skills for common tasks: `update-voucher-pool`, `run-local-pay-simulation`.
