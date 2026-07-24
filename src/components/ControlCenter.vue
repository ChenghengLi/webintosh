<script setup>
import { ref, computed } from 'vue'
import { useSystemStore } from '../stores/system'

const system = useSystemStore()
const wifiOpen = ref(false)
const btOpen = ref(false)

const airpods = computed(() => system.btDevices.find((d) => d.name === 'AirPods Pro'))
const airpodsConnected = computed(() => system.bluetooth && !!airpods.value?.connected)
const airpodsBattery = computed(() => airpods.value?.battery ?? 0)

function toggleWifiCard() {
  if (!system.wifi) {
    system.wifi = true
    wifiOpen.value = true
    return
  }
  wifiOpen.value = !wifiOpen.value
  btOpen.value = false
}
function toggleBtCard() {
  if (!system.bluetooth) {
    system.bluetooth = true
    btOpen.value = true
    return
  }
  btOpen.value = !btOpen.value
  wifiOpen.value = false
}
function mediaPlayPause() {
  system.mediaControls?.playPause?.()
}
function mediaNext() {
  system.mediaControls?.next?.()
}
function mediaPrev() {
  system.mediaControls?.prev?.()
}
</script>

<template>
  <div v-if="system.controlCenterOpen">
    <div class="backdrop" @pointerdown="system.controlCenterOpen = false"></div>
    <div class="cc glass-strong">
      <div class="cols">
        <div class="col">
          <!-- Wi-Fi -->
          <div class="card conn">
            <div class="conn-row" :class="{ expandable: system.wifi }" @click="toggleWifiCard">
              <span class="ico blue" :class="{ off: !system.wifi }" @click.stop="system.wifi = !system.wifi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 15.8a5.5 5.5 0 0 1 7 0" />
                  <circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span class="meta">
                <b>Wi-Fi</b>
                <small>{{ system.wifi ? system.wifiNetwork : 'Off' }}</small>
              </span>
              <span class="chev" :class="{ down: wifiOpen && system.wifi }">›</span>
            </div>
            <div class="expand" :class="{ open: wifiOpen && system.wifi }">
              <div class="expand-inner">
                <div class="sublist">
                  <button v-for="n in system.wifiNetworks" :key="n" class="subrow" @click="system.joinNetwork(n)">
                    <span class="check">{{ n === system.wifiNetwork ? '✓' : '' }}</span>
                    {{ n }}
                    <span class="lock">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 15.8a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" /></svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bluetooth -->
          <div class="card conn">
            <div class="conn-row" :class="{ expandable: system.bluetooth }" @click="toggleBtCard">
              <span class="ico blue" :class="{ off: !system.bluetooth }" @click.stop="system.bluetooth = !system.bluetooth">
                <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M196.8 169.6L141.33 128l55.47-41.6a8 8 0 0 0 0-12.8l-64-48A8 8 0 0 0 120 32v80L68.8 73.6a8 8 0 0 0-9.6 12.8l55.47 41.6l-55.47 41.6a8 8 0 1 0 9.6 12.8L120 144v80a8 8 0 0 0 12.8 6.4l64-48a8 8 0 0 0 0-12.8M136 48l42.67 32L136 112Zm0 160v-64l42.67 32Z" />
                </svg>
              </span>
              <span class="meta">
                <b>Bluetooth</b>
                <small>{{ system.bluetooth ? 'On' : 'Off' }}</small>
              </span>
              <span class="chev" :class="{ down: btOpen && system.bluetooth }">›</span>
            </div>
            <div class="expand" :class="{ open: btOpen && system.bluetooth }">
              <div class="expand-inner">
                <div class="sublist">
                  <button v-for="d in system.btDevices" :key="d.name" class="subrow" @click="system.toggleBtDevice(d.name)">
                <span class="dev-ico">
                  <svg v-if="d.name.includes('AirPods')" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M7 8a3 3 0 0 1 3 3v6a2 2 0 1 1-4 0V9a1 1 0 0 1 1-1z" /><path d="M17 8a3 3 0 0 0-3 3v6a2 2 0 1 0 4 0V9a1 1 0 0 0-1-1z" />
                  </svg>
                  <svg v-else-if="d.name.includes('Mouse')" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="7" y="2" width="10" height="20" rx="5" /><path d="M12 6v4" />
                  </svg>
                  <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
                  </svg>
                </span>
                {{ d.name }}
                <span class="dev-state">{{ d.connected ? (d.battery ? d.battery + '%' : 'Connected') : 'Not Connected' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- AirDrop -->
          <div class="card conn">
            <div class="conn-row" @click="system.airdrop = !system.airdrop">
              <span class="ico blue" :class="{ off: !system.airdrop }">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <circle cx="12" cy="19" r="2" fill="currentColor" stroke="none" />
                  <path d="M6 19a6 6 0 0 1 12 0" />
                  <path d="M2 19a10 10 0 0 1 20 0" />
                  <path d="M-2 19a14 14 0 0 1 28 0" />
                </svg>
              </span>
              <span class="meta">
                <b>AirDrop</b>
                <small>{{ system.airdrop ? 'Contacts Only' : 'Off' }}</small>
              </span>
              <span class="chev">›</span>
            </div>
          </div>
        </div>

        <div class="col">
          <!-- Now Playing -->
          <div class="card now-playing">
            <div class="np-meta">
              <template v-if="system.nowPlaying">
                <b class="np-title">{{ system.nowPlaying.title }}</b>
                <small class="np-sub">{{ system.nowPlaying.artist }} — {{ system.nowPlaying.app }}</small>
              </template>
              <b v-else class="np-title dim">Not Playing</b>
            </div>
            <div class="np-controls">
              <button class="np-btn" @click="mediaPrev" :disabled="!system.mediaControls" title="Previous">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h2v16H6zM20 4v16L8 12z" /></svg>
              </button>
              <button class="np-btn play" @click="mediaPlayPause" :disabled="!system.mediaControls" title="Play/Pause">
                <svg v-if="!system.nowPlaying?.playing" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l14 8-14 8z" /></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              </button>
              <button class="np-btn" @click="mediaNext" :disabled="!system.mediaControls" title="Next">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4h2v16h-2zM4 4v16l12-8z" /></svg>
              </button>
            </div>
          </div>

          <div class="mini-row">
            <button class="card icon-card" :class="{ active: system.dark }" @click="system.toggleDark()" title="Dark Mode">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button class="card icon-card" title="Screen Mirroring">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="13" height="14" rx="2" /><rect x="17" y="8" width="5" height="8" rx="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>

          <!-- Do Not Disturb -->
          <button class="card dnd" :class="{ on: system.focus }" @click="system.focus = !system.focus">
            <span class="ico purple" :class="{ off: !system.focus }">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            </span>
            <span class="meta">
              <b>Do Not Disturb</b>
              <small>{{ system.focus ? 'On' : 'Off' }}</small>
            </span>
          </button>
        </div>
      </div>

      <!-- Display -->
      <div class="card slider-card">
        <div class="slider-head"><span>Display</span></div>
        <div class="slider-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <input type="range" min="20" max="100" v-model.number="system.brightness" />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </div>
      </div>

      <!-- Sound -->
      <div class="card slider-card">
        <div class="slider-head"><span>Sound</span></div>
        <div class="slider-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
          </svg>
          <input type="range" min="0" max="100" v-model.number="system.volume" />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9.4 9.4 0 0 1 0 13" />
          </svg>
        </div>
        <div class="outputs">
          <button class="out" :class="{ on: system.audioOutput === 'speakers' }" @click="system.audioOutput = 'speakers'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" />
            </svg>
            <span class="out-name">MacBook Pro Speakers</span>
            <span class="check">{{ system.audioOutput === 'speakers' ? '✓' : '' }}</span>
          </button>
          <button
            class="out"
            :class="{ on: system.audioOutput === 'airpods', disabled: !airpodsConnected }"
            @click="airpodsConnected && (system.audioOutput = 'airpods')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M7 8a3 3 0 0 1 3 3v6a2 2 0 1 1-4 0V9a1 1 0 0 1 1-1z" /><path d="M17 8a3 3 0 0 0-3 3v6a2 2 0 1 0 4 0V9a1 1 0 0 0-1-1z" />
            </svg>
            <span class="out-name">AirPods Pro</span>
            <span class="out-batt" v-if="airpodsConnected">{{ airpodsBattery }}%</span>
            <span class="check">{{ system.audioOutput === 'airpods' ? '✓' : '' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 7000;
}
.cc {
  position: fixed;
  top: 36px;
  right: 10px;
  width: 340px;
  z-index: 7001;
  border-radius: 18px;
  border: 0.5px solid var(--border);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: cc-in 0.18s cubic-bezier(0.32, 0.72, 0.35, 1);
}
@keyframes cc-in {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
}
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card {
  background: rgba(128, 128, 128, 0.12);
  border-radius: 15px;
  padding: 8px 10px;
}
.conn {
  padding: 4px 10px;
}
.conn-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  cursor: default;
}
.ico {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: none;
  color: #fff;
  transition: background-color 0.2s ease, transform 0.12s ease;
}
.ico:active {
  transform: scale(0.88);
}
.expand {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.24s cubic-bezier(0.32, 0.72, 0.35, 1);
}
.expand.open {
  grid-template-rows: 1fr;
}
.expand-inner {
  overflow: hidden;
  min-height: 0;
}
.ico.blue {
  background: var(--accent);
}
.ico.purple {
  background: #5e5ce6;
}
.ico.off {
  background: rgba(128, 128, 128, 0.45);
  color: rgba(255, 255, 255, 0.85);
}
.meta {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  flex: 1;
  min-width: 0;
}
.meta b {
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta small {
  font-size: 10.5px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chev {
  color: var(--text-dim);
  font-size: 15px;
  transition: transform 0.15s;
}
.chev.down {
  transform: rotate(90deg);
}
.sublist {
  padding: 2px 0 6px 39px;
  display: flex;
  flex-direction: column;
  border-top: 0.5px solid var(--border);
}
.subrow {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12px;
}
.subrow:hover {
  background: var(--hover);
}
.check {
  width: 14px;
  color: var(--accent);
  font-weight: 700;
}
.lock {
  margin-left: auto;
  display: flex;
  gap: 3px;
  opacity: 0.55;
}
.dev-ico {
  width: 14px;
  display: grid;
  place-items: center;
}
.dev-state {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-dim);
}
.now-playing {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  min-height: 96px;
  padding: 12px;
}
.np-title {
  font-size: 13.5px;
  font-weight: 700;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-title.dim {
  color: var(--text-dim);
  font-weight: 600;
}
.np-sub {
  font-size: 11px;
  color: var(--text-dim);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-controls {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.np-btn {
  width: 38px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--text);
}
.np-btn:hover:not(:disabled) {
  background: var(--hover);
}
.np-btn:disabled {
  opacity: 0.4;
}
.mini-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.icon-card {
  display: grid;
  place-items: center;
  min-height: 44px;
  color: var(--text);
}
.icon-card.active {
  background: var(--accent);
  color: #fff;
}
.dnd {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  flex: 1;
}
.slider-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
}
.slider-head {
  font-size: 12.5px;
  font-weight: 600;
}
.slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slider-row input {
  flex: 1;
}
.outputs {
  display: flex;
  flex-direction: column;
  border-top: 0.5px solid var(--border);
  padding-top: 6px;
  gap: 2px;
}
.out {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 7px;
  font-size: 12px;
  text-align: left;
}
.out:hover:not(.disabled) {
  background: var(--hover);
}
.out.on {
  color: var(--accent);
  font-weight: 600;
}
.out.disabled {
  opacity: 0.45;
}
.out-name {
  flex: 1;
}
.out-batt {
  color: var(--text-dim);
  font-size: 11px;
}
.check {
  width: 12px;
  font-weight: 700;
}
input[type='range'] {
  accent-color: var(--accent);
}
</style>
