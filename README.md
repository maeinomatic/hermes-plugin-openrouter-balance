# OpenRouter Balance for Hermes Agent

A live OpenRouter credit balance in the [Hermes Agent](https://github.com/NousResearch/hermes-agent) desktop status bar — using the key Hermes already has. Nothing to paste, nothing to configure beyond your existing `OPENROUTER_API_KEY`.

## What you get

- **Status-bar chip** — `OR $12.34 left`, with total/used/remaining on hover. Turns amber when you drop below 15% remaining; click to refetch now.
- **Automatic refresh** — polls every 5 minutes while idle and refetches ~8 s after each chat turn, so the number tracks your actual spend.
- **Honest error states** — `OR: no key`, `OR: bad key`, `OR: offline`, `OR: error` — each with a tooltip that says what to fix. Offline falls back to a 2-minute retry loop instead of hammering the API.
- **Per-profile keys** — the backend resolves the key through Hermes's profile secret scope, so a multiplexed gateway shows the *active* profile's balance. Put the same key in every profile's `.env` if you want identical numbers everywhere.

## Install

From the catalog (once listed):

```bash
hermes plugins install openrouter-balance
```

Or directly from this repo:

```bash
hermes plugins install maeinomatic/hermes-plugin-openrouter-balance
```

Then make sure `OPENROUTER_API_KEY` is set in `%LOCALAPPDATA%/hermes/.env` (or the active profile's `.env`) and enable the plugin if it installed disabled:

```bash
hermes plugins enable openrouter-balance
```

## How it works

The plugin has two halves, standard for a Hermes unified plugin:

| Half | File | What it does |
|---|---|---|
| Backend API | `dashboard/plugin_api.py` | Resolves the profile's `OPENROUTER_API_KEY` via `agent.secret_scope.get_secret` (never leaves the backend) and proxies the free [`https://openrouter.ai/api/v1/credits`](https://openrouter.ai/api/v1/credits) endpoint. Mounted at `/api/plugins/openrouter-balance/*` behind the dashboard auth gate. |
| Desktop UI | `desktop/plugin.js` | Registers a `statusBar.right` chip and a detail pane through the `@hermes/plugin-sdk`. React Query handles caching, polling and refetch. |

The Python half registers nothing (its `register()` is a no-op that satisfies the manifest contract) — all behaviour lives in the dashboard API route and the desktop chip.

## Disclosures

- **Network calls to a third-party service:** the backend calls `openrouter.ai`'s `/api/v1/credits` endpoint, authenticated with your own key. No other network egress; no telemetry.
- **Credential access:** reads `OPENROUTER_API_KEY` through `agent.secret_scope.get_secret` (Hermes's public secret route — profile-scope aware, never written anywhere or sent to the renderer).
- **No file reads** outside Hermes's own env resolution; no shell commands; no background processes.
- **Requires Hermes's dashboard/desktop auth** — the `/credits` route sits behind the same gate as the rest of the API.

## Requirements

- Hermes Agent (desktop surface) with the dashboard API available
- `OPENROUTER_API_KEY` set in the profile's `.env`

## License

MIT
