// Built-in dictionary data — tech- and Apple-flavored entries.
// Each entry: { word, phonetic, entries: [{ pos, senses: [{ def, example }] }], seeAlso: [] }
// Keys are lowercase words; seeAlso targets must exist as keys.

const E = (word, phonetic, entries, seeAlso = []) => ({ word, phonetic, entries, seeAlso })

export const DICTIONARY = {
  airdrop: E('airdrop', '/ˈeədrɒp/', [
    { pos: 'noun', senses: [
      { def: "Apple's feature for wirelessly sharing files between nearby devices.", example: 'She sent the photos to his Mac with AirDrop.' },
      { def: 'the delivery of supplies or personnel by parachute from an aircraft.', example: 'The plane made an airdrop of rations over the valley.' },
    ] },
    { pos: 'verb', senses: [
      { def: 'to share (a file) using AirDrop.', example: 'AirDrop me the PDF when you get a chance.' },
    ] },
  ], ['bluetooth', 'wifi']),

  algorithm: E('algorithm', '/ˈælɡərɪðəm/', [
    { pos: 'noun', senses: [
      { def: 'a step-by-step procedure for solving a problem or performing a computation.', example: 'The sort uses a divide-and-conquer algorithm.' },
      { def: 'the set of rules a service uses to select and rank content.', example: 'The recommendation algorithm surfaced an old photo.' },
    ] },
  ], ['binary', 'bytecode']),

  apple: E('apple', '/ˈæpəl/', [
    { pos: 'noun', senses: [
      { def: 'the round fruit of a tree of the rose family, typically with thin red or green skin and crisp flesh.', example: 'She packed an apple in her lunch.' },
      { def: '(Apple) the technology company founded in Cupertino in 1976.', example: 'Apple unveiled the Macintosh to a cheering crowd in 1984.' },
      { def: '(the apple of someone’s eye) a person of whom one is extremely fond and proud.', example: 'His daughter was the apple of his eye.' },
    ] },
  ], ['macintosh', 'silicon']),

  bandwidth: E('bandwidth', '/ˈbændwɪdθ/', [
    { pos: 'noun', senses: [
      { def: 'the range of frequencies used to transmit a signal.', example: 'The station occupies only a narrow slice of bandwidth.' },
      { def: 'the amount of data that can be transmitted in a fixed amount of time.', example: 'Streaming 4K video requires plenty of bandwidth.' },
      { def: '(informal) a person’s mental or emotional capacity to deal with something.', example: 'I don’t have the bandwidth for another project this week.' },
    ] },
  ], ['latency', 'ethernet']),

  binary: E('binary', '/ˈbaɪnəri/', [
    { pos: 'adjective', senses: [
      { def: 'relating to, composed of, or involving two things.', example: 'A binary choice between yes and no.' },
      { def: 'relating to a system of numbers with 2 as its base.', example: 'Computers store all data in binary.' },
    ] },
    { pos: 'noun', senses: [
      { def: 'the binary number system.', example: 'The value 13 is written 1101 in binary.' },
      { def: 'a compiled program that can be executed directly by a computer.', example: 'The installer copies the binary into /Applications.' },
    ] },
  ], ['compiler', 'bytecode']),

  bluetooth: E('bluetooth', '/ˈbluːtuːθ/', [
    { pos: 'noun', senses: [
      { def: 'a short-range wireless standard for connecting devices such as keyboards, mice, and headphones.', example: 'The Magic Keyboard pairs with the Mac over Bluetooth.' },
      { def: 'a connection made using this standard.', example: 'Check that Bluetooth is turned on in Control Center.' },
    ] },
  ], ['wifi', 'airdrop']),

  bytecode: E('bytecode', '/ˈbaɪtkəʊd/', [
    { pos: 'noun', senses: [
      { def: 'an intermediate code executed by a virtual machine rather than directly by the hardware.', example: 'Java source is compiled to bytecode for the JVM.' },
      { def: 'loosely, any compact encoded set of instructions produced by a compiler.', example: 'The interpreter decodes each bytecode in turn.' },
    ] },
  ], ['compiler', 'binary']),

  cache: E('cache', '/kæʃ/', [
    { pos: 'noun', senses: [
      { def: 'a hardware or software store of recently used data, kept for fast access.', example: 'The CPU cache holds megabytes of hot data.' },
      { def: 'a hidden store of provisions or valuables.', example: 'The explorers left a cache of food at base camp.' },
    ] },
    { pos: 'verb', senses: [
      { def: 'to store (data) in a cache.', example: 'Safari caches images to speed up repeat visits.' },
    ] },
  ], ['server', 'latency']),

  clipboard: E('clipboard', '/ˈklɪpbɔːd/', [
    { pos: 'noun', senses: [
      { def: 'a temporary area of memory where cut or copied data is held for pasting.', example: 'The copied text waits on the clipboard until you paste it.' },
      { def: 'a small board with a clip at the top for holding papers.', example: 'The coach carried a clipboard and a whistle.' },
    ] },
  ], ['cursor']),

  cloud: E('cloud', '/klaʊd/', [
    { pos: 'noun', senses: [
      { def: 'a visible mass of water droplets or ice crystals floating in the atmosphere.', example: 'A single cloud drifted across the sky.' },
      { def: '(the cloud) networked servers accessed over the internet, used to store and process data.', example: 'Her photos sync to the cloud overnight.' },
      { def: 'a state of gloom or suspicion hanging over someone or something.', example: 'The scandal cast a cloud over the launch.' },
    ] },
    { pos: 'verb', senses: [
      { def: 'to make or become less clear or transparent.', example: 'The cold window clouded with condensation.' },
    ] },
  ], ['server', 'safari']),

  compiler: E('compiler', '/kəmˈpaɪlə/', [
    { pos: 'noun', senses: [
      { def: 'a program that translates source code into machine code or another lower-level form.', example: 'Clang is the default compiler in Xcode.' },
      { def: 'a person who compiles a collection of material.', example: 'The compiler of the anthology added a foreword.' },
    ] },
  ], ['debugger', 'bytecode', 'binary']),

  cursor: E('cursor', '/ˈkɜːsə/', [
    { pos: 'noun', senses: [
      { def: 'a movable indicator on a screen showing where the next action will take place.', example: 'The cursor blinked at the end of the sentence.' },
      { def: 'the arrow or pointer controlled by a mouse or trackpad.', example: 'Move the cursor up to the menu bar.' },
    ] },
  ], ['clipboard', 'pixel']),

  debugger: E('debugger', '/diːˈbʌɡə/', [
    { pos: 'noun', senses: [
      { def: 'a tool used to test other programs and locate their errors.', example: 'LLDB is the debugger bundled with Xcode.' },
      { def: 'a person or device that removes faults or hidden microphones.', example: 'A debugger swept the room for bugs.' },
    ] },
  ], ['compiler']),

  dock: E('dock', '/dɒk/', [
    { pos: 'noun', senses: [
      { def: 'the strip of icons along the edge of the Mac screen used to launch and switch between apps.', example: 'Drag the app into the Dock to keep it there.' },
      { def: 'a structure extending alongshore where ships are loaded or repaired.', example: 'The ferry eased into the dock.' },
      { def: 'the enclosure in a criminal court where the accused sits.', example: 'The defendant stood in the dock.' },
    ] },
    { pos: 'verb', senses: [
      { def: 'to deduct (money) from wages or payment.', example: 'They docked his pay for the broken window.' },
    ] },
  ], ['finder', 'widget']),

  emoji: E('emoji', '/ɪˈməʊdʒi/', [
    { pos: 'noun', senses: [
      { def: 'a small digital image used to express an idea or emotion in electronic communication.', example: 'She ended the message with a laughing emoji.' },
      { def: 'this style of pictographs collectively.', example: 'The keyboard picks up new emoji every year.' },
    ] },
  ], ['widget']),

  ethernet: E('ethernet', '/ˈiːθənɛt/', [
    { pos: 'noun', senses: [
      { def: 'a system for connecting computers in a local area network by cable.', example: 'The studio Macs are wired together over Ethernet.' },
      { def: 'a connection or port using this system.', example: 'Plug the adapter into the Ethernet jack.' },
    ] },
  ], ['router', 'bandwidth']),

  finder: E('finder', '/ˈfaɪndə/', [
    { pos: 'noun', senses: [
      { def: '(Finder) the default file manager of macOS, presenting the Desktop and folder windows.', example: 'The Finder icon sits at the far left of the Dock.' },
      { def: 'a person who finds something.', example: 'The finder of the wallet was rewarded.' },
      { def: 'a small telescope attached to a larger one for locating an object.', example: 'He centered the comet in the finder before looking through the main scope.' },
    ] },
  ], ['dock', 'spotlight']),

  firewall: E('firewall', '/ˈfaɪəwɔːl/', [
    { pos: 'noun', senses: [
      { def: 'a security system that monitors and controls incoming and outgoing network traffic.', example: 'The firewall blocked the unexpected connection.' },
      { def: 'a fireproof wall that prevents the spread of fire through a building or vehicle.', example: 'The engine is separated from the cabin by a firewall.' },
    ] },
  ], ['sandbox', 'router']),

  firmware: E('firmware', '/ˈfɜːmweə/', [
    { pos: 'noun', senses: [
      { def: 'permanent software programmed into a device’s read-only memory.', example: 'The keyboard received a firmware update overnight.' },
      { def: 'loosely, low-level software that boots and controls hardware.', example: 'The firmware hands off to the kernel at startup.' },
    ] },
  ], ['silicon', 'kernel']),

  hypercard: E('hypercard', '/ˈhaɪpəkɑːd/', [
    { pos: 'noun', senses: [
      { def: '(HyperCard) Apple’s 1987 application for building stacks of linked cards, an early form of hypermedia.', example: 'HyperCard let teachers build interactive lessons without programming.' },
      { def: 'a single card or stack created with that software.', example: 'He kept his addresses in a HyperCard on an old SE/30.' },
    ] },
  ], ['macintosh', 'quicktime']),

  kernel: E('kernel', '/ˈkɜːnəl/', [
    { pos: 'noun', senses: [
      { def: 'the central core of an operating system, with full control over the hardware.', example: 'XNU is the kernel at the heart of macOS.' },
      { def: 'the softer, usually edible part inside a seed, nut, or fruit stone.', example: 'The kernel of the walnut.' },
      { def: 'the central or most important part of a matter.', example: 'There was a kernel of truth in the rumor.' },
    ] },
  ], ['unix', 'shell']),

  keychain: E('keychain', '/ˈkiːtʃeɪn/', [
    { pos: 'noun', senses: [
      { def: '(Keychain) the macOS system that securely stores passwords, certificates, and notes.', example: 'Safari offered to save the password in iCloud Keychain.' },
      { def: 'a small chain or ring for holding keys together.', example: 'Her keys jingled on a silver keychain.' },
    ] },
  ], ['firewall', 'cloud']),

  latency: E('latency', '/ˈleɪtənsi/', [
    { pos: 'noun', senses: [
      { def: 'the delay before a transfer of data begins following an instruction for its transfer.', example: 'The satellite link added noticeable latency to the call.' },
      { def: 'the state of existing but not yet being developed or manifest.', example: 'A period of latency preceded the symptoms.' },
    ] },
  ], ['bandwidth', 'cache']),

  macintosh: E('macintosh', '/ˈmækɪntɒʃ/', [
    { pos: 'noun', senses: [
      { def: '(Macintosh) a line of personal computers designed and marketed by Apple since 1984.', example: 'The original Macintosh shipped with a mouse and a smiling icon.' },
      { def: '(also mackintosh) a full-length waterproof coat.', example: 'She buttoned her macintosh against the rain.' },
    ] },
  ], ['apple', 'finder']),

  modem: E('modem', '/ˈməʊdɛm/', [
    { pos: 'noun', senses: [
      { def: 'a device that modulates and demodulates signals for data transmission over a line.', example: 'The old modem sang its handshake before connecting.' },
      { def: 'loosely, the box supplied by an internet provider to connect a home network.', example: 'Restart the modem if the Wi-Fi drops.' },
    ] },
  ], ['router', 'ethernet']),

  partition: E('partition', '/pɑːˈtɪʃən/', [
    { pos: 'noun', senses: [
      { def: 'a logically separate division of a storage device.', example: 'Disk Utility can shrink the partition to make room for Linux.' },
      { def: 'the action or state of dividing something into parts.', example: 'The partition of the country followed the war.' },
      { def: 'a thin wall or structure dividing a space.', example: 'A glass partition separated the kitchen from the office.' },
    ] },
    { pos: 'verb', senses: [
      { def: 'to divide into parts.', example: 'They partitioned the open floor into cubicles.' },
    ] },
  ], ['kernel']),

  pixel: E('pixel', '/ˈpɪksəl/', [
    { pos: 'noun', senses: [
      { def: 'the smallest controllable element of a picture represented on a display.', example: 'A dead pixel glowed faintly in the corner of the screen.' },
      { def: 'a minute area of illumination in a digital image.', example: 'Zoom in far enough and the photo dissolves into pixels.' },
    ] },
  ], ['retina', 'cursor']),

  protocol: E('protocol', '/ˈprəʊtəkɒl/', [
    { pos: 'noun', senses: [
      { def: 'a set of rules governing the exchange of data between devices or programs.', example: 'HTTP is the protocol that carries the web.' },
      { def: 'the official procedure or system of rules in affairs of state.', example: 'Diplomatic protocol required an interpreter.' },
      { def: 'the original draft of a diplomatic document or agreement.', example: 'The protocol was signed by both delegations.' },
    ] },
  ], ['server', 'ethernet']),

  quantum: E('quantum', '/ˈkwɒntəm/', [
    { pos: 'noun', senses: [
      { def: 'a discrete quantity of energy proportional in magnitude to the frequency of radiation it represents.', example: 'Light is absorbed in quanta.' },
      { def: 'a required or allowed amount, especially an amount of money.', example: 'The quantum of damages was left to the jury.' },
    ] },
    { pos: 'adjective', senses: [
      { def: 'relating to quantum mechanics.', example: 'A quantum computer manipulates qubits instead of bits.' },
      { def: '(of a change or advance) sudden and significant.', example: 'A quantum leap in performance per watt.' },
    ] },
  ], ['transistor', 'silicon']),

  quicktime: E('quicktime', '/ˈkwɪktaɪm/', [
    { pos: 'noun', senses: [
      { def: '(QuickTime) Apple’s multimedia framework for playing, recording, and editing audio and video.', example: 'QuickTime Player records the screen with a menu-bar click.' },
      { def: 'a movie file produced or played by that framework.', example: 'He mailed me a QuickTime of the keynote.' },
    ] },
  ], ['hypercard', 'safari']),

  retina: E('retina', '/ˈrɛtɪnə/', [
    { pos: 'noun', senses: [
      { def: 'a layer at the back of the eyeball containing cells sensitive to light.', example: 'The image of the landscape fell upon her retina.' },
      { def: '(Retina) Apple’s name for displays whose pixels are small enough to be indiscernible at normal viewing distance.', example: 'The Retina display renders text like print.' },
    ] },
  ], ['pixel']),

  router: E('router', '/ˈruːtə/', [
    { pos: 'noun', senses: [
      { def: 'a device that forwards data packets between computer networks.', example: 'The router sat in the hallway, blinking all night.' },
      { def: 'a power tool with a shaped cutter, used in carpentry for hollowing out an area.', example: 'He cut the groove with a router.' },
    ] },
  ], ['modem', 'ethernet', 'wifi']),

  safari: E('safari', '/səˈfɑːri/', [
    { pos: 'noun', senses: [
      { def: '(Safari) Apple’s web browser, first released in 2003.', example: 'Safari renders pages with the WebKit engine.' },
      { def: 'an overland journey to observe or hunt wild animals, especially in East Africa.', example: 'They went on safari in the Serengeti.' },
    ] },
  ], ['quicktime', 'server']),

  sandbox: E('sandbox', '/ˈsændbɒks/', [
    { pos: 'noun', senses: [
      { def: 'a restricted environment in which code runs with limited access to the rest of the system.', example: 'Apps from the App Store run inside a sandbox.' },
      { def: 'a shallow box or hollow filled with sand for children to play in.', example: 'The toddler spent the afternoon in the sandbox.' },
    ] },
  ], ['firewall', 'kernel']),

  server: E('server', '/ˈsɜːvə/', [
    { pos: 'noun', senses: [
      { def: 'a computer or program that provides data or services to other computers on a network.', example: 'The mail server queues outgoing messages.' },
      { def: 'a person who serves food, or who serves the ball in tennis.', example: 'The server brought the check with a smile.' },
    ] },
  ], ['cloud', 'protocol', 'cache']),

  shell: E('shell', '/ʃɛl/', [
    { pos: 'noun', senses: [
      { def: 'a program that interprets typed commands and runs other programs.', example: 'zsh is the default login shell in macOS.' },
      { def: 'the hard protective outer case of a mollusk, crustacean, nut, or egg.', example: 'The shell of the crab was left on the beach.' },
      { def: 'an explosive projectile fired by a large gun.', example: 'Shells fell beyond the ridge.' },
    ] },
    { pos: 'verb', senses: [
      { def: 'to remove the shell or pod from.', example: 'Shell the peas before blanching them.' },
    ] },
  ], ['terminal', 'kernel']),

  silicon: E('silicon', '/ˈsɪlɪkən/', [
    { pos: 'noun', senses: [
      { def: 'the chemical element of atomic number 14, a semiconductor widely used in electronics.', example: 'Silicon wafers are etched into chips.' },
      { def: '(attributive) microchips designed by Apple for the Mac.', example: 'Apple silicon brought the M1 to the MacBook Air.' },
    ] },
  ], ['transistor', 'quantum']),

  spotlight: E('spotlight', '/ˈspɒtlaɪt/', [
    { pos: 'noun', senses: [
      { def: '(Spotlight) the macOS search feature that finds files, apps, and answers from the menu bar.', example: 'Press Command-Space to open Spotlight.' },
      { def: 'a lamp projecting a narrow, intense beam of light directly onto a place or person.', example: 'The singer stepped into the spotlight.' },
      { def: 'intense scrutiny or public attention.', example: 'The launch put the small team in the spotlight.' },
    ] },
  ], ['finder']),

  terminal: E('terminal', '/ˈtɜːmɪnəl/', [
    { pos: 'noun', senses: [
      { def: '(Terminal) the macOS application that presents a text-based interface to the shell.', example: 'Terminal opens a zsh window by default.' },
      { def: 'a device at which a user enters data into, or receives data from, a computer.', example: 'A green-screen terminal still runs the stockroom.' },
      { def: 'a station at the end of a transport route.', example: 'The bus pulled into the terminal at dawn.' },
    ] },
    { pos: 'adjective', senses: [
      { def: 'forming or situated at the end or extremity of something.', example: 'The terminal bud of the branch.' },
    ] },
  ], ['shell', 'unix']),

  transistor: E('transistor', '/trænˈzɪstə/', [
    { pos: 'noun', senses: [
      { def: 'a semiconductor device used to amplify or switch electronic signals.', example: 'Billions of transistors fit on a single Apple silicon chip.' },
      { def: '(transistor radio) a portable radio using such devices.', example: 'Grandfather listened to the game on a transistor.' },
    ] },
  ], ['silicon', 'quantum']),

  unix: E('unix', '/ˈjuːnɪks/', [
    { pos: 'noun', senses: [
      { def: '(UNIX) a multitasking, multiuser operating system developed at Bell Labs in the 1970s.', example: 'macOS is certified as a genuine UNIX system.' },
      { def: 'the family of operating systems derived from or inspired by it.', example: 'Linux is a Unix-like system.' },
    ] },
  ], ['kernel', 'terminal']),

  widget: E('widget', '/ˈwɪdʒɪt/', [
    { pos: 'noun', senses: [
      { def: 'a small application or interface component that shows timely information at a glance.', example: 'The weather widget sits in Notification Center.' },
      { def: 'a small gadget or mechanical device, especially one whose name is unknown or unspecified.', example: 'A shiny widget lay on the workbench.' },
    ] },
  ], ['dock', 'emoji']),

  wifi: E('wifi', '/ˈwaɪfaɪ/', [
    { pos: 'noun', senses: [
      { def: 'technology that allows devices to connect to a network wirelessly using radio waves.', example: 'The café’s Wi-Fi was fast enough for video calls.' },
      { def: 'a wireless network connection.', example: 'Turn Wi-Fi off and on again in Control Center.' },
    ] },
  ], ['bluetooth', 'router']),
}

const KEYS = Object.keys(DICTIONARY)

// Suggestions: prefix matches first, then substring matches.
export function searchWords(q) {
  const s = String(q || '').trim().toLowerCase()
  if (!s) return []
  const prefix = KEYS.filter((k) => k.startsWith(s))
  const rest = KEYS.filter((k) => !k.startsWith(s) && k.includes(s))
  return [...prefix, ...rest]
}

// Deterministic pick for the Siri Suggestions-style "Word of the Day".
export function wordOfTheDay() {
  const day = Math.floor(Date.now() / 86400000)
  return DICTIONARY[KEYS[day % KEYS.length]]
}
