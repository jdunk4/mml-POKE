import { WebSocketServer } from "ws";
import { createServer } from "http";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

// ═══════════════════════════════════════════════════════
// ASSETS CONFIG - loads from assets.json
// ═══════════════════════════════════════════════════════
function loadAssets() {
  try {
    const raw = readFileSync(join(__dirname, "assets.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    console.error("❌ Could not load assets.json");
    return {};
  }
}

// ═══════════════════════════════════════════════════════
// GATEWAY RESOLUTION
// ═══════════════════════════════════════════════════════
const FALLBACK_GATEWAYS = [
  "https://arweave.net",
  "https://turbo-gateway.com",
  "https://permagate.io",
  "https://ar-io.dev",
  "https://g8way.io",
  "https://gateway.irys.xyz",
  "https://arweave.dev",
  "https://ar.io",
  "https://arw.ac",
  "https://arweave.live",
  "https://ar-node.com",
  "https://arweave-gateway.com",
  "https://permaweb.io",
  "https://gateway.arweave.net",
  "https://ar1.io",
  "https://arweave.online",
  "https://data.degate.io",
  "https://arweave.xyz",
  "https://ardrive.net",
  "https://permanodes.xyz",
  "https://arweave.cloud",
  "https://argateway.io",
  "https://gateway.ar-io.dev",
  "https://ar-gateway.com",
  "https://node1.bundlr.network",
];

let activeGateways = FALLBACK_GATEWAYS;

async function fetchGatewayList() {
  try {
    const response = await fetch("https://ar-io.dev/ar-io/peers", {
      signal: AbortSignal.timeout(5000),
    });
    const peers = await response.json();
    const dynamicGateways = peers.map(peer => `https://${peer}`);
    return [...FALLBACK_GATEWAYS, ...dynamicGateways];
  } catch {
    console.log("Could not fetch dynamic gateway list, using defaults");
    return FALLBACK_GATEWAYS;
  }
}

// Cache of resolved txId -> URL so we don't re-resolve the same asset twice
const resolvedCache = {};

async function resolveAsset(txId) {
  if (resolvedCache[txId]) return resolvedCache[txId];

  console.log(`Resolving txId: ${txId}...`);
  for (const gateway of activeGateways) {
    const url = `${gateway}/${txId}`;
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        console.log(`  ✓ Resolved via ${gateway}`);
        resolvedCache[txId] = url;
        return url;
      }
    } catch {
      // try next gateway
    }
  }
  const fallback = `${FALLBACK_GATEWAYS[0]}/${txId}`;
  console.log(`  ⚠ All gateways failed, using fallback: ${fallback}`);
  resolvedCache[txId] = fallback;
  return fallback;
}

// ═══════════════════════════════════════════════════════
// MML DOCUMENT GENERATION
// ═══════════════════════════════════════════════════════
function generateMMLDocument(resolvedUrl) {
  return `
<m-light type="ambient" intensity="1.5" color="#ffffff"></m-light>
<m-light type="point" x="0" y="3" z="4" intensity="15" color="#ffffff"></m-light>
<m-light type="point" x="4" y="2" z="0" intensity="15" color="#ffffff"></m-light>
<m-light type="point" x="-4" y="2" z="0" intensity="15" color="#ffffff"></m-light>
<m-light type="point" x="0" y="2" z="-4" intensity="15" color="#ffffff"></m-light>
<m-model
  id="arweave-model"
  src="${resolvedUrl}"
  anim="${resolvedUrl}"
  ry="180"
  anim-enabled="true"
  anim-loop="true"
  anim-start-time="0">
</m-model>
`.trim();
}

// ═══════════════════════════════════════════════════════
// DOCUMENT REGISTRY - one EditableNetworkedDOM per path
// ═══════════════════════════════════════════════════════
const documentRegistry = {};

async function getOrCreateDocument(path, EditableNetworkedDOM, observableDom) {
  if (documentRegistry[path]) return documentRegistry[path];

  const assets = loadAssets();
  const parts = path.replace(/^\//, "").split("/");
  const category = parts[0];
  const id = parts[1];

  const txId = assets[category]?.[id];
  if (!txId) {
    console.log(`  ✗ No asset found for path: ${path}`);
    return null;
  }

  console.log(`\n📄 Creating document for ${path} (txId: ${txId})`);
  const resolvedUrl = await resolveAsset(txId);
  const content = generateMMLDocument(resolvedUrl);

  const doc = new EditableNetworkedDOM(
    `http://localhost:${PORT}${path}`,
    (params, callback) => {
      return new observableDom.ObservableDOM(params, callback, observableDom.JSDOMRunnerFactory);
    },
    true
  );
  doc.load(content);
  documentRegistry[path] = doc;
  console.log(`  ✓ Document ready for ${path}`);
  return doc;
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
async function main() {
  console.log("\n🔍 Fetching gateway list...");
  activeGateways = await fetchGatewayList();
  console.log(`  ✓ ${activeGateways.length} gateways available\n`);

  // Refresh gateways every 5 minutes
  setInterval(async () => {
    console.log("🔄 Refreshing gateway list...");
    activeGateways = await fetchGatewayList();
  }, 5 * 60 * 1000);

  const networkedDomDoc = await import("@mml-io/networked-dom-document");
  const observableDom = await import("@mml-io/observable-dom");

  const EditableNetworkedDOM =
    networkedDomDoc.EditableNetworkedDOM || networkedDomDoc.default;

  if (!EditableNetworkedDOM) {
    console.error("❌ Could not find EditableNetworkedDOM export.");
    process.exit(1);
  }

  const server = createServer((req, res) => {
    if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?")) ) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <title>MML + Arweave Wayfinder</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #111; }
  </style>
</head>
<body>
  <script src="/mml-client.js?url=ws://localhost:${PORT}"></script>
</body>
</html>`);
    } else if (req.method === "GET" && req.url.startsWith("/mml-client.js")) {
      const clientJs = readFileSync(join(__dirname, "..", "node_modules", "@mml-io", "mml-web-client", "build", "index.js"));
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(clientJs);
    } else if (req.method === "GET" && req.url === "/api/assets") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(loadAssets(), null, 2));
    } else if (req.method === "GET" && req.url === "/api/resolved") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(resolvedCache, null, 2));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const path = req.url;
    console.log(`\n🔌 WebSocket connection: ${path}`);

    const doc = await getOrCreateDocument(path, EditableNetworkedDOM, observableDom);
    if (!doc) {
      console.log(`  ✗ No document for path ${path}, closing connection`);
      ws.close(1008, "Asset not found");
      return;
    }

    try {
      doc.addWebSocket(ws);
    } catch (e) {
      console.log("WebSocket add failed:", e.message);
      return;
    }

    ws.on("close", () => {
      try {
        doc.removeWebSocket(ws);
      } catch {
        // ignore
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 MML + Arweave Wayfinder running on http://localhost:${PORT}`);
    console.log(`\n   Connect to any asset via:`);
    console.log(`   wss://mml.jdunkglbs.com/POKE/059-ARCANINE`);
    console.log(`   wss://mml.jdunkglbs.com/POKE/006-CHARIZARD`);
    console.log(`\n   API endpoints:`);
    console.log(`   http://localhost:${PORT}/api/assets`);
    console.log(`   http://localhost:${PORT}/api/resolved\n`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
