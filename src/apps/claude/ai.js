// Simulated Claude response generator — pattern-matches a handful of topics,
// falls back to a structured answer that paraphrases the question.

const QUANTUM = `**Quantum computing** in a nutshell:

A classical computer stores information as bits — each one is either \`0\` or \`1\`. A quantum computer uses **qubits**, which can exist in a *superposition* of both states at once. Two more ingredients make this powerful:

- **Entanglement** — qubits can be correlated so measuring one instantly constrains the other, no matter the distance.
- **Interference** — quantum algorithms amplify the probability of correct answers and cancel out wrong ones.

The catch: qubits are fragile. **Decoherence** (noise from the environment) destroys the quantum state in microseconds, so machines run near absolute zero and need heavy error correction.

For a taste of the math, a qubit state is written as:

\`\`\`
|ψ⟩ = α|0⟩ + β|1⟩,   where |α|² + |β|² = 1
\`\`\`

Measuring gives \`0\` with probability |α|² and \`1\` with probability |β|². Real speedups exist for factoring (Shor) and search (Grover) — but your Mac is in no danger of being replaced just yet.`

const HAIKU_MACOS = `Here's a haiku about macOS:

*Liquid glass at dawn —*
*a quiet dock rests below*
*the Tahoe mountains.*

Want another one, or a haiku on a different topic?`

function haiku(topic) {
  const t = topic.replace(/^(a|an|the|about|on)\s+/i, '').trim() || 'the world'
  return `Here's a haiku about **${t}**:

*soft circuits dreaming*
*${t.slice(0, 22)} drifts through still air*
*silicon sunrise*

Haiku follow a 5-7-5 syllable rhythm — mine take a little poetic license. Want me to try a different angle?`
}

const DEBUG = `Happy to help debug! Since I can't see your exact code, here's the systematic approach I'd take — plus a working example of the most common culprit, an **off-by-one / stale-state bug**:

**1. Reproduce it reliably.** A bug you can trigger on demand is 90% solved.
**2. Isolate the smallest failing case.** Comment out or stub everything unrelated.
**3. Add logging at the boundaries.** Print what goes in and what comes out.
**4. Check the usual suspects:** null/undefined, async timing, mutation of shared state, off-by-one loops.

Here's a classic async-state bug and its fix:

\`\`\`js
// 🐞 Bug: count is captured stale inside the closure
function Counter() {
  let count = 0
  setInterval(() => {
    count = count + 1 // works here, but in UI frameworks
    render(count)     // the captured value often goes stale
  }, 1000)
}

// ✅ Fix: always derive from the latest state
function useCounter() {
  const count = ref(0)
  setInterval(() => { count.value++ }, 1000)
  return count
}
\`\`\`

Paste your actual code and the error message, and I'll walk through it line by line.`

const WHO = `I'm **Claude**, an AI assistant made by **Anthropic**. I can help with writing, analysis, coding, math, brainstorming, and general questions — basically anything text-based.

A few things worth knowing about me:

- I aim to be **helpful, harmless, and honest** — I'll say "I don't know" rather than make things up.
- I can write and explain code in just about any language.
- I don't browse the web in this demo, so my answers come from what I already know.

What would you like to work on?`

const META = `Fun question — you're talking to a **simulated Claude** running inside a **macOS Tahoe clone** that was itself built entirely in the browser with Vue 3, Vite, and Pinia.

How this app works under the hood:

- The window, dock, and menu bar come from the shared macOS Web shell.
- My replies are generated **locally** by a small pattern-matching engine — no network calls, no real LLM.
- Your chats persist in \`localStorage\`, and the streaming effect is just a \`setInterval\` appending characters.

So: very much a duck-typed Claude. The feathers are real, though. Anything you'd like to test me on?`

const GREETING = `Hello! Great to see you. I'm ready to help with whatever you're working on — writing, code, questions, ideas, or just a chat. What's on your mind?`

const THANKS = `You're welcome! If anything else comes up — a follow-up question, a refinement, or something completely different — just type it below.`

function fallback(q) {
  const clean = q.replace(/\s+/g, ' ').trim()
  const short = clean.length > 80 ? clean.slice(0, 80).trimEnd() + '…' : clean
  const isQuestion = /\?\s*$/.test(clean) || /^(what|why|how|when|where|who|which|can|could|should|is|are|do|does)\b/i.test(clean)
  const opener = isQuestion
    ? `Good question — let me break down **"${short}"** for you.`
    : `Let's dig into **"${short}"**.`
  return `${opener}

Here's a structured way to think about it:

- **The core idea.** Strip the topic down to its fundamentals first — most confusion comes from skipping this step.
- **The moving parts.** Identify what interacts with what; drawing a quick diagram often reveals the answer on its own.
- **The practical side.** Theory only sticks when applied, so try a small concrete example before scaling up.

In short: start simple, verify each assumption, and iterate. If you can tell me a bit more context — what you're trying to achieve, or where you're stuck — I can give you a much more specific answer.`
}

const RULES = [
  { re: /quantum/i, fn: () => QUANTUM },
  { re: /haiku.*mac\s?os|mac\s?os.*haiku/i, fn: () => HAIKU_MACOS },
  { re: /\b(haiku|poem|poetry|sonnet|limerick)\b/i, fn: (q) => haiku(q.replace(/write|compose|make|a|haiku|poem|about|for me|please/gi, ' ').replace(/\s+/g, ' ')) },
  { re: /\b(debug|bug|error|fix my code|code review|stack ?trace|exception|not working|broken code)\b/i, fn: () => DEBUG },
  { re: /who are you|your name|what are you|about yourself|are you (claude|an ai|real|chatgpt)/i, fn: () => WHO },
  { re: /this (app|clone|demo)|mac\s?os web|is this real|are you real|vue|pinia|vite|simulat/i, fn: () => META },
  { re: /^\s*(hi|hello|hey|yo|good (morning|afternoon|evening)|howdy|greetings|sup)\b/i, fn: () => GREETING },
  { re: /thank|thanks|thx/i, fn: () => THANKS },
]

export function generateReply(question) {
  const q = String(question || '')
  for (const { re, fn } of RULES) {
    if (re.test(q)) return fn(q)
  }
  return fallback(q)
}
