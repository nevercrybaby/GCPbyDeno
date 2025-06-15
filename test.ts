// galaxycloud.ts

import { exists } from "https://deno.land/std/fs/exists.ts";

// ✅ ENVIRONMENT VARIABLES
const envUUID = Deno.env.get('UUID') || 'e5185305-1984-4084-81e0-f77271159c62';
const proxyIP = Deno.env.get('PROXYIP') || '';
const credit = 'GalaxyCloud-Proxy';

// ✅ CONFIG FILE NAME
const CONFIG_FILE = 'config.json';

interface Config {
  uuid?: string;
}

// ✅ UUID FUNCTIONS
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function getUUIDFromConfig(): Promise<string | undefined> {
  if (await exists(CONFIG_FILE)) {
    try {
      const configText = await Deno.readTextFile(CONFIG_FILE);
      const config: Config = JSON.parse(configText);
      if (config.uuid && isValidUUID(config.uuid)) {
        console.log(`✅ Loaded UUID from config.json: ${config.uuid}`);
        return config.uuid;
      }
    } catch (e) {
      console.warn(`⚠️ Error reading config.json:`, e.message);
    }
  }
  return undefined;
}

async function saveUUIDToConfig(uuid: string): Promise<void> {
  try {
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({ uuid }, null, 2));
    console.log(`✅ Saved UUID to config.json: ${uuid}`);
  } catch (e) {
    console.error(`❌ Failed to save UUID:`, e.message);
  }
}

// ✅ GET FINAL UUID
let userID: string;
if (envUUID && isValidUUID(envUUID)) {
  userID = envUUID;
  console.log(`✅ Using UUID from environment: ${userID}`);
} else {
  const configUUID = await getUUIDFromConfig();
  if (configUUID) {
    userID = configUUID;
  } else {
    userID = crypto.randomUUID();
    console.log(`✅ Generated new UUID: ${userID}`);
    await saveUUIDToConfig(userID);
  }
}

if (!isValidUUID(userID)) {
  throw new Error('❌ UUID is invalid.');
}

// ✅ HTML HELPERS
function getHomePage(uuid: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GalaxyCloud Proxy</title>
  <style>
    body { font-family: sans-serif; background: #111; color: #fff; text-align: center; padding: 5em; }
    a.button { background: #007bff; padding: 1em 2em; color: white; text-decoration: none; border-radius: 8px; }
    a.button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <h1>🚀 GalaxyCloud Proxy</h1>
  <p>Secure your connection using our VLESS WebSocket proxy</p>
  <a class="button" href="/${uuid}">📄 Get VLESS Config</a>
  <footer style="margin-top: 2em; font-size: 0.9em; color: #aaa;">
    Contact <a href="https://t.me/modsbots_tech" target="_blank">@modsbots_tech</a> for help.
  </footer>
</body>
</html>`;
}

function getVLESSConfigPage(uuid: string, hostname: string, port: number): string {
  const vlessURI = `vless://${uuid}@${hostname}:${port}?encryption=none&security=tls&sni=${hostname}&fp=randomized&type=ws&host=${hostname}&path=%2F%3Fed%3D2048#${credit}`;
  const clashYAML = `
- name: GalaxyCloud
  type: vless
  server: ${hostname}
  port: ${port}
  uuid: ${uuid}
  network: ws
  tls: true
  sni: ${hostname}
  ws-opts:
    path: "/?ed=2048"
    headers:
      host: ${hostname}
  client-fingerprint: chrome`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your VLESS Config</title>
  <style>
    body { font-family: sans-serif; background: #f5f5f5; color: #333; padding: 3em; }
    pre { background: #eee; padding: 1em; border-radius: 8px; }
    .copy { background: green; color: white; padding: 0.5em 1em; border: none; border-radius: 5px; cursor: pointer; margin-top: 1em; }
  </style>
</head>
<body>
  <h1>🔐 Your VLESS Configuration</h1>
  <h2>URI</h2>
  <pre id="vlessURI">${vlessURI}</pre>
  <button class="copy" onclick="copy('vlessURI')">Copy URI</button>

  <h2>Clash Meta</h2>
  <pre id="clash">${clashYAML.trim()}</pre>
  <button class="copy" onclick="copy('clash')">Copy Clash</button>

  <script>
    function copy(id) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text).then(() => alert('Copied!'));
    }
  </script>
</body>
</html>`;
}

// ✅ HTTP SERVER
Deno.serve(async (req: Request) => {
  const upgrade = req.headers.get("upgrade")?.toLowerCase() || '';
  const url = new URL(req.url);

  // Handle WebSocket upgrade
  if (upgrade === "websocket") {
    return await handleWebSocket(req);
  }

  // Home page
  if (url.pathname === "/") {
    return new Response(getHomePage(userID), {
      headers: { "Content-Type": "text/html" },
    });
  }

  // VLESS config page
  if (url.pathname === `/${userID}`) {
    const hostname = url.hostname || "galaxycloud.app";
    const port = 443;
    return new Response(getVLESSConfigPage(userID, hostname, port), {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Not found
  return new Response("404 Not Found", { status: 404 });
});


// ✅ WS Handler (Placeholder)
async function handleWebSocket(request: Request): Promise<Response> {
  const { socket, response } = Deno.upgradeWebSocket(request);

  socket.onopen = () => {
    console.log("✅ WebSocket connection opened.");
  };

  socket.onmessage = (event) => {
    console.log("📥 Message received:", event.data);
    socket.send("Server received your message.");
  };

  socket.onclose = () => {
    console.log("🔌 WebSocket connection closed.");
  };

  socket.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
  };

  return response;
}
