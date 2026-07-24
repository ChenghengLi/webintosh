// Catalog for the Books app. Covers are CSS gradients + emoji — no external assets.
// Reader pages are generated deterministically from a shared paragraph pool,
// seeded by book id so every book always has the same text.

const B = (id, title, author, emoji, bg, font, chapters, blurb, audio) => ({
  id, title, author, emoji, bg, font, chapters, blurb, audio,
})

// font: 'serif' | 'sans' — varied cover typesetting
export const BOOKS = [
  B('salt-road', 'The Salt Road', 'Mara Ellison', '🌊',
    'linear-gradient(165deg,#0f6f7e,#0a3d4f)', 'serif',
    ['Low Water', 'The Brine Line', 'What the Gulls Keep', 'A Harbor of Thorns', 'The Long Tide'],
    'A coastal family reckons with the sea that gave and took everything.', '8h 12m'),
  B('field-guide', 'A Field Guide to Leaving', 'Theo Marsh', '🍂',
    'linear-gradient(165deg,#c97b2d,#7a3f14)', 'sans',
    ['Packing Light', 'Maps of the House', 'The Last Orchard', 'Departure Weather'],
    'Twelve essays on saying goodbye well, and what comes after.', '5h 47m'),
  B('clockwork', 'The Clockwork Orchard', 'Imogen Vale', '🍎',
    'linear-gradient(165deg,#8c3b2e,#4e1d16)', 'serif',
    ['The Winding Key', 'Copper Leaves', 'Blossom Season', 'The Gardener\u2019s Secret', 'Harvest of Gears'],
    'In a valley where fruit trees tick, one girl hears the mechanism failing.', '10h 3m'),
  B('static-bloom', 'Static Bloom', 'Jun Okafor', '📻',
    'linear-gradient(165deg,#5b3fa8,#2c1e5e)', 'sans',
    ['Interference', 'Night Frequency', 'Signal to Noise', 'The Quiet Channel', 'Broadcast'],
    'A late-night radio host starts receiving calls from ten years ahead.', '7h 29m'),
  B('small-hours', 'Cartography of Small Hours', 'Elena Reyes', '🕯️',
    'linear-gradient(165deg,#27415e,#101f31)', 'serif',
    ['3 A.M., Kitchen Light', 'The Insomniac\u2019s Atlas', 'Blue Before Dawn', 'First Bell'],
    'A poet maps the geography of sleepless nights in a sleeping city.', '4h 58m'),
  B('ledger', 'The Lighthouse Ledger', 'Bram Calloway', '🏮',
    'linear-gradient(165deg,#4a5460,#232a33)', 'serif',
    ['The Keeper\u2019s Arithmetic', 'Fog Accounts', 'A Debt of Oil', 'Storm Entries', 'Balance Due'],
    'Every shipwreck is recorded. Somebody has been cooking the books.', '9h 21m'),
  B('honey', 'Honey & Hemlock', 'Wren Adler', '🍯',
    'linear-gradient(165deg,#d9a320,#8a5a10)', 'sans',
    ['The Apiary', 'Bitter Herbs', 'A Recipe for Ruin', 'The Tasting', 'Sweetwater'],
    'A village beekeeper doubles as its poisoner in this wry mystery.', '6h 44m'),
  B('winter', 'Winter Arithmetic', 'Nils Bergström', '❄️',
    'linear-gradient(165deg,#7ba7c4,#3d6a8a)', 'serif',
    ['Minus Degrees', 'The Thaw Equation', 'Snow Ledger', 'White Silence', 'April Proof'],
    'A retired mathematician counts what the long winter subtracted.', '7h 5m'),
  B('umbrella', 'The Umbrella Thief', 'Priya Nair', '☂️',
    'linear-gradient(165deg,#b03a72,#5e1c3c)', 'sans',
    ['Monsoon Season', 'The Borrowed Black', 'Rain Debts', 'The Dry Spell', 'Cloudburst'],
    'A comic caper across a city where it never stops raining.', '6h 58m'),
  B('paper-moon', 'Songs for a Paper Moon', 'Augustine Fox', '🌙',
    'linear-gradient(165deg,#3b3d8f,#1a1b4a)', 'serif',
    ['Overture in Cardboard', 'The Tin Orchestra', 'Waxing', 'The Stagehand\u2019s Song', 'Full House'],
    'Backstage at a theatre where the moon prop falls in love.', '8h 40m'),
  B('rootbound', 'Rootbound', 'Fern Holloway', '🌿',
    'linear-gradient(165deg,#3f7a45,#1e4423)', 'sans',
    ['Potting Soil', 'The North Window', 'Cuttings', 'Transplant Shock', 'New Growth'],
    'A plant-obsessed introvert learns to put down roots of her own.', '5h 33m'),
  B('tides', 'Glossary of Tides', 'Corin Aldous', '🐚',
    'linear-gradient(165deg,#155a6e,#0a2c38)', 'serif',
    ['Ebb', 'Slack Water', 'The Undertow Entries', 'Spring Tide', 'Flood Line'],
    'Definitions for the things the ocean does to people.', '7h 51m'),
]

// Filler prose pool. Pages are assembled from these paragraphs.
const PARAGRAPHS = [
  'The morning arrived without ceremony, the way it always did in that part of the country, seeping in grey and unhurried through the gap in the curtains. She lay still for a while and listened to the house deciding to wake: the pipes ticking, a floorboard settling, the kettle beginning its low and patient rumble downstairs. There was comfort in the ordinariness of it, in knowing that the world had kept its appointment once again.',
  'He had learned long ago that maps are a kind of promise, and like all promises they are mostly kept. The road on the page was a thin red line, confident and straight, but the road under his boots had opinions of its own. It bent where the hill asked it to bend, pooled where the rain insisted, and vanished altogether wherever the bracken grew taller than a man\u2019s patience.',
  'By the third week the letters had stopped arriving, and in their place came a silence with a particular texture, thick as unposted wool. She told the neighbors she preferred it that way, that quiet was a luxury, that she had taken up gardening. All of it was true, more or less, which is the most useful kind of true there is.',
  'The shop on the corner sold clocks, and nothing else, which everyone agreed was either very brave or very foolish. Its windows ticked at passersby in a dozen unsynchronized accents. The proprietor wound each one by hand at opening and claimed, with the dignity of a man stating the weather, that no two of them had ever agreed about anything that mattered.',
  'It rained the way it rains in stories told too often: suddenly, theatrically, and just after the laundry was hung. They stood under the awning of the closed bakery and watched the street become a river of umbrellas, each one hurrying somewhere drier, each one certain the rain had been arranged personally.',
  'There are houses that hold their history quietly, folded into the plaster like a note in a pocket. This was not one of them. This house announced itself — in the portrait crooked on the stair, in the piano that would not stay tuned, in the cupboard door that opened only for strangers. The previous owners had left in a hurry, and the hurry, somehow, had stayed.',
  'The tide went out the way an argument ends, gradually and then completely, leaving behind the shining evidence of everything that had been submerged. Gulls picked over the revelations. A boy with a red bucket walked the wet sand with the solemn concentration of an auditor, collecting what the sea, in its vast indifference, had failed to keep.',
  'She kept her recipes in a shoebox, written in three different hands across forty years, and the grease stains were as instructive as the instructions. A good stain, she liked to say, means the card was consulted often and in the middle of things, which is the only honest way to consult anything. The ones without stains she regarded with suspicion.',
  'The train was late in the manner of trains that have given up apologizing, and the platform settled into the particular fellowship of the stranded. A man shared his oranges. Someone produced a deck of cards with two queens missing, which nobody minded, because the missing queens were a story, and stories pass the time better than winning does.',
  'In the archive, the air tasted of dust and patience. Each box she opened exhaled a decade. The ledgers were written in an ink that had faded to the color of weak tea, in a hand so careful it seemed to be apologizing for existing. She copied the entries slowly, aware that she was the first person to read some of these sentences in ninety years.',
  'The garden had been wild for so long that it had achieved a kind of democracy. The roses governed the south wall by seniority, the mint held the damp corner by sheer population, and the apple tree, old and theatrical, dropped its fruit with the timing of a comedian. He mowed paths through it rather than lawns, and called the paths decisions.',
  'What she remembered most was not the storm but the stillness before it, when the birds went quiet in unison and the light turned the color of a bruise healing. The dog refused to leave the porch. The radio, between gusts of static, played a waltz, and the absurdity of that — a waltz, while the sky rehearsed its anger — made them both laugh in the kitchen doorway.',
  'The lighthouse keeper recorded everything: the oil consumed, the ships sighted, the direction of the wind and the state of his own spirits, which he rated like the weather, fair to poor. In the margin of the ledger, once a year without fail, he wrote a single line about the mainland lights, and whether they seemed nearer or farther than the year before.',
  'He played the trumpet only at night, softly, with a practice mute, into a closet full of winter coats, because the coats absorbed the sound and because he suspected the coats had opinions. What the neighbors heard was something like a rumor of music. What the coats heard, he liked to think, was the whole performance.',
  'The market on Saturday was less a place than a weather system: it gathered in the dark before dawn, rained noise and cabbage leaves upon the square, and blew itself out by noon. Regulars navigated by stall the way sailors navigate by star. The cheese man knew everyone\u2019s name and used none of them, preferring a system of nicknames he alone understood.',
  'They found the boat where the river bent and forgot itself, half in the reeds and half in the past. Its paint had faded to a blue that no longer had a name. He dragged it home anyway, over three weekends and one sore back, because some things you rescue not for what they are but for what they insist they could still be.',
  'The orchestra tuned itself the way a flock of birds negotiates a wire, instrument by instrument, until the discord resolved into a single held breath. Then the conductor raised her arms, and the hall — every velvet seat, every gilded balcony, every held program — leaned forward together into the first note like a field leaning into wind.',
  'Winter arithmetic, her grandfather called it: wood stacked against days, daylight against chores, patience against the long grey weeks. He could look at a woodpile and tell you the month. He could look at the sky at four in the afternoon and tell you, to the quarter hour, when the lamps would need lighting, and he was never once wrong, or never once corrected.',
  'The letter took eleven years to arrive, which the postal service declined to explain and which the recipient declined to question, reasoning that some news ripens with age. The ink had faded to brown. The stamp depicted a king no one remembered. She read it twice at the kitchen table, and then a third time aloud, because some sentences deserve an audience even after everything.',
  'Above the town, the hill kept its own counsel and its own weather. Clouds stopped there as if paying a toll. The shepherd who worked the upper fields claimed the hill was older than the map, older than the name the map gave it, and that on the shortest night of the year, if you lay very still in the bracken, you could hear it turning in its sleep.',
  'Nobody remembered planting the pear tree, which meant, by village logic, that it belonged to everyone. In September the fruit ripened all at once with an almost audible sigh, and ladders appeared from every shed on the lane. The surplus became jam, became gifts, became the annual argument about whose grandmother\u2019s recipe was the true one, which was the point of the tree all along.',
  'The night shift at the observatory taught him that silence is not empty but crowded: the cooling tick of the dome, the mutter of the computers, the long patient hiss of the universe declining to hurry. He drank his tea from a thermos older than his career and wrote the seeing conditions in a notebook, in pencil, the way his predecessor had, and his predecessor before that.',
  'She sold the piano on a Tuesday and regretted it by Thursday, which she considered a reasonable schedule for regret. The buyers took it away with professional cheer, and the room, robbed of its anchor, rearranged itself around the pale rectangle on the wall. For weeks afterward she caught herself humming at the exact hour she used to practice, a habit with no instrument left to answer it.',
  'The last ferry of the evening carried mostly regulars, and the regulars had their places: the bench near the funnel for warmth, the starboard rail for the view, the cabin corner for the man who slept the crossing and woke, without fail, at the harbor bell. The sea did whatever it liked, as always, and the ferry minded its manners, as always, and everyone got home.',
]

// Deterministic PRNG (LCG) seeded from a string.
function seedOf(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Generate 6–10 pages for a book: [{ chapter, paragraphs: [...] }]
export function getPages(book) {
  const rand = rng(seedOf(book.id))
  const count = 6 + Math.floor(rand() * 5) // 6–10 pages
  const pages = []
  let pi = Math.floor(rand() * PARAGRAPHS.length)
  for (let p = 0; p < count; p++) {
    const n = 4 + Math.floor(rand() * 2) // 4–5 paragraphs per page
    const paragraphs = []
    for (let i = 0; i < n; i++) {
      paragraphs.push(PARAGRAPHS[pi % PARAGRAPHS.length])
      pi += 1 + Math.floor(rand() * 4)
    }
    pages.push({ chapter: book.chapters[p % book.chapters.length], paragraphs })
  }
  return pages
}
