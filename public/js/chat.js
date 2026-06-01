const socket = io();
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const typingDiv = document.getElementById("typingIndicator");
const onlineListDiv = document.getElementById("onlineList");
const onlineCount = document.getElementById("onlineCount");
let typingTimeout;

socket.emit("join", { username: CURRENT_USER.username, avatar: CURRENT_USER.avatar });

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit("sendMsg", { username: CURRENT_USER.username, avatar: CURRENT_USER.avatar, message: text });
  msgInput.value = "";
  socket.emit("stopTyping");
  clearTimeout(typingTimeout);
}
sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
msgInput.addEventListener("input", function() {
  socket.emit("typing", { username: CURRENT_USER.username });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("stopTyping"), 1500);
});

socket.on("newMsg", function({ username, message, time }) {
  const welcome = messagesDiv.querySelector(".text-center");
  if (welcome) welcome.remove();
  const isOwn = username === CURRENT_USER.username;
  const initial = username[0].toUpperCase();
  const el = document.createElement("div");
  el.className = "chat-msg" + (isOwn ? " own" : "");
  el.innerHTML = `<div class="avatar-xs flex-shrink-0">${initial}</div>
    <div>
      ${!isOwn ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">@${username}</div>` : ""}
      <div class="chat-bubble">${escapeHtml(message)}</div>
      <div class="chat-meta">${time}</div>
    </div>`;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
socket.on("systemMsg", function(text) {
  const el = document.createElement("div");
  el.className = "system-msg";
  el.textContent = text;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
socket.on("typing", function(username) { if (username !== CURRENT_USER.username) typingDiv.textContent = username + " is typing..."; });
socket.on("stopTyping", function() { typingDiv.textContent = ""; });
socket.on("onlineList", function(users) {
  onlineCount.textContent = users.length + " online";
  onlineListDiv.innerHTML = users.map(u => `
    <div class="online-user-item">
      <div class="avatar-xs">${u.username[0].toUpperCase()}</div>
      <span>@${u.username}</span>
      <span style="width:7px;height:7px;background:#198754;border-radius:50%;display:inline-block;margin-left:auto;"></span>
    </div>`).join("");
});

function escapeHtml(str) { const d = document.createElement("div"); d.appendChild(document.createTextNode(str)); return d.innerHTML; }
