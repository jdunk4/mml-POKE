# MML + Arweave Wayfinder Project

A server that serves MML (Metaverse Markup Language) 3D content with **reliable, decentralized access to Arweave-stored assets** using the AR.IO Wayfinder protocol.

## The Problem

When you hardcode a single gateway in your MML document:

```html
<!-- This breaks if arweave.net goes down -->
<m-model src="https://arweave.net/UwRjj-HMq..."></m-model>

<!-- Switching to another gateway means editing every link -->
<m-model src="https://turbo-gateway.com/UwRjj-HMq..."></m-model>
```

## The Solution

This project resolves Arweave transaction IDs to the **fastest available gateway** at runtime. Your MML documents reference assets by transaction ID, and the server handles gateway selection automatically with failover.

## How It Works

1. **On startup**, the server resolves each Arweave transaction ID using:
   - **Wayfinder SDK** (preferred) — pings AR.IO network gateways and picks the fastest
   - **Fallback list** — tries known gateways (arweave.net, turbo-gateway.com, permagate.io, etc.)
2. Resolved URLs are **injected into the MML document** as `window.__ARWEAVE_URLS__`
3. The MML document's `<script>` sets `src` attributes using these resolved URLs
4. Every **5 minutes**, the server re-resolves to handle gateway changes
5. If you edit `mml-document.html`, it **live-reloads** automatically

## Quick Start

### Prerequisites

- Node.js 18+

### Install & Run

```bash
git clone <this-repo>
cd mml-wayfinder-project
npm install
npm start
```

Open `http://localhost:8080` to see your 3D model.

### Add Your Own Arweave Assets

Edit `src/server.js` and add transaction IDs to the `ARWEAVE_ASSETS` object:

```javascript
const ARWEAVE_ASSETS = {
  animatedModel: "UwRjj-HMqvRjXKob2KKoFOYacaXVh0WFtmhs8Gyalls",
  helmet: "ANOTHER_TX_ID_HERE",
  sword: "YET_ANOTHER_TX_ID",
};
```

Then reference them in `src/mml-document.html`:

```html
<m-model id="helmet" y="2"></m-model>
<m-model id="sword" x="2"></m-model>

<script>
  const urls = window.__ARWEAVE_URLS__;
  document.getElementById("helmet").setAttribute("src", urls.helmet);
  document.getElementById("sword").setAttribute("src", urls.sword);
</script>
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | 3D viewer |
| `/api/resolved-urls` | GET | See current resolved gateway URLs |
| `/api/resolve` | POST | Force re-resolution of all assets |

## Deployment

This works anywhere Node.js runs:

- **CodeSandbox** — fork and deploy instantly
- **Railway** — `railway up`
- **AWS Lightsail / VPS** — `npm install && npm start`
- **Glitch** — remix from GitHub

Expose port 8080 (or set `PORT` env var) and ensure WebSocket connections are supported.

## Project Structure

```
mml-wayfinder-project/
├── package.json
├── README.md
└── src/
    ├── server.js          # Express + WebSocket server with Wayfinder resolution
    └── mml-document.html  # Your MML content (edit this!)
```

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server port |

To customize the re-resolution interval, edit the `startPeriodicResolution()` call in `server.js`.

## How Wayfinder Resolution Works

```
Your MML Document
    │
    ▼
server.js resolves "ar://TX_ID"
    │
    ├─► Try Wayfinder SDK (pings AR.IO network)
    │     └─► Returns fastest gateway URL
    │
    └─► Fallback: try gateways in order
          ├─► arweave.net
          ├─► turbo-gateway.com
          ├─► permagate.io
          ├─► ar-io.dev
          └─► g8way.io
    │
    ▼
Resolved URL injected into MML document
    │
    ▼
<m-model src="https://fastest-gateway.com/TX_ID">
```

## License

MIT
