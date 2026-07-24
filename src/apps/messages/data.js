// Contacts, seeded conversations and per-contact canned reply pools.

export const contacts = {
  maya: {
    id: 'maya',
    name: 'Maya Chen',
    replies: [
      'ok wait that’s actually perfect',
      'adding it to the moodboard immediately',
      'you have such good taste, it’s annoying',
      'counterpoint: what if… more gradients',
      'this is going in the portfolio, I decided',
      'be so for real right now 😭',
    ],
  },
  leo: {
    id: 'leo',
    name: 'Leo Park',
    replies: [
      'say less',
      'bro. BRO.',
      'bet, I’m bringing the speaker',
      'leg day first though, non-negotiable',
      'you’re on. loser buys smoothies',
      'that’s what I like to hear 💪',
    ],
  },
  mom: {
    id: 'mom',
    name: 'Mom',
    replies: [
      'Okay. Drink water.',
      'Your father says hi. And to call more.',
      'I saw a dog today that reminded me of you',
      'Don’t stay up too late 🌙',
      'I’m proud of you. Also eat a vegetable.',
      'Send me a photo!',
    ],
  },
  sam: {
    id: 'sam',
    name: 'Sam Rivera',
    replies: [
      'works on my machine ¯\\_(ツ)_/¯',
      'have you tried turning it off and on again',
      'that’s a feature, not a bug',
      'pushing straight to main. what could go wrong',
      'I’ll review it after coffee #3',
      'lgtm 🚀',
    ],
  },
  alex: {
    id: 'alex',
    name: 'Alex Kim',
    replies: [
      'this song has been stuck in my head ALL day',
      'ok but the bridge on track 4?? unreal',
      'adding that to the playlist rn',
      'we’re so seeing them live next tour',
      'vinyl sounds better, I don’t make the rules',
      '🎧🎧🎧',
    ],
  },
}

// Each conversation: 4–8 seeded messages. `from` is 'me' or 'them'.
export function seedConversations() {
  return [
    {
      id: 'maya',
      contactId: 'maya',
      unread: 2,
      stamp: '9:41 AM',
      messages: [
        { from: 'them', text: 'ok be honest. the new wallpaper: gorgeous or TOO gorgeous', time: '9:32 AM' },
        { from: 'me', text: 'it’s giving sunset in the best way', time: '9:33 AM' },
        { from: 'them', text: 'I knew you’d get it', time: '9:33 AM' },
        { from: 'them', text: 'also I redesigned my icons again. round three', time: '9:34 AM' },
        { from: 'me', text: 'screenshot or it didn’t happen', time: '9:35 AM' },
        { from: 'them', text: 'give me 20 minutes, Figma is being dramatic', time: '9:38 AM' },
        { from: 'them', text: 'worth it though. wait till you see the dock', time: '9:41 AM' },
      ],
    },
    {
      id: 'mom',
      contactId: 'mom',
      unread: 1,
      stamp: 'Yesterday',
      messages: [
        { from: 'them', text: 'Did you eat yet', time: '6:15 PM' },
        { from: 'me', text: 'yes mom, I made pasta', time: '6:20 PM' },
        { from: 'them', text: 'Pasta is not a vegetable', time: '6:21 PM' },
        { from: 'me', text: 'there was basil on it 🌿', time: '6:22 PM' },
        { from: 'them', text: '🙄 come Sunday, I make soup', time: '6:23 PM' },
      ],
    },
    {
      id: 'leo',
      contactId: 'leo',
      unread: 0,
      stamp: 'Yesterday',
      messages: [
        { from: 'me', text: 'trail on saturday? weather looks perfect', time: '8:02 PM' },
        { from: 'them', text: 'down. which one', time: '8:04 PM' },
        { from: 'me', text: 'eagle ridge, the long loop', time: '8:05 PM' },
        { from: 'them', text: 'the one with the sketchy bridge??', time: '8:06 PM' },
        { from: 'them', text: '…I’m in', time: '8:06 PM' },
        { from: 'me', text: 'that’s the spirit. bring snacks this time', time: '8:07 PM' },
      ],
    },
    {
      id: 'sam',
      contactId: 'sam',
      unread: 0,
      stamp: 'Tuesday',
      messages: [
        { from: 'them', text: 'the build passed on the first try and honestly I don’t trust it', time: '3:12 PM' },
        { from: 'me', text: 'that’s not how it’s supposed to work', time: '3:13 PM' },
        { from: 'them', text: 'exactly. something is wrong. I’m rerunning it', time: '3:14 PM' },
        { from: 'me', text: 'let it go sam. take the win', time: '3:15 PM' },
        { from: 'them', text: 'I ran it again and it failed. I KNEW IT', time: '3:16 PM' },
        { from: 'me', text: 'lol. what broke', time: '3:18 PM' },
        { from: 'them', text: 'missing semicolon. prettier betrayed me', time: '3:19 PM' },
      ],
    },
    {
      id: 'alex',
      contactId: 'alex',
      unread: 0,
      stamp: 'Monday',
      messages: [
        { from: 'me', text: 'did the new album drop yet', time: '11:02 AM' },
        { from: 'them', text: 'midnight tonight!! listening party at mine?', time: '11:03 AM' },
        { from: 'me', text: 'obviously. I’ll bring the good speakers', time: '11:04 AM' },
        { from: 'them', text: 'and snacks. leo never brings snacks', time: '11:05 AM' },
        { from: 'me', text: 'noted 🍿', time: '11:06 AM' },
      ],
    },
  ]
}
