const router  = require("express").Router();
const { ensureAuth } = require("../middleware/auth");

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ACTIONS = {
  continue:    { system: "You are a writing assistant. Continue the user's post naturally. Output ONLY the continuation.", prompt: ({ title, body }) => `Continue this post.

Title: ${title}

Content:
${body}

Continuation:` },
  improve:     { system: "You are an expert editor. Improve the writing but keep the author's voice. Output ONLY the improved text.", prompt: ({ title, body }) => `Improve this post:

Title: ${title}

Content:
${body}

Improved:` },
  shorten:     { system: "Shorten the text to half while keeping key points. Output ONLY the shortened version.", prompt: ({ body }) => `Shorten this:

${body}

Shortened:` },
  titles:      { system: "Generate 5 compelling title options. Output ONLY a numbered list.", prompt: ({ body }) => `5 title options for:

${body}

Titles:` },
  tone_formal: { system: "Rewrite in professional formal tone. Output ONLY the rewritten text.", prompt: ({ body }) => `Formal version:

${body}

Formal:` },
  tone_casual: { system: "Rewrite in casual friendly tone. Output ONLY the rewritten text.", prompt: ({ body }) => `Casual version:

${body}

Casual:` },
  intro:       { system: "Write a compelling opening paragraph. Output ONLY the intro.", prompt: ({ title, body }) => `Write an intro for:

Title: ${title}

Content:
${body}

Intro:` },
};

async function stream(res, messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.write(`data: ${JSON.stringify({ error: "OPENAI_API_KEY not set in .env" })}

`); return res.end(); }

  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o", stream: true, max_tokens: 800, temperature: 0.75, messages }),
  });

  if (!resp.ok) {
    const e = await resp.json();
    res.write(`data: ${JSON.stringify({ error: e.error?.message || "OpenAI error" })}

`);
    return res.end();
  }

  const reader = resp.body.getReader();
  const dec    = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split(" ")) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") { res.write("data: [DONE]"); continue; }
      try {
        const p = JSON.parse(raw);
        const t = p.choices?.[0]?.delta?.content;
        if (t) res.write(`data: ${JSON.stringify({ token: t })}

`);
      } catch (_) {}
    }
  }
  res.end();
}

router.post("/assist", ensureAuth, async (req, res) => {
  const { action, title = "", body = "" } = req.body;
  if (!ACTIONS[action]) return res.status(400).json({ error: "Invalid action." });
  if (!body.trim() && action !== "continue") return res.status(400).json({ error: "Write some content first." });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  try {
    const cfg = ACTIONS[action];
    await stream(res, [{ role: "system", content: cfg.system }, { role: "user", content: cfg.prompt({ title, body }) }]);
  } catch (e) { res.write(`data: ${JSON.stringify({ error: "Failed to reach OpenAI." })}

`); res.end(); }
});

router.post("/custom", ensureAuth, async (req, res) => {
  const { instruction, title = "", body = "" } = req.body;
  if (!instruction || !body.trim()) return res.status(400).json({ error: "Instruction and content required." });
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  try {
    await stream(res, [
      { role: "system",  content: "You are a writing assistant. Follow the instruction exactly. Output ONLY the result." },
      { role: "user",    content: `Title: ${title}

Content:
${body}

Instruction: ${instruction}

Result:` },
    ]);
  } catch (e) { res.write(`data: ${JSON.stringify({ error: "Failed to reach OpenAI." })}

`); res.end(); }
});

module.exports = router;
