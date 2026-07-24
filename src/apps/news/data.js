// News app data: seed stories, sidebar structure, and a small
// template-based article generator so every story reads differently.

export const SECTIONS = [
  { id: 'today', name: 'Today', icon: 'news', accent: '#e5342c' },
  { id: 'newsplus', name: 'News+', icon: 'plus', accent: '#e5342c' },
  { id: 'sports', name: 'Sports', icon: 'football', accent: '#16a34a' },
  { id: 'technology', name: 'Technology', icon: 'laptop', accent: '#0284c7' },
  { id: 'science', name: 'Science', icon: 'flask', accent: '#0d9488' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', accent: '#db2777' },
]

export const CHANNELS = [
  { name: 'The Verge', bg: 'linear-gradient(150deg,#7c3aed,#4c1d95)', desc: 'Technology, science, and culture' },
  { name: 'ESPN', bg: 'linear-gradient(150deg,#ef4444,#991b1b)', desc: 'Sports news, scores, and highlights' },
  { name: 'National Geographic', bg: 'linear-gradient(150deg,#facc15,#a16207)', desc: 'Science, exploration, and adventure' },
  { name: 'Wired', bg: 'linear-gradient(150deg,#4b5563,#111827)', desc: 'Where tomorrow is realized' },
  { name: 'Bloomberg', bg: 'linear-gradient(150deg,#0ea5e9,#1e3a8a)', desc: 'Business, markets, and technology' },
  { name: 'Variety', bg: 'linear-gradient(150deg,#f472b6,#9d174d)', desc: 'Entertainment news and reviews' },
]

export const STORIES = [
  {
    id: 'm5-ultra',
    category: 'technology',
    source: 'The Verge',
    headline: 'Apple unveils M5 Ultra chip with 40-core GPU and on-device AI engine',
    subject: "Apple's new M5 Ultra chip",
    emoji: '💻',
    grad: ['#4f46e5', '#7c3aed', '#db2777'],
    time: '32m ago',
  },
  {
    id: 'solid-state',
    category: 'technology',
    source: 'Wired',
    headline: 'The race to build a solid-state EV battery is finally heating up',
    subject: 'the push toward solid-state EV batteries',
    emoji: '🔋',
    grad: ['#059669', '#0d9488', '#155e75'],
    time: '1h ago',
    plus: true,
  },
  {
    id: 'tsmc-2nm',
    category: 'technology',
    source: 'Bloomberg',
    headline: 'TSMC begins 2-nanometer trial production ahead of schedule, sources say',
    subject: "TSMC's 2-nanometer trial production",
    emoji: '🏭',
    grad: ['#0369a1', '#0284c7', '#38bdf8'],
    time: '2h ago',
  },
  {
    id: 'ios-27',
    category: 'technology',
    source: '9to5Mac',
    headline: 'iOS 27 beta brings a redesigned Siri with conversational memory',
    subject: 'the iOS 27 developer beta',
    emoji: '📱',
    grad: ['#c2410c', '#ea580c', '#fbbf24'],
    time: '5h ago',
  },
  {
    id: 'planet-born',
    category: 'science',
    source: 'National Geographic',
    headline: 'Astronomers capture the clearest image yet of a planet being born',
    subject: 'a planet being born 370 light-years away',
    emoji: '🪐',
    grad: ['#7c2d12', '#b45309', '#f59e0b'],
    time: '1h ago',
  },
  {
    id: 'crispr-vision',
    category: 'science',
    source: 'Science Daily',
    headline: 'CRISPR therapy restores partial vision in early clinical trial',
    subject: 'a CRISPR-based vision therapy',
    emoji: '🧬',
    grad: ['#0f766e', '#14b8a6', '#5eead4'],
    time: '3h ago',
  },
  {
    id: 'europa-clipper',
    category: 'science',
    source: 'Space.com',
    headline: "Europa Clipper sends back first close-up images of Jupiter's icy moon",
    subject: "Europa Clipper's first close-up images",
    emoji: '🛰️',
    grad: ['#1e3a8a', '#3730a3', '#6d28d9'],
    time: '7h ago',
  },
  {
    id: 'chiefs-ot',
    category: 'sports',
    source: 'ESPN',
    headline: 'Chiefs rally in the fourth quarter to win a wild overtime thriller',
    subject: 'a wild overtime finish at Arrowhead',
    emoji: '🏈',
    grad: ['#991b1b', '#dc2626', '#f97316'],
    time: '48m ago',
  },
  {
    id: 'nba-analytics',
    category: 'sports',
    source: 'The Athletic',
    headline: 'Inside the analytics revolution reshaping NBA front offices',
    subject: 'the analytics wave sweeping NBA front offices',
    emoji: '🏀',
    grad: ['#78350f', '#d97706', '#fde047'],
    time: '4h ago',
    plus: true,
  },
  {
    id: 'wimbledon-upset',
    category: 'sports',
    source: 'BBC Sport',
    headline: 'How a 19-year-old qualifier stunned Wimbledon in five sets',
    subject: "a 19-year-old qualifier's stunning Wimbledon run",
    emoji: '🎾',
    grad: ['#166534', '#16a34a', '#86efac'],
    time: '9h ago',
  },
  {
    id: 'appletv-drama',
    category: 'entertainment',
    source: 'Variety',
    headline: 'Apple TV+ orders second season of its most-watched drama ever',
    subject: "Apple TV+'s most-watched drama",
    emoji: '📺',
    grad: ['#701a75', '#a21caf', '#e879f9'],
    time: '2h ago',
  },
  {
    id: 'summer-tour',
    category: 'entertainment',
    source: 'Rolling Stone',
    headline: "The summer's biggest tour is rewriting the concert playbook",
    subject: "the summer's biggest stadium tour",
    emoji: '🎤',
    grad: ['#9f1239', '#e11d48', '#fb7185'],
    time: '6h ago',
  },
  {
    id: 'indie-scifi',
    category: 'entertainment',
    source: 'The Hollywood Reporter',
    headline: 'Box office surprise: indie sci-fi film tops charts on a $12M budget',
    subject: "an indie sci-fi film's box-office upset",
    emoji: '🎬',
    grad: ['#312e81', '#6366f1', '#22d3ee'],
    time: 'Yesterday',
  },
  {
    id: 'flip-phone',
    category: 'technology',
    source: 'The Wall Street Journal',
    headline: 'The quiet comeback of the flip phone — and who is buying them',
    subject: 'the quiet comeback of the flip phone',
    emoji: '📞',
    grad: ['#334155', '#64748b', '#cbd5e1'],
    time: 'Yesterday',
    plus: true,
  },
  {
    id: 'f1-decider',
    category: 'sports',
    source: 'ESPN',
    headline: 'Formula 1 title fight goes down to the wire in season finale',
    subject: 'the Formula 1 title decider',
    emoji: '🏎️',
    grad: ['#7f1d1d', '#dc2626', '#f59e0b'],
    time: '3h ago',
  },
  {
    id: 'world-cup-roster',
    category: 'sports',
    source: 'The Athletic',
    headline: 'World Cup roster surprises: five newcomers make the final cut',
    subject: 'the final World Cup roster cut',
    emoji: '⚽',
    grad: ['#065f46', '#059669', '#34d399'],
    time: '8h ago',
  },
  {
    id: 'awards-sweep',
    category: 'entertainment',
    source: 'Variety',
    headline: 'One studio dominated the awards shortlist — here is how it happened',
    subject: "one studio's awards-season sweep",
    emoji: '🏆',
    grad: ['#78350f', '#b45309', '#fbbf24'],
    time: '4h ago',
    plus: true,
  },
  {
    id: 'streaming-merger',
    category: 'entertainment',
    source: 'The Hollywood Reporter',
    headline: 'Two streaming giants are in talks to merge, sources say',
    subject: 'a potential streaming mega-merger',
    emoji: '🎞️',
    grad: ['#0c4a6e', '#0369a1', '#7dd3fc'],
    time: 'Yesterday',
  },
  {
    id: 'deep-sea-census',
    category: 'science',
    source: 'National Geographic',
    headline: 'Deep-sea census finds thousands of species new to science',
    subject: 'a decade-long census of the deep ocean',
    emoji: '🐋',
    grad: ['#164e63', '#0e7490', '#22d3ee'],
    time: '5h ago',
    plus: true,
  },
  {
    id: 'fusion-milestone',
    category: 'science',
    source: 'Science Daily',
    headline: 'Fusion reactor holds a burning plasma for a record 22 minutes',
    subject: 'a record-breaking fusion plasma burn',
    emoji: '☀️',
    grad: ['#9a3412', '#ea580c', '#fdba74'],
    time: '11h ago',
  },
  {
    id: 'ai-wearable',
    category: 'technology',
    source: 'Wired',
    headline: 'The AI wearable backlash has arrived — and startups are listening',
    subject: 'the growing backlash against AI wearables',
    emoji: '⌚',
    grad: ['#4c1d95', '#7c3aed', '#c4b5fd'],
    time: '6h ago',
  },
  {
    id: 'quantum-network',
    category: 'technology',
    source: '9to5Mac',
    headline: 'Researchers link two quantum networks across a metro area',
    subject: 'a city-scale quantum network link',
    emoji: '⚛️',
    grad: ['#1e293b', '#334155', '#38bdf8'],
    time: 'Yesterday',
  },
]

/* ---------------- article generator ---------------- */

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const VOCAB = {
  technology: {
    orgs: ['Apple', 'Google', 'Nvidia', 'Samsung', 'Qualcomm', 'Microsoft', 'Meta'],
    experts: ['semiconductor analyst at Moor Insights', 'professor of electrical engineering at Stanford', 'supply-chain analyst based in Taipei', 'veteran chip designer', 'consumer-tech researcher at Gartner'],
    places: ['Cupertino', 'San Jose', 'Taipei', 'Austin', 'Seattle'],
  },
  science: {
    orgs: ['NASA', 'the European Space Agency', 'CERN', 'the National Institutes of Health', 'several rival research labs'],
    experts: ['planetary scientist at the Jet Propulsion Laboratory', 'clinical researcher at Johns Hopkins', 'marine biologist at the Scripps Institution', 'particle physicist at CERN', 'geneticist at the Broad Institute'],
    places: ['Pasadena', 'Geneva', 'Cape Canaveral', 'Baltimore', 'La Serena'],
  },
  sports: {
    orgs: ['the league office', 'several rival franchises', 'top-ranked contenders', 'broadcast partners', 'player agents around the league'],
    experts: ['sports scientist who consults for several franchises', 'former general manager', 'veteran scout', 'longtime assistant coach', 'sports economist at Ohio University'],
    places: ['the locker room', 'the front office', 'Las Vegas', 'the training facility', 'the film room'],
  },
  entertainment: {
    orgs: ['Apple TV+', 'Netflix', 'several major studios', 'rival streaming services', 'top talent agencies'],
    experts: ['box-office analyst at Comscore', 'veteran touring-industry executive', 'television critic', 'streaming-industry researcher at Parrot Analytics', 'film-school professor at USC'],
    places: ['Hollywood', 'Los Angeles', 'New York', 'the festival circuit', 'London'],
  },
}

const REPORTERS = ['Maya Chen', 'David Okafor', 'Sara Lindqvist', 'Marcus Webb', 'Priya Raman', 'Tom Delgado', 'Elena Petrova', 'James Whitfield']
const EXPERT_NAMES = ['Dr. Ingrid Halvorsen', 'Dr. Marcus Bell', 'Priya Natarajan', 'Dr. Alan Reyes', 'Karen Molloy', 'Dr. Yusuf Adeyemi', 'Helen Cho', 'Robert Vance']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const OPENERS = [
  'For months, the rumor mill has churned over {subject}. On {day}, the picture finally came into focus — and the details suggest the stakes are higher than many in {place} first assumed.',
  'What began as a quiet trickle of reports about {subject} has turned into one of the most closely watched stories in the field, and people familiar with the matter say the biggest developments may still be ahead.',
  'It is not often that {subject} lives up to the hype. But early evidence reviewed by {source} suggests this time could genuinely be different.',
  'The announcement landed quietly, but its implications are anything but. {subject_cap} is now forcing competitors, analysts, and fans alike to recalibrate their expectations.',
]

const MIDDLES = [
  'The numbers tell part of the story. According to documents reviewed by {source}, the effort has been in the works for nearly {n} years and now involves a team of more than {m} people, many of them recruited from {org}.',
  'Rivals are paying close attention. Executives at {org} have privately acknowledged that {subject} could reset expectations across the market, even if the public timeline slips.',
  'There are still open questions. One {expert} cautioned that early results often look better than what survives contact with the real world, pointing to a string of similar announcements that quietly faded.',
  'Behind the scenes, the work has been anything but smooth. One person involved described a "roller-coaster" of setbacks, including a late change of direction that pushed the schedule back by several months.',
  'The reaction from {place} has been swift. Within hours, competitors were briefing their own teams, and at least one executive at {org} called an all-hands meeting to discuss the response.',
]

const QUOTES = [
  '"This is the kind of leap you maybe see once a decade," said {name}, a {expert}. "If even half of what is being claimed holds up, {subject} will force everyone else to rethink their road maps."',
  '"We were skeptical at first," {name} told {source}. "But the data is the data. Something real is happening here."',
  '"The devil is in the details, and the details are impressive," said {name}, a {expert}. Still, they added, "nobody should confuse a great first impression with a finished product."',
  '"I have covered this beat for {n} years, and I cannot remember a reaction quite like this," said {name}. "People in {place} are genuinely rethinking what comes next."',
]

const CLOSERS = [
  'For now, the people behind {subject} are keeping their heads down. But with {org} and others circling, few in {place} expect the quiet to last.',
  'What happens next will depend on execution — and on whether the rest of the field can keep pace. Either way, {subject} has already changed the conversation.',
  'One thing is certain: the next few months will be busy. "Buckle up," said one person close to the effort. "This is the fun part."',
  'More details are expected in the coming weeks. Until then, {subject} will remain the story everyone in {place} is talking about.',
]

// Build a deterministic but unique 4–6 paragraph article for a story.
export function buildArticle(story) {
  const rng = mulberry32(hash(story.id + '|' + story.headline))
  const vocab = VOCAB[story.category] || VOCAB.technology
  const pick = (arr) => arr[Math.floor(rng() * arr.length)]

  const fill = (t) =>
    t.replace(/\{(\w+)\}/g, (_, k) => {
      switch (k) {
        case 'subject':
          return story.subject
        case 'subject_cap':
          return story.subject.charAt(0).toUpperCase() + story.subject.slice(1)
        case 'source':
          return story.source
        case 'org':
          return pick(vocab.orgs)
        case 'expert':
          return pick(vocab.experts)
        case 'name':
          return pick(EXPERT_NAMES)
        case 'place':
          return pick(vocab.places)
        case 'day':
          return pick(DAYS)
        case 'n':
          return String(2 + Math.floor(rng() * 6))
        case 'm':
          return String(40 + Math.floor(rng() * 460))
        default:
          return k
      }
    })

  const count = 4 + Math.floor(rng() * 3) // 4–6 paragraphs
  const paragraphs = [fill(pick(OPENERS))]
  for (let i = 0; i < count - 2; i++) {
    paragraphs.push(fill(pick(rng() < 0.45 ? QUOTES : MIDDLES)))
  }
  paragraphs.push(fill(pick(CLOSERS)))

  const words = paragraphs.join(' ').split(/\s+/).length
  return {
    byline: pick(REPORTERS),
    minutes: Math.max(2, Math.round(words / 180)),
    paragraphs,
  }
}
