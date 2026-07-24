// Wikipedia API client — en.wikipedia.org's API is CORS-open (origin=*),
// so Safari can run real searches and fetch real article HTML from the browser.

const API = 'https://en.wikipedia.org/w/api.php'

async function apiGet(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', origin: '*', ...params })
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error('Wikipedia request failed (HTTP ' + res.status + ')')
  return res.json()
}

// Search Wikipedia. Returns [{ title, snippet }] (up to 8 hits).
export async function searchWikipedia(q) {
  const data = await apiGet({ action: 'opensearch', limit: '8', search: q })
  if (!Array.isArray(data)) throw new Error(data?.error?.info || 'Wikipedia search failed')
  const titles = data[1] || []
  const snippets = data[2] || []
  return titles.map((title, i) => ({ title, snippet: snippets[i] || '' }))
}

// Fetch a parsed article. Returns { title, html } (follows redirects).
export async function fetchArticle(title) {
  const data = await apiGet({
    action: 'parse',
    page: title,
    prop: 'text|displaytitle',
    disableeditsection: '1',
    redirects: '1',
  })
  if (data.error) throw new Error(data.error.info || 'Article not found')
  return { title: data.parse.title, html: data.parse.text['*'] }
}

// Display URL shown in the address bar / on result rows for an article.
export function articleUrl(title) {
  return 'en.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_'))
}
