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
const emojiButton = document.querySelector("#emojiButton");
const emojiPicker = document.querySelector("#emojiPicker");
const replyPreview = document.querySelector("#replyPreview");
const replyAuthor = document.querySelector("#replyAuthor");
const replyText = document.querySelector("#replyText");
const cancelReplyButton = document.querySelector("#cancelReplyButton");
const copyLinkButton = document.querySelector("#copyLinkButton");
const leaveButton = document.querySelector("#leaveButton");
const messageTemplate = document.querySelector("#messageTemplate");

const baseTitle = document.title;

let room = null;
let sendChatMessage = null;
let peers = new Set();
let unreadCount = 0;
let currentReply = null;

const displayedMessages = new Map();

const adjectives = ["LUNE", "SOLEIL", "RIVAGE", "PIXEL", "BRUME", "NOVA", "ONDE"];
const quickEmojis = ["😀", "😂", "😍", "🥰", "😎", "😢", "😮", "👍", "👏", "🙏", "❤️", "🔥", "✨", "🎉"];

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

function createMessageId() {
  const randomPart = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  return `${Date.now().toString(36)}-${randomPart}`;
}

function clipReplyText(text) {
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function setReplyTarget(message) {
  currentReply = {
    id: message.id,
    author: message.author,
    text: clipReplyText(message.text),
  };
  replyAuthor.textContent = `Reponse a ${currentReply.author}`;
  replyText.textContent = currentReply.text;
  replyPreview.classList.remove("hidden");
  messageInput.focus();
}

function clearReplyTarget() {
  currentReply = null;
  replyPreview.classList.add("hidden");
  replyAuthor.textContent = "";
  replyText.textContent = "";
}

function adaptIncomingReply(replyTo) {
  if (!replyTo?.text) return null;
  return {
    ...replyTo,
    author: replyTo.author === "Vous" ? "Contact" : "Vous",
  };
}

function addMessage(message, type = "received") {
  const node = messageTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(type);
  node.dataset.messageId = message.id;
  node.querySelector(".message-text").textContent = message.text;

  const quotedMessage = node.querySelector(".quoted-message");
  if (message.replyTo?.text) {
    quotedMessage.querySelector(".quoted-author").textContent = message.replyTo.author || "Message";
    quotedMessage.querySelector(".quoted-text").textContent = message.replyTo.text;
    quotedMessage.classList.remove("hidden");
  }

  const time = node.querySelector(".message-time");
  const date = new Date(message.sentAt || Date.now());
  time.textContent = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  time.dateTime = date.toISOString();

  if (type === "system") {
    node.querySelector(".reply-button").remove();
  } else {
    displayedMessages.set(message.id, {
      id: message.id,
      author: message.author,
      text: message.text,
    });
  }

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
  clearReplyTarget();
  displayedMessages.clear();
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
    addMessage(
      {
        id: createMessageId(),
        text: "Une personne vient de rejoindre la session.",
        sentAt: new Date().toISOString(),
      },
      "system",
    );
  });

  room.onPeerLeave((peerId) => {
    peers.delete(peerId);
    setStatus();
    addMessage(
      {
        id: createMessageId(),
        text: "Une personne a quitte la session.",
        sentAt: new Date().toISOString(),
      },
      "system",
    );
  });

  getChatMessage((payload) => {
    if (!payload || typeof payload.text !== "string") return;
    addMessage(
      {
        id: payload.id || createMessageId(),
        author: "Contact",
        text: payload.text,
        sentAt: payload.sentAt || new Date().toISOString(),
        replyTo: adaptIncomingReply(payload.replyTo),
      },
      "received",
    );
    markUnreadMessage();
  });

  setStatus();
  addMessage(
    {
      id: createMessageId(),
      text: `Session ${code} ouverte. Partage le lien ou le code pour discuter.`,
      sentAt: new Date().toISOString(),
    },
    "system",
  );
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
    id: createMessageId(),
    text,
    sentAt: new Date().toISOString(),
    replyTo: currentReply,
  };

  sendChatMessage(payload);
  addMessage(
    {
      ...payload,
      author: "Vous",
    },
    "own",
  );
  messageInput.value = "";
  messageInput.style.height = "auto";
  clearReplyTarget();
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

messages.addEventListener("click", (event) => {
  const replyButton = event.target.closest(".reply-button");
  if (!replyButton) return;

  const messageNode = replyButton.closest(".message");
  const message = displayedMessages.get(messageNode?.dataset.messageId);
  if (message) {
    setReplyTarget(message);
  }
});

quickEmojis.forEach((emoji) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = emoji;
  button.title = emoji;
  emojiPicker.append(button);
});

emojiButton.addEventListener("click", () => {
  emojiPicker.classList.toggle("hidden");
});

emojiPicker.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const emoji = button.textContent;
  messageInput.setRangeText(emoji, start, end, "end");
  messageInput.focus();
  messageInput.dispatchEvent(new Event("input"));
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".emoji-wrap")) return;
  emojiPicker.classList.add("hidden");
});

cancelReplyButton.addEventListener("click", clearReplyTarget);

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
