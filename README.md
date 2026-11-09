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
host. Set `DB_CA_CERT_PATH` to the downloaded Supabase `prod-ca-2021.crt` so
PostgreSQL TLS can validate the database certificate chain.

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

User and profile endpoints:

- `PATCH /api/user` updates the authenticated user's email, username, password,
  or bio with `{ "user": { ... } }`.
- `GET /api/profiles/:username` returns a profile and whether the optional
  authenticated viewer follows it.
- `POST /api/profiles/:username/follow` and
  `DELETE /api/profiles/:username/follow` follow or unfollow a profile.
- `POST /api/user/avatar` uploads a JPEG, PNG, or WebP image as multipart field
  `file` (maximum 5 MiB).
- `GET /api/attachments/:id` streams an avatar and requires a valid bearer
  token. Avatar files are stored under `UPLOAD_DIR` (default
  `uploads/avatars`), outside any public static directory; the `image` field
  contains this authenticated URL.

The attachments table keeps UUID IDs, polymorphic `attachable_type` and
`attachable_id` fields, file metadata, a private API URL, and a local storage
key. The follows table records the follower/followee relationship.

Send access tokens as `Authorization: Bearer <token>`. The Redis blacklist stores
only the token ID and automatically expires each entry when its JWT expires.

## Useful commands

```bash
npm run build
npm run lint
```

## Web interface

The app also serves a small Vietnamese web interface at `http://localhost:3000`
for manually exercising the API. Start the server with `npm run start:dev`, then
open the root URL. The interface uses the same origin as the API, so no separate
frontend server or CORS setup is needed.

Available screens:

- **Tổng quan** checks `GET /api/hello?lang=vi` and links to the API workflows.
- **Tài khoản** registers and logs in with the API's nested `{ "user": ... }`
  request shape.
- **Khám phá hồ sơ** looks up a known username and supports follow/unfollow
  when logged in. The backend does not currently provide a user directory.
- **Hồ sơ của tôi** updates account fields and uploads a private avatar.
- **API activity** shows recent request methods, paths, response statuses, and
  response bodies. Swagger remains available at `/api/docs`.

The access token is kept in the current browser tab's `sessionStorage` and is
sent only to the same-origin API. Authentication, profile, follow, and avatar
flows require the database and Redis configuration described above; database
schema changes must be migrated before testing those flows.
