# Flip 7 Scoreboard

Lightweight score keeper for the card game *Flip 7*, optimised for phones and tablets.
Svelte + Vite single-page app, no backend: the game state lives in the browser's local storage.

## Run with Docker

```sh
docker build -t flip7-scoreboard .
docker run -d -p 8080:8080 flip7-scoreboard   # http://localhost:8080
```

The image is a multi-stage build (tests run during the build) served by unprivileged nginx on port 8080,
with a `/healthz` endpoint and a Docker `HEALTHCHECK`.

## Development

```sh
npm install
npm run dev     # dev server
npm test        # game-logic unit tests (src/lib/engine.test.ts)
npm run check   # type check
```

- `src/lib/engine.ts` – pure game rules and state transitions
- `src/lib/store.svelte.ts` – reactive app state and local-storage persistence
- `src/components/` – screens and dialogs
- `mockup/index.html` – the original design mockups
