# Kenh14 API

Backend API for the Kenh14 project, built with NestJS.

## Requirements

- Node.js 22.12 or newer
- npm

## Run locally

```bash
npm install
npm run start:dev
```

The server listens on port `3000` by default. Set `PORT` to use another port.

## Pull 1 endpoints

- `GET /api/hello` returns the hello world message.
- `GET /api/docs` serves the Swagger UI and OpenAPI document.

The hello message is localized to English or Vietnamese. Select a locale with
the `lang` query parameter, the `x-lang` request header, or `Accept-Language`.
For example, `GET /api/hello?lang=vi` returns the Vietnamese message.

## Authentication and database

Copy `.env.example` to `.env` and fill in the Supabase PostgreSQL, Redis, and
JWT settings. Do not commit `.env` or production credentials. Supabase hosts
use TLS automatically; set `DB_SSL=true` to enable TLS for another PostgreSQL
host.

Schema changes are applied manually with TypeORM migrations. The application
keeps TypeORM synchronization and automatic migration execution disabled.
Apply the included users migration with:

```bash
npm run migration:run
```

Authentication endpoints:

- `POST /api/users` registers a user with `{ "user": { "username", "email", "password" } }`.
- `POST /api/users/login` logs in with `{ "user": { "email", "password" } }`.
- `GET /api/user` returns the authenticated user.
- `POST /api/users/logout` revokes the current bearer token and returns `204`.

Send access tokens as `Authorization: Bearer <token>`. The Redis blacklist stores
only the token ID and automatically expires each entry when its JWT expires.

## Useful commands

```bash
npm run build
npm run lint
```
