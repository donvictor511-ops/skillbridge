# SkillBridge

SkillBridge connects professionals, clients, businesses, and collaborators.
People show their skills through real portfolio work, build a professional
network, and find opportunities.

This is a real full-stack application:

React client → Express REST API → PostgreSQL database

There is no mock backend. All persistent data is stored in PostgreSQL.

## Tech stack

- **Client:** Vite, React, TypeScript (strict), Tailwind CSS v4, React Router,
  TanStack Query, Axios, lucide-react
- **Server:** Node.js, Express 5, TypeScript (strict), Prisma 7, PostgreSQL
- **Tools:** Git and GitHub

## Project structure

```text
skillbridge/
├── client/    React frontend
├── server/    Express API, Prisma schema, database access
├── docs/      Planning and design documents (added later)
├── package.json   Root shortcut scripts (no dependencies)
└── README.md
```

## Prerequisites

- Node.js 20.19 or newer (current LTS recommended)
- Git
- PostgreSQL (current stable version) running locally

## Setup

### 1. Clone and enter the project

```bash
git clone https://github.com/YOUR-USERNAME/skillbridge.git
cd skillbridge
```

### 2. Create the database and its user

Open `psql` (or SQL Shell) as the `postgres` superuser and run, using your own
password in place of `choose_a_password`:

```sql
CREATE ROLE skillbridge_app WITH LOGIN CREATEDB PASSWORD 'choose_a_password';
CREATE DATABASE skillbridge OWNER skillbridge_app;
```

### 3. Create the environment files

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Edit `server/.env` and put your real password in `DATABASE_URL`.
Never commit `.env` files.

### 4. Install packages and generate the database client

```bash
npm --prefix client install
npm --prefix server install
npm run db:generate
```

### 5. Check the database connection

```bash
npm run db:check
```

You should see: `Database connection OK`.

## Running the app

Use two terminals, both opened in the project root:

```bash
npm run dev:server    # API on http://localhost:4000
npm run dev:client    # React app on http://localhost:5173
```

## Scripts (run from the project root)

| Command                    | What it does                           |
| -------------------------- | -------------------------------------- |
| `npm run dev:client`       | Start the React dev server             |
| `npm run dev:server`       | Start the API dev server               |
| `npm run lint:client`      | Lint the client                        |
| `npm run build`            | Build the client and the server        |
| `npm run typecheck:server` | Type-check the server                  |
| `npm run check`            | Lint, build, and type-check everything |
| `npm run db:generate`      | Generate the Prisma client             |
| `npm run db:check`         | Test the database connection           |

## API endpoints (current)

| Method | URL                 | Purpose                       |
| ------ | ------------------- | ----------------------------- |
| GET    | `/api/v1/health`    | Is the API running?           |
| GET    | `/api/v1/health/db` | Can the API reach PostgreSQL? |

Success responses use `{ "data": ... }`. Errors use
`{ "error": { "code", "message" } }`.

## Security notes

- Real secrets live only in `.env` files, which are ignored by Git.
- Only `.env.example` files (with fake values) are committed.
- The app connects with its own limited database user, not the `postgres`
  superuser.

## Status

Release 1 (foundation) is in progress. Part 1 (workspace and foundation) is
complete. Next: design system, layout, and routing.
