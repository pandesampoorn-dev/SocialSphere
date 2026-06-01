const router = require("express").Router();
const { ensureAuth } = require("../middleware/auth");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_URL   = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY}`;

const ACTIONS = {
  continue:    { system: "You are a writing assistant. Continue the user's post naturally. Output ONLY the continuation.", prompt: ({ title, body }) => `Continue this post.\n\nTitle: ${title}\n\nContent:\n${body}\n\nContinuation:` },
  improve:     { system: "You are an expert editor. Improve the writing but keep the author's voice. Output ONLY the improved text.", prompt: ({ title, body }) => `Improve this post:\n\nTitle: ${title}\n\nContent:\n${body}\n\nImproved:` },
  shorten:     { system: "Shorten the text to half while keeping key points. Output ONLY the shortened version.", prompt: ({ body }) => `Shorten this:\n\n${body}\n\nShortened:` },
  titles:      { system: "Generate 5 compelling title options. Output ONLY a numbered list.", prompt: ({ body }) => `5 title options for:\n\n${body}\n\nTitles:` },
  tone_formal: { system: "Rewrite in professional formal tone. Output ONLY the rewritten text.", prompt: ({ body }) => `Formal version:\n\n${body}\n\nFormal:` },
  tone_casual: { system: "Rewrite in casual friendly tone. Output ONLY the rewritten text.", prompt: ({ body }) => `Casual version:\n\n${body}\n\nCasual:` },
  intro:       { system: "Write a compelling opening paragraph. Output ONLY the intro.", prompt: ({ title, body }) => `Write an intro for:\n\nTitle: ${title}\n\nContent:\n${body}\n\nIntro:` },
};

async function stream(res, systemText, userText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ error: "GEMINI_API_KEY not set in environment variables." })}\n\n`);
    return res.end();
  }

  const resp = await fetch(GEMINI_URL(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemText }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.75 },
    }),
  });

  if (!resp.ok) {
    const e = await resp.json();
    res.write(`data: ${JSON.stringify({ error: e.error?.message || "Gemini API error" })}\n\n`);
    return res.end();
  }

  const reader = resp.body.getReader();
  const dec    = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = dec.decode(value);
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
      } catch (_) {}
    }
  }
  res.write("data: [DONE]\n\n");
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
    await stream(res, cfg.system, cfg.prompt({ title, body }));
  } catch (e) {
    console.error(e);
    res.write(`data: ${JSON.stringify({ error: "Failed to reach Gemini." })}\n\n`);
    res.end();
  }
});

router.post("/custom", ensureAuth, async (req, res) => {
  const { instruction, title = "", body = "" } = req.body;
  if (!instruction || !body.trim()) return res.status(400).json({ error: "Instruction and content required." });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    await stream(
      res,
      "You are a writing assistant. Follow the instruction exactly. Output ONLY the result.",
      `Title: ${title}\n\nContent:\n${body}\n\nInstruction: ${instruction}\n\nResult:`
    );
  } catch (e) {
    console.error(e);
    res.write(`data: ${JSON.stringify({ error: "Failed to reach Gemini." })}\n\n`);
    res.end();
  }
});

module.exports = router;
