// galaxycloud.ts

import { exists } from "https://deno.land/std/fs/exists.ts";

// ========== Constants ==========
const CONFIG_FILE = "config.json";
const DEFAULT_UUID = "e5185305-1984-4084-81e0-f77271159c62";
const CREDIT = "GalaxyCloud-Proxy";
const DOMAIN = "galaxycloud.app";
const DEFAULT_PORT = 443;

// ========== UUID Utility ==========
function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

async function getUUID(): Promise<string> {
  const envUUID = Deno.env.get("UUID");
  if (envUUID && isValidUUID(envUUID)) {
    console.log("✅ UUID from ENV:", envUUID);
    return envUUID;
  }

  if (await exists(CONFIG_FILE)) {
    try {
      const content = await Deno.readTextFile(CONFIG_FILE);
      const { uuid } = JSON.parse(content);
      if (uuid && isValidUUID(uuid)) {
        console.log("✅ UUID from config.json:", uuid);
        return uuid;
      }
    } catch (e) {
      console.warn("⚠️ Error loading config.json:", e.message);
    }
  }

  const newUUID = crypto.randomUUID();
  await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({ uuid: newUUID }, null, 2));
  console.log("✅ Generated new UUID:", newUUID);
  return newUUID;
}

// ========== HTML Generators ==========
function htmlHome(uuid: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>GalaxyCloud Proxy</title>
  <style>
    body { font-family: sans-serif; background: #111; color: white; text-align: center; padding-top: 5em; }
    a.button {
      display: inline-block;
      background: #1e90ff;
      color: white;
      padding: 1em 2em;
      margin-top: 2em;
      text-decoration: none;
      border-radius: 8px;
    }
    a.button:hover { background: #006ad1; }
  </style>
</head>
<body>
  <h1>🚀 Welcome to GalaxyCloud Proxy</h1>
  <p>Your secure VLESS over WebSocket server is online.</p>
  <a class="button" href="/${uuid}">📄 Get My Config</a>
</body>
</html>
`;
}

function htmlConfig(uuid: string, host: string): string {
  const vlessURI = `vless://${uuid}@${host}:${DEFAULT_PORT}?encryption=none&security=tls&sni=${host}&fp=randomized&type=ws&host=${host}&path=%2F%3Fed%3D2048#${CREDIT}`;
  const clashYAML = `
- name: GalaxyCloud
  type: vless
  server: ${host}
  port: ${DEFAULT_PORT}
  uuid: ${uuid}
  network: ws
  tls: true
  sni: ${host}
  client-fingerprint: chrome
  ws-opts:
    path: "/?ed=2048"
    headers:
      host: ${host}
`.trim();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>VLESS Configuration</title>
  <style>
    body { font-family: sans-serif; background: #f4f4f4; padding: 2em; color: #333; }
    pre { background: #eee; padding: 1em; border-radius: 6px; overflow-x: auto; }
    .copy-btn {
      margin-top: 1em;
      padding: 0.5em 1em;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    .copy-btn:hover { background: #218838; }
  </style>
</head>
<body>
  <h1>🔐 VLESS Configuration</h1>

  <h2>For v2rayN / V2RayNG</h2>
  <pre id="vless-uri">${vlessURI}</pre>
  <button class="copy-btn" onclick="copy('vless-uri')">Copy URI</button>

  <h2>For Clash.Meta</h2>
  <pre id="clash">${clashYAML}</pre>
  <button class="copy-btn" onclick="copy('clash')">Copy YAML</button>

  <script>
    function copy(id) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text)
        .then(() => alert("✅ Copied!"))
        .catch(() => alert("❌ Failed to copy."));
    }
  </script>
</body>
</html>
`;
}

// ========== WebSocket Handler ==========
async function handleWebSocket(req: Request): Promise<Response> {
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log("🔌 WebSocket connection established.");
  };

  socket.onmessage = (event) => {
    console.log("📨 WebSocket received:", event.data);
    socket.send("✅ GalaxyCloud Proxy: Connection acknowledged.");
  };

  socket.onclose = () => {
    console.log("❎ WebSocket connection closed.");
  };

  socket.onerror = (e) => {
    console.error("❗ WebSocket error:", e);
  };

  return response;
}

// ========== Server Setup ==========
const uuid = await getUUID();

Deno.serve(async (req: Request) => {
  const upgrade = req.headers.get("upgrade")?.toLowerCase();
  const url = new URL(req.url);
  const path = url.pathname;

  if (upgrade === "websocket") {
    return await handleWebSocket(req);
  }

  if (path === "/") {
    return new Response(htmlHome(uuid), { headers: { "Content-Type": "text/html" } });
  }

  if (path === `/${uuid}`) {
    const host = url.hostname || DOMAIN;
    return new Response(htmlConfig(uuid, host), { headers: { "Content-Type": "text/html" } });
  }

  return new Response("❌ 404 Not Found", { status: 404 });
});
