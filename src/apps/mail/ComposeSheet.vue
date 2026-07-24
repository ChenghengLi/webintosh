<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send', 'discard'])

const to = ref('')
const cc = ref('')
const subject = ref('')
const body = ref('')

function send() {
  emit('send', {
    to: to.value,
    cc: cc.value,
    subject: subject.value,
    body: body.value,
  })
}
</script>

<template>
  <div class="sheet-wrap" @click.self="emit('discard')">
    <div class="sheet">
      <div class="s-head">
        <button class="s-discard" @click="emit('discard')">Discard</button>
        <span class="s-title">New Message</span>
        <button class="s-send" @click="send">Send</button>
      </div>
      <label class="s-field">
        <span>To:</span>
        <input v-model="to" type="text" placeholder="Recipient" spellcheck="false" />
      </label>
      <label class="s-field">
        <span>Cc:</span>
        <input v-model="cc" type="text" spellcheck="false" />
      </label>
      <label class="s-field">
        <span>Subject:</span>
        <input v-model="subject" type="text" spellcheck="false" />
      </label>
      <textarea v-model="body" class="s-body" placeholder="Write your message…" />
    </div>
  </div>
</template>

<style scoped>
.sheet-wrap {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.sheet {
  width: min(540px, 92%);
  height: min(430px, 90%);
  background: var(--window-bg);
  border: 0.5px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.s-head {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: var(--titlebar-bg);
  border-bottom: 0.5px solid var(--border);
}
.s-title { flex: 1; text-align: center; font-weight: 600; }
.s-send,
.s-discard {
  border: none;
  border-radius: 7px;
  font-size: 13px;
  font-family: inherit;
  padding: 4px 12px;
  cursor: pointer;
}
.s-send { background: var(--accent); color: #fff; font-weight: 600; }
.s-send:hover { filter: brightness(1.1); }
.s-discard { background: transparent; color: var(--text); }
.s-discard:hover { background: var(--hover); }
.s-field {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border-bottom: 0.5px solid var(--border);
}
.s-field span { color: var(--text-dim); flex-shrink: 0; }
.s-field input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
}
.s-field input::placeholder { color: var(--text-dim); }
.s-body {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 12px 14px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
}
.s-body::placeholder { color: var(--text-dim); }
</style>
