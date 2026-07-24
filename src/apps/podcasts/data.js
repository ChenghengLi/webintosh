// Simulated catalog for the Podcasts app. Durations are in seconds.
// Covers are real images (picsum.photos, seeded per show) layered over the
// CSS gradient + emoji, which stays as the offline/error fallback.
// Episode dates are computed relative to today so the feed always feels fresh.

const dateAgo = (days) =>
  new Date(Date.now() - days * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Episode tuple: [title, minutes, daysAgo, description]
const S = (id, title, author, emoji, bg, category, desc, episodes) => ({
  id,
  title,
  author,
  emoji,
  bg,
  category,
  desc,
  cover: `https://picsum.photos/seed/pc-${id}/400/400`,
  episodes: episodes.map(([title, min, daysAgo, desc]) => ({
    title,
    dur: min * 60,
    date: dateAgo(daysAgo),
    daysAgo,
    desc,
  })),
})

// Array order doubles as the Top Charts ranking.
export const SHOWS = [
  S('syntax', 'Syntax Overload', 'Wes & Scott Simmons', '💻',
    'linear-gradient(150deg,#667eea,#764ba2)', 'Technology',
    'Full-stack web development, JavaScript frameworks, CSS wizardry and the occasional hot take.',
    [
      ['The State of JavaScript Frameworks in 2026', 54, 1, 'We break down the latest framework benchmarks, argue about signals versus hooks, and pick our stacks of the year.'],
      ['CSS Is Awesome (Again)', 47, 8, 'Container queries, :has(), scroll-driven animations — modern CSS can finally do the things we used to need JavaScript for.'],
      ['Interview: Building a Dev-Tools Empire', 61, 15, 'A candid chat about going from weekend side project to a seven-figure developer tools company.'],
      ['AI Pair Programmers: Hype or Help?', 49, 22, 'We put three AI coding assistants through real-world refactors and share what actually saved time.'],
      ['Database Deep Dive: Postgres vs. SQLite', 58, 29, 'When should your side project reach for Postgres? A friendly debate backed by real numbers.'],
    ]),
  S('truenorth', 'True North', 'Case Files Media', '🧭',
    'linear-gradient(150deg,#141e30,#243b55)', 'True Crime',
    'Meticulously researched cold cases, told with respect for the people at their center.',
    [
      ['The Lighthouse Keeper, Part 1', 56, 1, 'A keeper vanishes from a remote island station, leaving a log book full of contradictions and a meal still warm on the table.'],
      ['The Lighthouse Keeper, Part 2', 58, 8, 'The investigation turns to the supply boat crew, and a photograph surfaces that changes the timeline entirely.'],
      ['The Disappearance of Flight 819', 61, 15, 'Forty minutes of radio silence over the desert — and a plane that landed without anyone remembering the descent.'],
      ['The Manuscript in the Attic', 47, 22, 'A family renovation uncovers a confession written fifty years earlier. But is it genuine?'],
      ['Solved: The Cedar Falls Letters', 53, 29, 'After two decades, a genealogist and a stamp collector crack the case nobody could.'],
    ]),
  S('morning', 'The Morning Brief', 'KNS News', '🗞️',
    'linear-gradient(150deg,#f857a6,#ff5858)', 'News',
    'Start your day informed: the top stories from around the world in twenty minutes, every weekday.',
    [
      ['Markets Rally as Tech Earnings Beat Expectations', 21, 1, 'Plus: a breakthrough in battery recycling, and the cities competing to host the 2032 games.'],
      ['The Race to Build a Smarter Power Grid', 19, 2, 'Utilities are betting billions on software. We look at who wins, who pays, and what could go wrong.'],
      ['Election Season Heats Up Abroad', 22, 3, 'Three countries, three pivotal votes — what the results could mean for trade and climate policy.'],
      ['A New Chapter for Space Tourism', 20, 4, 'Ticket prices are falling fast. We ask whether the experience could ever go mainstream.'],
      ['Heat Waves and the Cities Adapting to Them', 21, 5, 'From shaded bus stops to white rooftops, urban planners are redesigning for a warmer world.'],
    ]),
  S('science', 'The Science Hour', 'Dr. Ada Whitfield', '🔬',
    'linear-gradient(150deg,#00c6ff,#0072ff)', 'Science',
    'One big question each week, answered by the researchers actually doing the work.',
    [
      ['Are We Alone? The New Exoplanet Census', 58, 2, 'The latest telescope survey doubled the list of habitable-zone worlds. Two astronomers explain what comes next.'],
      ['CRISPR at Ten: What Actually Changed', 54, 9, 'A decade after gene editing went mainstream, we separate the miracle cures from the marketing.'],
      ['The Physics of a Perfect Espresso', 39, 16, 'Pressure, particle size and a little fluid dynamics — a barista champion and a physicist team up.'],
      ['How Octopuses Dream', 47, 23, 'New imaging research suggests cephalopods replay their day. What might an octopus dream about?'],
      ['Fusion Energy: Five Years Away, Again?', 62, 30, 'Another record-breaking reaction, another bold timeline. We ask the skeptics and the believers.'],
    ]),
  S('startup', 'Startup Stories', 'Priya Anand', '🚀',
    'linear-gradient(150deg,#ff9966,#ff5e62)', 'Business',
    'Founders share the messy middle: near-death moments, lucky breaks and the pivots that saved them.',
    [
      ['From Dorm Room to IPO: The Loopify Tale', 55, 3, 'Two roommates, one borrowed server, and a product nobody believed in — until everyone did.'],
      ['We Almost Ran Out of Money (Twice)', 48, 10, 'A founder opens the books on the two quarters where payroll was a coin flip.'],
      ['The Pitch Deck That Raised $40M', 44, 17, 'Slide by slide, a seed-stage CEO walks through the deck that investors could not ignore.'],
      ['Hiring Your First Ten Engineers', 51, 24, 'Culture is set early. Three CTOs share what they would do differently with hire number one.'],
      ['When to Say No to Venture Capital', 46, 31, 'Bootstrapped and profitable — the founders who turned down term sheets and never looked back.'],
    ]),
  S('mindful', 'Mindful Mornings', 'Elena Rivers', '🧘',
    'linear-gradient(150deg,#43cea2,#185a9d)', 'Health & Fitness',
    'Gentle guided practices and conversations on stress, sleep and attention — a calmer start to your day.',
    [
      ['Ten Minutes of Box Breathing', 12, 1, 'A short guided practice for the middle of a busy day. No experience needed, no equipment required.'],
      ['Why Your Brain Loves a Walk', 34, 6, 'The neuroscience of movement, and why the best ideas rarely arrive at your desk.'],
      ['Letting Go of the Perfect Morning Routine', 41, 13, 'Cold plunges, journals, sun salutations — when self-optimization becomes its own source of stress.'],
      ['Sleep: The Foundation, with Dr. Iyer', 52, 20, 'A sleep scientist answers listener questions about cycles, screens and catching up on weekends.'],
      ['A Body Scan for Busy Days', 15, 27, 'Fifteen minutes to notice, release and reset — recorded in one take, birdsong included.'],
    ]),
  S('offrecord', 'Off the Record', 'Jamie Vox', '🎙️',
    'linear-gradient(150deg,#232526,#414345)', 'Music',
    'Artists, producers and songwriters talk craft, gear and the stories behind the songs.',
    [
      ['The Anatomy of a Hook', 52, 4, 'Three hit songwriters dissect the four seconds that make a chorus impossible to forget.'],
      ['Inside the Studio with Nova Rey', 64, 11, 'The producer of the year opens her session files and walks through a track, stem by stem.'],
      ['Why Vinyl Came Back', 43, 18, 'Pressing plants cannot keep up with demand. We trace the revival from thrift bins to boardrooms.'],
      ['Session Drummers: The Unsung Heroes', 57, 25, 'They play on the hits you love and nobody knows their names. Until now.'],
      ['Songwriting on a Deadline', 49, 32, 'Writing for film trailers means a masterpiece in 48 hours. Two composers share their process.'],
    ]),
  S('history', 'Deep Dive History', 'Dr. Marcus Cole', '🏛️',
    'linear-gradient(150deg,#603813,#b29f94)', 'History',
    'Long-form stories from the past — the people, blunders and turning points that shaped the world.',
    [
      ['The Library of Alexandria: What Was Lost', 68, 3, 'Separating myth from manuscript — what the ancient world really lost when the library burned.'],
      ['Coffee Houses and the Birth of the Stock Market', 59, 10, 'How caffeinated Londoners invented modern finance between sips, one handwritten newsletter at a time.'],
      ['The Year Without a Summer', 63, 17, 'A volcano in Indonesia darkened skies worldwide — and indirectly gave us a famous ghost story.'],
      ['How Maps Redrew the World', 57, 24, 'Straight lines on paper, crooked consequences on the ground: the cartographers who shaped nations.'],
      ['The Real Story of the Pony Express', 49, 31, 'It lasted only eighteen months and lost money the whole time. Why do we still remember it?'],
    ]),
  S('money', 'Money Matters', 'The Ledger Team', '💰',
    'linear-gradient(150deg,#11998e,#38ef7d)', 'Business',
    'Personal finance without the jargon: investing, saving and spending with intention.',
    [
      ['Index Funds Explained (Finally)', 38, 3, 'The boring investment that beats most professionals, explained with zero jargon and one sandwich analogy.'],
      ['The Psychology of a Paycheck', 44, 10, 'Why a raise rarely feels like one, and how to make money decisions your future self will thank you for.'],
      ['Rent vs. Buy in 2026', 41, 17, 'Rates, prices and the spreadsheet we built so you do not have to. The answer might surprise you.'],
      ['Your Emergency Fund Questions, Answered', 35, 24, 'How much, where to keep it, and what actually counts as an emergency. Listener mailbag edition.'],
      ['Retirement for Freelancers', 46, 31, 'No employer match, no problem — a practical guide to saving when your income swings month to month.'],
    ]),
  S('comedy', 'The Comedy Cellar', 'Lineup Media', '😂',
    'linear-gradient(150deg,#f7971e,#ffd200)', 'Comedy',
    'Stand-up sets and greenroom conversations recorded live in the basement club.',
    [
      ['Crowd Work Gone Right', 42, 4, 'A bachelor party, a misunderstanding and the quickest thinking we have ever captured on tape.'],
      ['Writing Jokes That Survive the Road', 50, 11, 'Three touring comics compare notebooks and explain why a joke dies in Denver but kills in Dallas.'],
      ['The Worst Gig Ever Told', 47, 18, 'A casino lounge, a broken microphone and a crowd that came for the buffet. A cautionary tale.'],
      ['Improv Night: Anything Goes', 55, 25, 'Audience suggestions, zero preparation, and one suggestion we legally cannot repeat.'],
      ['Hecklers: A Field Guide', 44, 32, 'Identifying, disarming and occasionally befriending the loudest person in the room.'],
    ]),
]

export const getShow = (id) => SHOWS.find((s) => s.id === id)

export const CATEGORIES = [...new Set(SHOWS.map((s) => s.category))].sort()

// '42 min' / '1 hr 5 min' — used in episode metadata lines.
export const fmtDur = (sec) => {
  const m = Math.round(sec / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${String(m % 60).padStart(2, '0')} min`
}
