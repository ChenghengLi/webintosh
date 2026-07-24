<script setup>
// Wikipedia article reader for Chrome: sanitized HTML in a clean 760px
// column. Internal /wiki/<X> links navigate inside the tab (pushing
// history); everything external opens in a real browser window.
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  html: { type: String, default: '' },
})
const emit = defineEmits(['navigate'])

// Strip scripts, embeds, forms, inline styles and on* handlers; keep images
// (plain <img> loads cross-origin fine).
function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc
    .querySelectorAll('script, style, link, meta, iframe, object, embed, form, input, button, noscript')
    .forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('style')
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name)
    }
  })
  return doc.body.innerHTML
}

const sanitized = computed(() => sanitize(props.html))

function onArticleClick(e) {
  const a = e.target.closest('a')
  if (!a) return
  const href = a.getAttribute('href') || ''
  if (!href || href.startsWith('#')) return // in-page anchor: let it scroll
  e.preventDefault()
  e.stopPropagation()

  // Internal links come back as "./Title" or "/wiki/Title"
  let internal = null
  if (href.startsWith('/wiki/')) internal = href.slice(6)
  else if (href.startsWith('./')) internal = href.slice(2)

  if (internal) {
    const page = decodeURIComponent(internal.split('#')[0]).replace(/_/g, ' ')
    if (page && !page.includes(':')) {
      emit('navigate', page) // regular article → navigate this tab
    } else if (page) {
      window.open('https://en.wikipedia.org/wiki/' + encodeURIComponent(page), '_blank')
    }
  } else if (href.startsWith('/w/')) {
    window.open('https://en.wikipedia.org' + href, '_blank')
  } else if (href.startsWith('//')) {
    window.open('https:' + href, '_blank')
  } else if (/^https?:\/\//i.test(href)) {
    window.open(href, '_blank')
  }
}
</script>

<template>
  <div class="reader-wrap">
    <div v-if="!html" class="reader-loading">
      <span class="spin"></span> Loading article…
    </div>
    <div v-else class="reader" @click="onArticleClick">
      <h1 class="reader-title">{{ title }}</h1>
      <div class="reader-source">From Wikipedia, the free encyclopedia</div>
      <div class="reader-body" v-html="sanitized"></div>
    </div>
  </div>
</template>

<style scoped>
.reader-wrap { flex: 1; overflow-y: auto; background: var(--cx-content); }
.reader-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  color: var(--cx-dim);
  font-size: 13.5px;
}
.spin {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--cx-border);
  border-top-color: var(--cx-blue);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.reader {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px 36px 72px;
  font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  line-height: 1.65;
  color: var(--cx-text);
}
.reader-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28px;
  font-weight: 500;
  margin: 0 0 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--cx-border);
}
.reader-source { font-size: 12px; color: var(--cx-dim); margin: 6px 0 18px; }

/* Injected article HTML (needs :deep) */
.reader-body :deep(h2) {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 21px;
  font-weight: 500;
  margin: 26px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--cx-border);
}
.reader-body :deep(h3) { font-size: 16px; margin: 20px 0 6px; }
.reader-body :deep(h4), .reader-body :deep(h5) { font-size: 14px; margin: 16px 0 4px; }
.reader-body :deep(p) { margin: 0 0 12px; }
.reader-body :deep(a) { color: var(--cx-blue); text-decoration: none; cursor: default; }
.reader-body :deep(a:hover) { text-decoration: underline; }
.reader-body :deep(img) { max-width: 100%; height: auto; }
.reader-body :deep(ul), .reader-body :deep(ol) { margin: 0 0 12px; padding-left: 26px; }
.reader-body :deep(table) { max-width: 100%; border-collapse: collapse; font-size: 12.5px; }
.reader-body :deep(th), .reader-body :deep(td) { padding: 4px 8px; border: 0.5px solid var(--cx-border); }
.reader-body :deep(.infobox) {
  float: right;
  clear: right;
  width: 270px;
  max-width: 45%;
  margin: 0 0 14px 16px;
  padding: 8px;
  background: var(--cx-omni);
  border: 0.5px solid var(--cx-border);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
}
.reader-body :deep(.infobox th), .reader-body :deep(.infobox td) { border: none; padding: 3px 5px; vertical-align: top; }
.reader-body :deep(.thumb) { margin: 8px 0; }
.reader-body :deep(.thumbinner) {
  max-width: 100%;
  padding: 4px;
  background: var(--cx-omni);
  border: 0.5px solid var(--cx-border);
  border-radius: 6px;
}
.reader-body :deep(.thumbcaption) { font-size: 11.5px; color: var(--cx-dim); padding: 4px 2px; }
.reader-body :deep(.tright) { float: right; clear: right; margin: 0 0 12px 14px; }
.reader-body :deep(.tleft) { float: left; clear: left; margin: 0 14px 12px 0; }
.reader-body :deep(.hatnote) { font-size: 12px; color: var(--cx-dim); font-style: italic; }
.reader-body :deep(.reflist) { font-size: 11.5px; color: var(--cx-dim); }
.reader-body :deep(sup.reference) { font-size: 10px; }
.reader-body :deep(.navbox), .reader-body :deep(.metadata) { font-size: 12px; background: var(--cx-omni); }
.reader-body :deep(pre), .reader-body :deep(code) {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  background: var(--cx-omni);
  border-radius: 4px;
}
.reader-body :deep(blockquote) {
  margin: 12px 0;
  padding: 4px 16px;
  border-left: 3px solid var(--cx-border);
  color: var(--cx-dim);
}
.reader-body :deep(.mw-editsection) { display: none; }
</style>
