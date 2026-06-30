import { joinRoom } from "https://esm.sh/trystero@0.21.0/torrent";

const APP_ID = "session-chat-static-github-pages";

const joinPanel = document.querySelector("#joinPanel");
const chatPanel = document.querySelector("#chatPanel");
const sessionForm = document.querySelector("#sessionForm");
const sessionCodeInput = document.querySelector("#sessionCode");
const randomCodeButton = document.querySelector("#randomCodeButton");
const roomLabel = document.querySelector("#roomLabel");
const statusBar = document.querySelector("#statusBar");
const messages = document.querySelector("#messages");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const copyLinkButton = document.querySelector("#copyLinkButton");
const leaveButton = document.querySelector("#leaveButton");
const messageTemplate = document.querySelector("#messageTemplate");

const baseTitle = document.title;

let room = null;
let sendChatMessage = null;
let peers = new Set();
let unreadCount = 0;

const adjectives = ["LUNE", "SOLEIL", "RIVAGE", "PIXEL", "BRUME", "NOVA", "ONDE"];

function normalizeCode(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32);
}

function createSessionCode() {
  const word = adjectives[Math.floor(Math.random() * adjectives.length)];
  const number = crypto.getRandomValues(new Uint16Array(1))[0] % 10000;
  return `${word}-${String(number).padStart(4, "0")}`;
}

function setRouteCode(code) {
  const url = new URL(window.location.href);
  url.searchParams.set("session", code);
  window.history.replaceState({}, "", url);
}

function getRouteCode() {
  return normalizeCode(new URL(window.location.href).searchParams.get("session") || "");
}

function setStatus() {
  const count = peers.size;
  statusBar.textContent =
    count === 0
      ? "En attente d'une autre personne dans cette session..."
      : `${count} personne${count > 1 ? "s" : ""} connectee${count > 1 ? "s" : ""}.`;
}

function updateTitleNotification() {
  document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
}

function clearUnreadMessages() {
  unreadCount = 0;
  updateTitleNotification();
}

function markUnreadMessage() {
  if (!document.hidden) return;
  unreadCount += 1;
  updateTitleNotification();
}

function addMessage(text, type = "received", date = new Date()) {
  const node = messageTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(type);
  node.querySelector(".message-text").textContent = text;

  const time = node.querySelector(".message-time");
  time.textContent = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  time.dateTime = date.toISOString();

  messages.append(node);
  messages.scrollTop = messages.scrollHeight;
}

function enterChatView(code) {
  roomLabel.textContent = code;
  joinPanel.classList.add("hidden");
  chatPanel.classList.remove("hidden");
  messageInput.focus();
}

function leaveRoom() {
  if (room) {
    room.leave();
  }

  room = null;
  sendChatMessage = null;
  peers = new Set();
  clearUnreadMessages();
  messages.replaceChildren();
  statusBar.textContent = "Connexion au salon...";
  chatPanel.classList.add("hidden");
  joinPanel.classList.remove("hidden");

  const url = new URL(window.location.href);
  url.searchParams.delete("session");
  window.history.replaceState({}, "", url);
  sessionCodeInput.focus();
}

async function joinSession(rawCode) {
  const code = normalizeCode(rawCode) || createSessionCode();
  sessionCodeInput.value = code;
  setRouteCode(code);
  enterChatView(code);

  room = joinRoom({ appId: APP_ID }, code);
  const [sendMessage, getChatMessage] = room.makeAction("chat");
  sendChatMessage = sendMessage;

  room.onPeerJoin((peerId) => {
    peers.add(peerId);
    setStatus();
    addMessage("Une personne vient de rejoindre la session.", "system");
  });

  room.onPeerLeave((peerId) => {
    peers.delete(peerId);
    setStatus();
    addMessage("Une personne a quitte la session.", "system");
  });

  getChatMessage((payload) => {
    if (!payload || typeof payload.text !== "string") return;
    addMessage(payload.text, "received", new Date(payload.sentAt || Date.now()));
    markUnreadMessage();
  });

  setStatus();
  addMessage(`Session ${code} ouverte. Partage le lien ou le code pour discuter.`, "system");
}

sessionCodeInput.addEventListener("input", () => {
  const caret = sessionCodeInput.selectionStart;
  sessionCodeInput.value = normalizeCode(sessionCodeInput.value);
  sessionCodeInput.setSelectionRange(caret, caret);
});

randomCodeButton.addEventListener("click", () => {
  sessionCodeInput.value = createSessionCode();
  sessionCodeInput.focus();
});

sessionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  joinSession(sessionCodeInput.value);
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !sendChatMessage) return;

  const payload = {
    text,
    sentAt: new Date().toISOString(),
  };

  sendChatMessage(payload);
  addMessage(text, "own", new Date(payload.sentAt));
  messageInput.value = "";
  messageInput.style.height = "auto";
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    messageForm.requestSubmit();
  }
});

copyLinkButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(window.location.href);
  const previous = copyLinkButton.textContent;
  copyLinkButton.textContent = "Lien copie";
  window.setTimeout(() => {
    copyLinkButton.textContent = previous;
  }, 1400);
});

leaveButton.addEventListener("click", leaveRoom);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    clearUnreadMessages();
  }
});

const initialCode = getRouteCode();
sessionCodeInput.value = initialCode || createSessionCode();

if (initialCode) {
  joinSession(initialCode);
}
