const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  delay
} = require("@whiskeysockets/baileys");

const Pino = require("pino");
const qrcode = require("qrcode-terminal");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "22.04"],
    markOnlineOnConnect: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 30000
  });

  // SAVE SESSION
  sock.ev.on("creds.update", saveCreds);

  // CONNECTION STATUS
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📲 SCAN THIS QR CODE WITH WHATSAPP\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp connected successfully!");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Logged out. Delete auth folder and scan again.");
      } else {
        console.log("⚠️ Connection lost. Reconnecting in 5s...");
        setTimeout(startBot, 5000);
      }
    }
  });

  // SIMPLE MESSAGE HANDLER
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === "menu") {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "✅ Bot is working!\n\n1️⃣ Products\n2️⃣ Contact"
      });
    }
  });
}

startBot();
