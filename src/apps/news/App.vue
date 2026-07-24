<script setup>
import { ref, computed } from 'vue'
import { SECTIONS, CHANNELS, STORIES, buildArticle } from './data'
import SIcon from './SIcon.vue'
import StoryRow from './StoryRow.vue'

const LS_FOLLOW = 'macos-web:news-followed'
const LS_SAVED = 'macos-web:news-saved'

function loadIds(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return Array.isArray(v) ? v : fallback
  } catch {
    return fallback
  }
}

const selected = ref('today')
const query = ref('')
const openStoryId = ref(null)
const mainEl = ref(null)

// Followed channels (sidebar) and saved stories, both persisted.
const followed = ref(new Set(loadIds(LS_FOLLOW, CHANNELS.map((c) => c.name))))
const savedIds = ref(new Set(loadIds(LS_SAVED, [])))

const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

const sectionName = computed(() => {
  if (selected.value.startsWith('ch:')) return selected.value.slice(3)
  if (selected.value === 'saved') return 'Saved Stories'
  return (SECTIONS.find((s) => s.id === selected.value) || {}).name || 'Today'
})

const currentSection = computed(() => SECTIONS.find((s) => s.id === selected.value) || null)
const accent = computed(() => (currentSection.value ? currentSection.value.accent : '#e5342c'))

const channel = computed(() => {
  if (!selected.value.startsWith('ch:')) return null
  return CHANNELS.find((c) => c.name === selected.value.slice(3)) || null
})

const followedChannels = computed(() => CHANNELS.filter((c) => followed.value.has(c.name)))

const feed = computed(() => {
  let list = STORIES
  const sel = selected.value
  if (sel === 'newsplus') list = list.filter((s) => s.plus)
  else if (sel === 'saved') list = list.filter((s) => savedIds.value.has(s.id))
  else if (sel.startsWith('ch:')) list = list.filter((s) => s.source === sel.slice(3))
  else if (sel !== 'today') list = list.filter((s) => s.category === sel)
  const q = query.value.trim().toLowerCase()
  if (q) list = list.filter((s) => (s.headline + ' ' + s.source).toLowerCase().includes(q))
  return list
})

// Editorial layout (Today / topic sections / News+): hero, 2 secondary, group rows.
const isEditorial = computed(() => !channel.value && selected.value !== 'saved' && !query.value.trim())
const hero = computed(() => feed.value[0] || null)
const secondary = computed(() => feed.value.slice(1, 3))
const group = computed(() => feed.value.slice(3))
const groupTitle = computed(() => {
  if (selected.value === 'today') return 'For You'
  if (selected.value === 'newsplus') return 'More News+'
  return sectionName.value
})

const story = computed(() => STORIES.find((s) => s.id === openStoryId.value) || null)
const article = computed(() => (story.value ? buildArticle(story.value) : null))

// "Read more from <source>": same-source stories first, then same-category.
const related = computed(() => {
  if (!story.value) return []
  const same = STORIES.filter((s) => s.id !== story.value.id && s.source === story.value.source)
  const rest = STORIES.filter((s) => s.id !== story.value.id && s.source !== story.value.source && s.category === story.value.category)
  return [...same, ...rest].slice(0, 2)
})

const emptyMsg = computed(() => {
  const q = query.value.trim()
  if (q) return `No stories found for “${q}”.`
  if (selected.value === 'saved') return 'Stories you save will appear here. Tap the bookmark on any story to save it.'
  return 'No stories found.'
})

function gradCss(s) {
  return `linear-gradient(135deg, ${s.grad.join(', ')})`
}

const PALETTE = [
  ['#7c3aed', '#4c1d95'],
  ['#0ea5e9', '#1e3a8a'],
  ['#059669', '#065f46'],
  ['#f59e0b', '#b45309'],
  ['#ec4899', '#9d174d'],
  ['#475569', '#0f172a'],
]

function sourceBg(name) {
  const ch = CHANNELS.find((c) => c.name === name)
  if (ch) return ch.bg
  let h = 0
  for (const c of name) h += c.charCodeAt(0)
  const p = PALETTE[h % PALETTE.length]
  return `linear-gradient(150deg, ${p[0]}, ${p[1]})`
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function isChannel(name) {
  return CHANNELS.some((c) => c.name === name)
}

function isFollowed(name) {
  return followed.value.has(name)
}

function isSaved(id) {
  return savedIds.value.has(id)
}

function toggleFollow(name) {
  const next = new Set(followed.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  followed.value = next
  try {
    localStorage.setItem(LS_FOLLOW, JSON.stringify([...next]))
  } catch {}
}

function toggleSave(id) {
  const next = new Set(savedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  savedIds.value = next
  try {
    localStorage.setItem(LS_SAVED, JSON.stringify([...next]))
  } catch {}
}

function selectSection(id) {
  selected.value = id
  openStoryId.value = null
  if (mainEl.value) mainEl.value.scrollTop = 0
}

function openChannel(name) {
  if (isChannel(name)) selectSection('ch:' + name)
}

function open(s) {
  openStoryId.value = s.id
  if (mainEl.value) mainEl.value.scrollTop = 0
}

function back() {
  openStoryId.value = null
  if (mainEl.value) mainEl.value.scrollTop = 0
}
</script>

<template>
  <div class="app-root news">
    <div class="news-body">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="side-search">
          <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="query" class="search" type="text" placeholder="Search" spellcheck="false" />
        </div>
        <div
          v-for="s in SECTIONS"
          :key="s.id"
          class="side-item"
          :class="{ sel: selected === s.id }"
          @click="selectSection(s.id)"
        >
          <span class="si-emoji" :style="{ color: s.accent }"><SIcon :name="s.icon" /></span>
          <span class="si-name">{{ s.name }}</span>
        </div>
        <div class="side-label">Following</div>
        <div
          v-for="c in followedChannels"
          :key="c.name"
          class="side-item"
          :class="{ sel: selected === 'ch:' + c.name }"
          @click="selectSection('ch:' + c.name)"
        >
          <span class="ch-icon" :style="{ background: c.bg }">{{ c.name[0] }}</span>
          <span class="si-name">{{ c.name }}</span>
        </div>
        <div
          class="side-item"
          :class="{ sel: selected === 'saved' }"
          @click="selectSection('saved')"
        >
          <span class="si-emoji saved-ico"><SIcon name="bookmark" /></span>
          <span class="si-name">Saved Stories</span>
          <span v-if="savedIds.size" class="side-count">{{ savedIds.size }}</span>
        </div>
      </aside>

      <!-- Main pane -->
      <main ref="mainEl" class="main">
        <template v-if="!story">
          <!-- Channel page -->
          <template v-if="channel">
            <div class="ch-banner" :style="{ background: channel.bg }">
              <span class="ch-banner-initial">{{ channel.name[0] }}</span>
              <div class="ch-banner-main">
                <div class="ch-banner-name">{{ channel.name }}</div>
                <div class="ch-banner-desc">{{ channel.desc }}</div>
              </div>
              <button
                class="follow-btn"
                :class="{ following: isFollowed(channel.name) }"
                @click="toggleFollow(channel.name)"
              >
                <SIcon :name="isFollowed(channel.name) ? 'check' : 'plus-sm'" />
                {{ isFollowed(channel.name) ? 'Following' : 'Follow' }}
              </button>
            </div>
            <div class="ch-count">{{ feed.length }} {{ feed.length === 1 ? 'story' : 'stories' }}</div>
            <StoryRow
              v-for="s in feed"
              :key="s.id"
              :story="s"
              :saved="isSaved(s.id)"
              @open="open"
              @toggle-save="toggleSave($event.id)"
            />
            <div v-if="!feed.length" class="empty">
              <div class="empty-emoji"><SIcon name="news" /></div>
              {{ emptyMsg }}
            </div>
          </template>

          <!-- Editorial layout: Today / topic sections / News+ -->
          <template v-else-if="isEditorial">
            <header class="feed-head">
              <div class="feed-title" :style="selected !== 'today' ? { color: accent } : null">{{ sectionName }}</div>
              <div class="feed-date">{{ selected === 'today' ? dateStr : feed.length + (feed.length === 1 ? ' story' : ' stories') }}</div>
            </header>

            <div v-if="hero" class="hero" @click="open(hero)">
              <div class="hero-cover" :style="{ background: gradCss(hero) }">
                <span class="hero-emoji">{{ hero.emoji }}</span>
                <span v-if="hero.plus" class="plus-badge">News+</span>
                <button class="save-cover" :class="{ on: isSaved(hero.id) }" @click.stop="toggleSave(hero.id)">
                  <SIcon :name="isSaved(hero.id) ? 'bookmark-fill' : 'bookmark'" />
                </button>
              </div>
              <div class="hero-info">
                <div class="src">{{ hero.source }}</div>
                <div class="hero-head">{{ hero.headline }}</div>
                <div class="time">{{ hero.time }}</div>
              </div>
            </div>

            <div v-if="secondary.length" class="sec-grid">
              <div v-for="s in secondary" :key="s.id" class="sec-card" @click="open(s)">
                <div class="sec-cover" :style="{ background: gradCss(s) }">
                  <span class="sec-emoji">{{ s.emoji }}</span>
                  <span v-if="s.plus" class="plus-badge">News+</span>
                  <button class="save-cover" :class="{ on: isSaved(s.id) }" @click.stop="toggleSave(s.id)">
                    <SIcon :name="isSaved(s.id) ? 'bookmark-fill' : 'bookmark'" />
                  </button>
                </div>
                <div class="sec-info">
                  <div class="src">{{ s.source }}</div>
                  <div class="sec-head">{{ s.headline }}</div>
                  <div class="time">{{ s.time }}</div>
                </div>
              </div>
            </div>

            <div v-if="group.length" class="group-head">{{ groupTitle }}</div>
            <StoryRow
              v-for="s in group"
              :key="s.id"
              :story="s"
              :saved="isSaved(s.id)"
              @open="open"
              @toggle-save="toggleSave($event.id)"
            />

            <div v-if="!feed.length" class="empty">
              <div class="empty-emoji"><SIcon name="news" /></div>
              {{ emptyMsg }}
            </div>
          </template>

          <!-- Flat feed: Saved Stories / search results -->
          <template v-else>
            <header class="feed-head">
              <div class="feed-title" :style="currentSection && selected !== 'today' ? { color: accent } : null">{{ sectionName }}</div>
              <div class="feed-date">{{ feed.length + (feed.length === 1 ? ' story' : ' stories') }}</div>
            </header>
            <StoryRow
              v-for="s in feed"
              :key="s.id"
              :story="s"
              :saved="isSaved(s.id)"
              @open="open"
              @toggle-save="toggleSave($event.id)"
            />
            <div v-if="!feed.length" class="empty">
              <div class="empty-emoji"><SIcon :name="selected === 'saved' ? 'bookmark' : 'news'" /></div>
              {{ emptyMsg }}
            </div>
          </template>
        </template>

        <!-- Article view -->
        <template v-else>
          <div class="article-wrap">
            <div class="a-top">
              <button class="back" @click="back"><SIcon name="chev-left" /> {{ sectionName }}</button>
              <button
                class="save-lg"
                :class="{ on: isSaved(story.id) }"
                :title="isSaved(story.id) ? 'Remove from Saved Stories' : 'Save Story'"
                @click="toggleSave(story.id)"
              >
                <SIcon :name="isSaved(story.id) ? 'bookmark-fill' : 'bookmark'" />
              </button>
            </div>
            <div v-if="story.plus" class="plus-row">
              <span class="plus-logo">News<span class="plus-sign">+</span></span>
              <span class="plus-sub">This story is part of Apple News+ exclusive coverage.</span>
            </div>
            <div class="a-src">{{ story.source }}</div>
            <h1 class="a-head">{{ story.headline }}</h1>
            <div class="a-byline-row">
              <span class="avatar" :style="{ background: sourceBg(story.source) }">{{ initials(article.byline) }}</span>
              <div class="a-byline-main">
                <div class="a-byline">By {{ article.byline }}</div>
                <div class="a-meta">{{ story.source }} · {{ story.time }} · {{ article.minutes }} min read</div>
              </div>
            </div>
            <div class="a-cover" :style="{ background: gradCss(story) }">
              <span>{{ story.emoji }}</span>
            </div>
            <p v-for="(p, i) in article.paragraphs" :key="i" class="a-p">{{ p }}</p>
            <div class="a-end">— Reported for {{ story.source }} · {{ dateStr }}</div>

            <div v-if="related.length" class="more-card">
              <div class="more-head" :class="{ link: isChannel(story.source) }" @click="openChannel(story.source)">
                <span class="ch-icon" :style="{ background: sourceBg(story.source) }">{{ story.source[0] }}</span>
                <span class="more-title">Read more from {{ story.source }}</span>
                <span v-if="isChannel(story.source)" class="more-chev"><SIcon name="chev-right" /></span>
              </div>
              <div v-for="r in related" :key="r.id" class="more-row" @click="open(r)">
                <div class="more-info">
                  <div class="more-headline">{{ r.headline }}</div>
                  <div class="time">
                    {{ r.time }}
                    <span v-if="r.plus" class="plus-mini">News+</span>
                  </div>
                </div>
                <div class="more-thumb" :style="{ background: gradCss(r) }">{{ r.emoji }}</div>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.news {
  --nred: #e5342c;
  color: var(--text);
  font-size: 13px;
}
.news-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ---------- sidebar ---------- */
.sidebar {
  width: 224px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 0.5px solid var(--border);
  overflow-y: auto;
  padding-bottom: 10px;
}
.side-search {
  position: relative;
  padding: 10px 12px 8px;
}
.search-ico {
  position: absolute;
  left: 20px;
  top: 15px;
  width: 11px;
  height: 11px;
  opacity: 0.55;
  pointer-events: none;
}
.search {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px 4px 24px;
  font-size: 12px;
  color: var(--text);
  background: var(--hover);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  outline: none;
}
.search:focus {
  box-shadow: 0 0 0 3px var(--selection);
}
.side-item {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 1px 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: default;
}
.side-item:hover:not(.sel) {
  background: var(--hover);
}
.side-item.sel {
  background: var(--selection);
}
.si-emoji {
  width: 20px;
  text-align: center;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
.si-emoji svg {
  width: 15px;
  height: 15px;
  display: block;
}
.saved-ico {
  color: var(--nred);
}
.si-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.side-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
}
.ch-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
}
.side-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  padding: 12px 16px 4px;
}

/* ---------- shared feed bits ---------- */
.main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 20px 28px 48px;
}
.feed-head {
  margin-bottom: 16px;
}
.feed-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.feed-date {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
}
.src {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--nred);
}
.time {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 3px;
}
.plus-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
}
.plus-mini {
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  color: var(--nred);
  border: 0.5px solid var(--nred);
  vertical-align: 1px;
}
.save-cover {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}
.save-cover.on {
  color: #ff7a72;
}
.save-cover svg {
  width: 14px;
  height: 14px;
  display: block;
}
.empty {
  padding: 48px 0;
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
}
.empty-emoji {
  margin-bottom: 8px;
  display: inline-flex;
}
.empty-emoji svg {
  width: 36px;
  height: 36px;
  display: block;
}

/* ---------- hero + secondary ---------- */
.hero {
  border: 0.5px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--window-bg);
  margin-bottom: 18px;
  cursor: default;
  transition: box-shadow 0.15s ease;
}
.hero:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.14);
}
.hero-cover {
  position: relative;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-emoji {
  font-size: 96px;
  opacity: 0.9;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.35));
}
.hero-info {
  padding: 14px 18px 16px;
}
.hero-head {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 4px;
}
.sec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 6px;
}
.sec-card {
  border: 0.5px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--window-bg);
  cursor: default;
  transition: box-shadow 0.15s ease;
}
.sec-card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.14);
}
.sec-cover {
  position: relative;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sec-emoji {
  font-size: 54px;
  opacity: 0.9;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
}
.sec-info {
  padding: 11px 14px 13px;
}
.sec-head {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.group-head {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.2px;
  margin: 20px 0 6px;
  padding-bottom: 8px;
  border-bottom: 0.5px solid var(--border);
}

/* ---------- channel page ---------- */
.ch-banner {
  position: relative;
  min-height: 140px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  gap: 14px;
  padding: 18px 20px;
  margin-bottom: 14px;
}
.ch-banner-initial {
  position: absolute;
  top: -34px;
  right: 8px;
  font-size: 150px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.14);
  pointer-events: none;
  line-height: 1;
}
.ch-banner-main {
  flex: 1;
  min-width: 0;
}
.ch-banner-name {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
}
.ch-banner-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
}
.follow-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.94);
  color: #1c1c1e;
  cursor: default;
}
.follow-btn.following {
  background: rgba(255, 255, 255, 0.18);
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  color: #fff;
}
.follow-btn svg {
  width: 12px;
  height: 12px;
  display: block;
}
.ch-count {
  font-size: 12px;
  color: var(--text-dim);
  margin: 2px 0 8px;
}

/* ---------- article ---------- */
.article-wrap {
  max-width: 660px;
  margin: 0 auto;
}
.a-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: none;
  padding: 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  cursor: default;
}
.back svg {
  width: 13px;
  height: 13px;
  display: block;
}
.back:hover {
  text-decoration: underline;
}
.save-lg {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: var(--hover);
  color: var(--text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}
.save-lg.on {
  color: var(--nred);
}
.save-lg svg {
  width: 16px;
  height: 16px;
  display: block;
}
.plus-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 0.5px solid var(--border);
  border-radius: 10px;
  background: var(--window-bg);
  margin-bottom: 16px;
}
.plus-logo {
  padding: 3px 8px;
  border-radius: 6px;
  background: #111;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.plus-sign {
  color: var(--nred);
}
.plus-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.a-src {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--nred);
}
.a-head {
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.18;
  margin: 8px 0 14px;
  color: var(--text);
}
.a-byline-row {
  display: flex;
  align-items: center;
  gap: 11px;
}
.avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.a-byline {
  font-size: 13px;
  font-weight: 600;
}
.a-meta {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
}
.a-cover {
  height: 300px;
  border-radius: 14px;
  margin: 18px 0 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid var(--border);
}
.a-cover span {
  font-size: 120px;
  opacity: 0.9;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.35));
}
.a-p {
  font-family: ui-serif, Georgia, 'Times New Roman', serif;
  font-size: 15.5px;
  line-height: 1.65;
  margin: 0 0 18px;
  color: var(--text);
}
.a-p::first-letter {
  font-weight: 600;
}
.a-end {
  font-size: 11px;
  color: var(--text-dim);
  border-top: 0.5px solid var(--border);
  padding-top: 12px;
  margin-top: 6px;
}

/* "Read more from <source>" footer card */
.more-card {
  margin-top: 18px;
  border: 0.5px solid var(--border);
  border-radius: 14px;
  background: var(--window-bg);
  overflow: hidden;
}
.more-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  border-bottom: 0.5px solid var(--border);
}
.more-head.link:hover {
  background: var(--hover);
}
.more-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
}
.more-chev {
  display: flex;
  color: var(--text-dim);
}
.more-chev svg {
  width: 13px;
  height: 13px;
  display: block;
}
.more-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 16px;
  cursor: default;
}
.more-row + .more-row {
  border-top: 0.5px solid var(--border);
}
.more-row:hover {
  background: var(--hover);
}
.more-info {
  flex: 1;
  min-width: 0;
}
.more-headline {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.more-thumb {
  width: 64px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 0.5px solid var(--border);
}
</style>
