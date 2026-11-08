<script setup>
import { nextTick, ref } from 'vue'
import Surprise from './fun/surprise.vue'
import GrowthStory from './fun/GrowthStory.vue'

const activeStory = ref('home')
const surpriseButton = ref(null)
const loveStoryButton = ref(null)
let returnButton = 'river'

function openStory(story) {
  window.scrollTo(0, 0)
  returnButton = story
  activeStory.value = story
}

async function closeStory() {
  activeStory.value = 'home'
  await nextTick()
  window.scrollTo(0, 0)
  const button = returnButton === 'growth' ? loveStoryButton : surpriseButton
  button.value?.focus()
}
</script>

<template>
  <Surprise v-if="activeStory === 'river'" @close="closeStory" />
  <GrowthStory v-else-if="activeStory === 'growth'" @close="closeStory" />
  <main v-else class="home">
    <h1>Click the button for Surprise</h1>
    <p>Surprise from Preeti &amp; Logesh github repo.</p>
    <div class="home-buttons">
      <button ref="surpriseButton" type="button" @click="openStory('river')">
        Open the surprise
      </button>
      <button ref="loveStoryButton" type="button" @click="openStory('growth')">
        A little love story
      </button>
    </div>
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
.home-buttons { display: flex; flex-wrap: wrap; gap: 12px; }
.home button { margin-top: 12px; padding: 12px 20px; cursor: pointer; font: inherit; }
@media (max-width: 600px) { .home { margin-top: 32px; } .home h1 { font-size: 26px; } }
</style>
