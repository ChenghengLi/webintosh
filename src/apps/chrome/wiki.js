// Self-contained Wikipedia API client for Chrome.
// en.wikipedia.org's API is CORS-open (origin=*), so searches and article
// fetches work directly from the browser.

const API = 'https://en.wikipedia.org/w/api.php'

async function apiGet(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', origin: '*', ...params })
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error('Wikipedia request failed (HTTP ' + res.status + ')')
  return res.json()
}

// OpenSearch: returns [{ title, snippet }] (up to 8 hits).
export async function searchWikipedia(q) {
  const data = await apiGet({ action: 'opensearch', limit: '8', search: q })
  if (!Array.isArray(data)) throw new Error(data?.error?.info || 'Search failed')
  const titles = data[1] || []
  const snippets = data[2] || []
  return titles.map((title, i) => ({ title, snippet: snippets[i] || '' }))
}

// Parsed article HTML (redirects followed). Returns { title, html }.
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

// Canonical display URL for an article (shown in the omnibox / results).
export function articleUrl(title) {
  return 'en.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_'))
}
