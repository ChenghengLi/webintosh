// App registry. Every folder under src/apps/<id>/ must contain an `app.js`
// default-exporting the app metadata (see AGENTS.md for the contract).
// Apps self-register here via glob import — no shared file needs editing.

const modules = import.meta.glob('./*/app.js', { eager: true })

export const apps = {}
for (const path in modules) {
  const meta = modules[path].default
  if (meta && meta.id) apps[meta.id] = meta
}

export function getApp(id) {
  return apps[id]
}
