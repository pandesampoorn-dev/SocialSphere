// AI Writing Assistant — SSE streaming client
(function () {
  const titleEl       = document.getElementById("postTitle");
  const bodyEl        = document.getElementById("postBody");
  const aiPanel       = document.getElementById("aiPanel");
  const aiToggleBtn   = document.getElementById("aiToggleBtn");
  const aiCloseBtn    = document.getElementById("aiCloseBtn");
  const editorCol     = document.getElementById("editorCol");

  const aiOutput      = document.getElementById("aiOutput");
  const aiOutputText  = document.getElementById("aiOutputText");
  const aiOutputLabel = document.getElementById("aiOutputLabel");
  const aiLoading     = document.getElementById("aiLoading");
  const aiOutputActions = document.getElementById("aiOutputActions");
  const aiOutputClose = document.getElementById("aiOutputClose");
  const aiError       = document.getElementById("aiError");

  const aiReplaceBtn  = document.getElementById("aiReplaceBtn");
  const aiAppendBtn   = document.getElementById("aiAppendBtn");
  const aiCopyBtn     = document.getElementById("aiCopyBtn");
  const customBtn     = document.getElementById("customBtn");
  const customInput   = document.getElementById("customInstruction");

  // char counter
  const charCount = document.getElementById("charCount");
  if (bodyEl && charCount) {
    const update = () => charCount.textContent = bodyEl.value.length;
    bodyEl.addEventListener("input", update);
    update();
  }

  // ── Toggle panel ────────────────────────────────────────
  function openPanel() {
    aiPanel.style.display = "block";
    editorCol.classList.remove("col");
    editorCol.classList.add("col-lg-8");
    aiToggleBtn.textContent = "Hide AI";
  }
  function closePanel() {
    aiPanel.style.display = "none";
    editorCol.classList.remove("col-lg-8");
    editorCol.classList.add("col");
    aiToggleBtn.textContent = "AI Assistant";
  }

  aiToggleBtn.addEventListener("click", () => {
    aiPanel.style.display === "none" ? openPanel() : closePanel();
  });
  aiCloseBtn.addEventListener("click", closePanel);

  // ── Streaming helper ────────────────────────────────────
  let currentController = null;

  function showLoading(label) {
    aiError.style.display   = "none";
    aiOutput.style.display  = "block";
    aiOutputLabel.textContent = label;
    aiOutputText.textContent  = "";
    aiLoading.style.display   = "block";
    aiOutputActions.style.display = "none";
  }

  function showError(msg) {
    aiError.textContent    = msg;
    aiError.style.display  = "block";
    aiOutput.style.display = "none";
  }

  function finishStream() {
    aiLoading.style.display       = "none";
    aiOutputActions.style.display = "flex";
  }

  async function runStream(url, payload, label) {
    if (currentController) currentController.abort();
    currentController = new AbortController();

    showLoading(label);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: currentController.signal,
      });

      if (!resp.ok) {
        const data = await resp.json();
        return showError(data.error || "Request failed.");
      }

      const reader = resp.body.getReader();
      const dec    = new TextDecoder();
      let buffer   = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { finishStream(); continue; }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) { showError(parsed.error); return; }
            if (parsed.token) aiOutputText.textContent += parsed.token;
          } catch (_) {}
        }
      }
      // flush remaining buffer
      if (buffer.startsWith("data: ")) {
        const raw = buffer.slice(6).trim();
        if (raw !== "[DONE]") {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.token) aiOutputText.textContent += parsed.token;
          } catch (_) {}
        }
      }
      finishStream();
    } catch (e) {
      if (e.name !== "AbortError") showError("Connection error. Please try again.");
    }
  }

  // ── Quick action buttons ────────────────────────────────
  const ACTION_LABELS = {
    continue:    "Continue Writing",
    improve:     "Improve Writing",
    shorten:     "Shorten Post",
    intro:       "Write Intro",
    titles:      "Suggest Titles",
    tone_formal: "Formal Tone",
    tone_casual: "Casual Tone",
  };

  document.querySelectorAll(".ai-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const title  = titleEl ? titleEl.value.trim() : "";
      const body   = bodyEl  ? bodyEl.value.trim()  : "";

      if (!body && action !== "continue") {
        showError("Write some content first.");
        aiOutput.style.display = "block";
        aiLoading.style.display = "none";
        return;
      }

      runStream("/ai/assist", { action, title, body }, ACTION_LABELS[action] || action);
    });
  });

  // ── Custom instruction ──────────────────────────────────
  customBtn.addEventListener("click", () => {
    const instruction = customInput.value.trim();
    const title = titleEl ? titleEl.value.trim() : "";
    const body  = bodyEl  ? bodyEl.value.trim()  : "";

    if (!instruction) { showError("Enter a custom instruction first."); aiOutput.style.display = "block"; aiLoading.style.display = "none"; return; }
    if (!body)         { showError("Write some content first.");         aiOutput.style.display = "block"; aiLoading.style.display = "none"; return; }

    runStream("/ai/custom", { instruction, title, body }, "Custom");
  });

  // ── Output actions ──────────────────────────────────────
  aiReplaceBtn.addEventListener("click", () => {
    if (bodyEl) bodyEl.value = aiOutputText.textContent.trim();
    if (charCount) charCount.textContent = bodyEl.value.length;
  });

  aiAppendBtn.addEventListener("click", () => {
    if (bodyEl) {
      const sep = bodyEl.value.trim() ? "\n\n" : "";
      bodyEl.value += sep + aiOutputText.textContent.trim();
      if (charCount) charCount.textContent = bodyEl.value.length;
    }
  });

  aiCopyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(aiOutputText.textContent.trim()).then(() => {
      aiCopyBtn.textContent = "Copied!";
      setTimeout(() => aiCopyBtn.textContent = "Copy", 1500);
    });
  });

  aiOutputClose.addEventListener("click", () => {
    aiOutput.style.display = "none";
    aiError.style.display  = "none";
    if (currentController) currentController.abort();
  });
})();
