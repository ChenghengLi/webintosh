<script setup>
defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button
    class="switch"
    :class="{ on: modelValue }"
    role="switch"
    :aria-checked="modelValue"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="knob"></span>
  </button>
</template>

<style scoped>
.switch {
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: rgba(120, 120, 128, 0.32);
  padding: 2px;
  flex: none;
  transition: background 0.2s ease;
}
.switch.on {
  background: #34c759;
}
.knob {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.3),
    0 0 0 0.5px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
}
.switch.on .knob {
  transform: translateX(16px);
}
</style>
