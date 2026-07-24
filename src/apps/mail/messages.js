// Seed data for the Mail app. Times are relative to first launch so the
// list always shows a realistic mix of "H:MM AM" and weekday stamps.

const now = Date.now()
const MIN = 60 * 1000
const HR = 60 * MIN
const DAY = 24 * HR

export function seedMessages() {
  return [
    {
      id: 'm-github',
      mailbox: 'inbox',
      unread: true,
      vip: false,
      date: now - 18 * MIN,
      from: { name: 'GitHub', email: 'notifications@github.com' },
      to: 'guest@icloud.com',
      subject: '[macos-web] Pull request #42 merged: Add Mail app',
      body:
        'Merged!\n' +
        'chenghengli merged 3 commits into main from feature/mail-app 12 minutes ago.\n\n' +
        'Add Mail app\n' +
        'This PR adds a faithful Apple Mail recreation with a three-pane layout, compose sheet, search and Trash support.\n\n' +
        '— You are receiving this because you were assigned.\n' +
        'Reply to this email directly or view it on GitHub.',
    },
    {
      id: 'm-maya',
      mailbox: 'inbox',
      unread: true,
      vip: true,
      date: now - 2 * HR,
      from: { name: 'Maya Chen', email: 'maya.chen@me.com' },
      to: 'guest@icloud.com',
      subject: 'Dinner this weekend? 🍜',
      body:
        'Hey!\n\n' +
        'Are you free Saturday night? A few of us are going to that new ramen place on Valencia — the one with the hour-long line. I can grab us a spot around 7 if you are in.\n\n' +
        'Also, did you ever finish the book I lent you? No pressure, just need to know whether to start recommending it to other people.\n\n' +
        'Let me know!\n' +
        '— Maya',
    },
    {
      id: 'm-wwdc',
      mailbox: 'inbox',
      unread: true,
      vip: false,
      date: now - 5 * HR,
      from: { name: 'Apple Developer', email: 'developer@apple.com' },
      to: 'guest@icloud.com',
      subject: 'WWDC26 recap: everything we announced',
      body:
        'Hello Developer,\n\n' +
        'WWDC26 has wrapped. In case you missed the keynote, here are the highlights:\n\n' +
        '• macOS Tahoe 26 with the new Liquid Glass design\n' +
        '• SwiftUI gains deeper windowing and scene APIs\n' +
        '• Foundation Models framework, on-device and private\n' +
        '• Xcode 26 with predictive code completion\n\n' +
        'All session videos are now available in the Developer app. We can’t wait to see what you build.\n\n' +
        'Apple Developer Relations',
    },
    {
      id: 'm-apple-receipt',
      mailbox: 'inbox',
      unread: false,
      vip: false,
      date: now - 26 * HR,
      from: { name: 'Apple', email: 'no-reply@apple.com' },
      to: 'guest@icloud.com',
      subject: 'Your receipt from Apple',
      body:
        'Dear Customer,\n\n' +
        'Thank you for your purchase. This is a receipt for your order.\n\n' +
        'Order ID: MZX4829103\n' +
        'Date: ' + new Date(now - 26 * HR).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '\n\n' +
        'Logic Pro for Mac — $199.99\n' +
        'App Store, billed to Visa •••• 4242\n\n' +
        'If you did not authorize this purchase, visit reportaproblem.apple.com.\n\n' +
        'Apple',
    },
    {
      id: 'm-newsletter',
      mailbox: 'inbox',
      unread: false,
      vip: false,
      date: now - 30 * HR,
      from: { name: 'The Weekly Download', email: 'news@weeklydownload.tech' },
      to: 'guest@icloud.com',
      subject: 'Issue #128: Liquid Glass, everywhere',
      body:
        'THE WEEKLY DOWNLOAD — Issue #128\n\n' +
        'This week in design: Apple’s Liquid Glass material is the story of the year. Love it or hate it, every app you use is about to get blurrier, rounder and a little more translucent.\n\n' +
        'Also inside:\n' +
        '• Why local-first apps are winning again\n' +
        '• A taxonomy of loading spinners\n' +
        '• Tool of the week: an honest-to-goodness offline mail client\n\n' +
        'You are receiving this because you subscribed. Unsubscribe any time.',
    },
    {
      id: 'm-united',
      mailbox: 'inbox',
      unread: false,
      vip: false,
      date: now - 2 * DAY,
      from: { name: 'United Airlines', email: 'receipts@united.com' },
      to: 'guest@icloud.com',
      subject: 'Your trip confirmation — SFO to JFK',
      body:
        'Confirmation number: K7QPL2\n\n' +
        'San Francisco (SFO) → New York (JFK)\n' +
        'UA 1180 · Departs 8:15 AM · Arrives 4:47 PM\n' +
        'Seat 14A · Economy Plus\n\n' +
        'Check in opens 24 hours before departure. Add this trip to your calendar and arrive at least 2 hours early.\n\n' +
        'Thank you for flying United.',
    },
    {
      id: 'm-bank',
      mailbox: 'inbox',
      unread: false,
      vip: false,
      date: now - 3 * DAY,
      from: { name: 'First Republic Bank', email: 'statements@firstrepublic.example' },
      to: 'guest@icloud.com',
      subject: 'Your June statement is ready',
      body:
        'Your June checking account statement is now available.\n\n' +
        'Sign in to online banking to view or download your statement as a PDF. For your security, we never attach statements to email.\n\n' +
        'If you have questions, call the number on the back of your card.\n\n' +
        'First Republic Bank',
    },
    {
      id: 'm-standup',
      mailbox: 'inbox',
      unread: false,
      vip: false,
      date: now - 4 * DAY,
      from: { name: 'Priya Nair', email: 'priya.nair@workmail.com' },
      to: 'guest@icloud.com',
      subject: 'Standup notes — Thursday',
      body:
        'Hi team,\n\n' +
        'Quick notes from today’s standup:\n\n' +
        '• Search indexing is green across staging\n' +
        '• Priya is pairing with Sam on the compose-sheet animation\n' +
        '• Design review moved to Monday 10 AM\n' +
        '• Reminder: update your on-call rotations\n\n' +
        'Have a good evening,\n' +
        'Priya',
    },
    {
      id: 'm-sent-wwdc',
      mailbox: 'sent',
      unread: false,
      vip: false,
      date: now - 8 * HR,
      from: { name: 'Guest', email: 'guest@icloud.com' },
      to: 'maya.chen@me.com',
      subject: 'Re: WWDC26 watch party',
      body:
        'Count me in — I will bring the projector and snacks. Keynote starts at 10 AM, so come by around 9:30.\n\n' +
        '— Guest',
    },
    {
      id: 'm-junk-prize',
      mailbox: 'junk',
      unread: false,
      vip: false,
      date: now - 2 * DAY,
      from: { name: 'Prize Center', email: 'winner@totally-legit-prizes.biz' },
      to: 'guest@icloud.com',
      subject: 'CONGRATULATIONS!!! You WON a FREE CRUISE 🛳️',
      body:
        'Dear Lucky Winner,\n\n' +
        'You have been SELECTED to receive a FREE 7-day luxury cruise for two! Simply reply with your full name, address and credit card number to claim your prize within 24 hours.\n\n' +
        'This is a limited time offer. Act NOW!',
    },
  ]
}
