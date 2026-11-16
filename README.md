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

## Useful commands

```bash
npm run build
npm run lint
```
