<script setup>
import { nextTick, ref } from 'vue'
import Surprise from './fun/surprise.vue'

const showingSurprise = ref(false)
const surpriseButton = ref(null)

function openSurprise() {
  window.scrollTo(0, 0)
  showingSurprise.value = true
}

async function closeSurprise() {
  showingSurprise.value = false
  await nextTick()
  window.scrollTo(0, 0)
  surpriseButton.value?.focus()
}
</script>

<template>
  <Surprise v-if="showingSurprise" @close="closeSurprise" />
  <main v-else class="home">
    <h1>Click the button for Surprise</h1>
    <p>Surprise from Preeti &amp; Logesh github repo.</p>
    <button ref="surpriseButton" type="button" @click="openSurprise">
      Open the surprise
    </button>
  </main>
</template>

<style>
html { margin: 0; }
body { margin: 0; }
*, *::before, *::after { box-sizing: border-box; }
button, a { -webkit-tap-highlight-color: transparent; }
button:focus-visible, a:focus-visible { outline: 3px solid #b89438; outline-offset: 6px; }
</style>

<style scoped>
.home { max-width: 650px; margin: 60px auto; padding: 24px; font-family: Arial, sans-serif; color: #222; }
.home h1 { font-size: 30px; }
.home p { line-height: 1.6; }
.home button { margin-top: 12px; padding: 12px 20px; cursor: pointer; font: inherit; }
@media (max-width: 600px) { .home { margin-top: 32px; } .home h1 { font-size: 26px; } }
</style>
