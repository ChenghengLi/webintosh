// Tiny markdown renderer for Claude replies: fenced code blocks, **bold**, `code`, line breaks.

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function renderText(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function renderMarkdown(src) {
  if (!src) return ''
  // Split on ``` fences: even chunks are prose, odd chunks are code (first line may be a lang tag).
  const chunks = String(src).split('```')
  let html = ''
  for (let i = 0; i < chunks.length; i++) {
    if (i % 2 === 0) {
      html += renderText(chunks[i])
    } else {
      let code = chunks[i].replace(/^\n/, '').replace(/\n$/, '')
      const firstNl = code.indexOf('\n')
      const firstLine = firstNl === -1 ? code : code.slice(0, firstNl)
      if (/^\w{1,20}$/.test(firstLine.trim()) && firstNl !== -1) code = code.slice(firstNl + 1)
      html += `<pre><code>${escapeHtml(code)}</code></pre>`
    }
  }
  return html
}
