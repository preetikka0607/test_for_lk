<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import RiverScene from './RiverScene.vue'

defineEmits(['close'])

const root = ref(null)
const heading = ref(null)
const ready = ref(false)
const loadError = ref(false)
const progress = ref(0)
const introKey = ref(0)
const chapter = computed(() => Math.min(4, Math.floor(progress.value * 3.99) + 1))

let frame = 0
let observer
let motionPreference

function updateScroll() {
  frame = 0
  if (!root.value) return
  const distance = root.value.offsetHeight - window.innerHeight
  const value = Math.max(0, Math.min(1, -root.value.getBoundingClientRect().top / Math.max(1, distance)))
  progress.value = value
  root.value.style.setProperty('--progress', value.toFixed(4))
  root.value.style.setProperty('--shade', String(0.06 + value * 0.26))
}

function requestUpdate() {
  if (!frame) frame = requestAnimationFrame(updateScroll)
}

function scrollToSection(id) {
  root.value?.querySelector(`#${id}`)?.scrollIntoView({
    behavior: motionPreference?.matches ? 'instant' : 'smooth',
  })
}

function replay() {
  introKey.value += 1
  window.scrollTo({ top: 0, behavior: motionPreference?.matches ? 'instant' : 'smooth' })
}

function imageFailed() {
  loadError.value = true
  ready.value = true
}

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  window.addEventListener('scroll', requestUpdate, { passive: true })
  window.addEventListener('resize', requestUpdate)
  motionPreference.addEventListener('change', requestUpdate)
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add('is-visible')
    }
  }, { threshold: 0.2 })
  root.value.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element))
  updateScroll()
  heading.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', requestUpdate)
  window.removeEventListener('resize', requestUpdate)
  motionPreference?.removeEventListener('change', requestUpdate)
  observer?.disconnect()
  cancelAnimationFrame(frame)
})
</script>

<template>
  <main ref="root" class="surprise" :class="{ 'is-ready': ready }" aria-label="Stillwater, a nature surprise">
    <RiverScene :progress="progress" @ready="ready = true" @error="imageFailed" />
    <div class="reading-shade" aria-hidden="true"></div>
    <div class="cinema-bar cinema-top" aria-hidden="true"></div>
    <div class="cinema-bar cinema-bottom" aria-hidden="true"></div>

    <div class="opening-veil" aria-hidden="true"></div>
    <p v-if="!ready" class="loading" role="status">A little wonder is on its way…</p>

    <header class="navigation">
      <button class="back-button" type="button" @click="$emit('close')"><span aria-hidden="true">←</span> Back</button>
      <a class="wordmark" href="#river-opening" @click.prevent="scrollToSection('river-opening')">Stillwater<span>A little escape</span></a>
      <span class="nav-note">From Preeti &amp; Logesh <span aria-hidden="true">↗</span></span>
    </header>

    <div class="journey-line" aria-hidden="true"><span></span></div>
    <aside class="chapter-indicator" aria-label="Journey progress">0{{ chapter }} <span>/ 04</span></aside>

    <section id="river-opening" class="chapter hero" aria-labelledby="surprise-title">
      <div :key="introKey" class="hero-copy">
        <p class="eyebrow entrance entrance-one">Somewhere, the world slows down.</p>
        <h1 id="surprise-title" ref="heading" tabindex="-1" class="entrance entrance-two">Follow<br class="mobile-break" /> <em>the river.</em></h1>
        <p class="hero-subtitle entrance entrance-three">Leave the everyday behind.<br />There’s a little wonder waiting for you.</p>
        <button class="explore-button entrance entrance-four" type="button" @click="scrollToSection('river-breathe')">Let’s wander <span aria-hidden="true">↘</span></button>
      </div>
      <button class="scroll-cue" type="button" @click="scrollToSection('river-breathe')"><span>Scroll to wander</span><span class="scroll-track" aria-hidden="true"></span></button>
      <p v-if="loadError" class="asset-error" role="status">The landscape couldn’t load. Please refresh to try again.</p>
      <span class="edge-note" aria-hidden="true">Morning light · The riverbank</span>
    </section>

    <section id="river-breathe" class="chapter story story-left" aria-labelledby="breathe-title">
      <div class="story-copy" data-reveal>
        <p class="eyebrow"><span class="tiny-line"></span> 01 / Find your quiet</p>
        <h2 id="breathe-title">A deep breath.<br />A <em>different pace.</em></h2>
        <p>Bluebells turn toward the morning.<br class="desktop-break" /> Dew holds the light for a moment longer.</p>
        <p class="whisper">Small things. Worth slowing down for.</p>
        <span class="botanical-note">Campanula · At the water’s edge</span>
      </div>
    </section>

    <section id="river-flight" class="chapter story story-right" aria-labelledby="flight-title">
      <div class="story-copy" data-reveal>
        <p class="eyebrow"><span class="tiny-line"></span> 02 / A lighter feeling</p>
        <h2 id="flight-title">Let your thoughts<br /><em>take flight.</em></h2>
        <p>Above the water. Beyond the noise.<br />Some things are better when you let them drift.</p>
        <div class="flight-line" aria-hidden="true"><svg viewBox="0 0 260 65"><path d="M0 50C55 50 53 5 104 16S170 70 260 6" /></svg><span>↗</span></div>
      </div>
    </section>

    <section id="river-ending" class="chapter ending" aria-labelledby="ending-title">
      <div class="ending-copy" data-reveal>
        <p class="eyebrow">A small surprise. Just for you.</p>
        <h2 id="ending-title">Take a little<br /><em>peace with you.</em></h2>
        <p>The world will wait for one more breath.</p>
        <div class="signature"><span>With a little wonder,</span><strong>Preeti &amp; Logesh</strong></div>
        <button class="replay-button" type="button" @click="replay"><span aria-hidden="true">↺</span> Wander again</button>
      </div>
      <footer><span>Stillwater / A little escape</span><button type="button" @click="$emit('close')">Back to the beginning <span aria-hidden="true">↗</span></button></footer>
    </section>
  </main>
</template>

<style scoped>
.surprise { --progress: 0; --shade: .06; position: relative; isolation: isolate; color: #fbf6e7; background: #102c28; font-family: Arial, sans-serif; overflow: clip; }
.surprise button, .surprise a { color: inherit; }
.surprise button { font: inherit; cursor: pointer; }
.reading-shade { position: fixed; inset: 0; pointer-events: none; background: rgba(4, 19, 18, var(--shade)); z-index: 0; }
.chapter { z-index: 1; }
.cinema-bar { position: fixed; left: 0; right: 0; height: 10vh; background: #0b1714; z-index: 9; pointer-events: none; transition: transform 3s cubic-bezier(.2,.7,.2,1); }
.cinema-top { top: 0; }
.cinema-bottom { bottom: 0; }
.is-ready .cinema-top { transform: translateY(-100%); }
.is-ready .cinema-bottom { transform: translateY(100%); }
.opening-veil { position: fixed; inset: 0; background: #0b211b; z-index: 8; pointer-events: none; transition: opacity 2s ease, visibility 2s; }
.is-ready .opening-veil { opacity: 0; visibility: hidden; }
.loading { position: fixed; inset: 48% 0 auto; z-index: 9; margin: 0; text-align: center; font: italic 22px Georgia, serif; color: #e3dfc8; }
.navigation { position: absolute; top: 0; left: 0; right: 0; z-index: 10; padding: 32px 4.5%; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.back-button { border: 1px solid #fff5d64d; border-radius: 50px; background: #0a241c20; padding: 11px 18px; font-size: 12px !important; backdrop-filter: blur(8px); transition: background .2s; }
.back-button:hover { background: #fff5d626; }
.back-button span { padding-right: 9px; }
.wordmark { text-decoration: none; font: 21px Georgia, serif; text-transform: uppercase; letter-spacing: .3em; text-align: center; }
.wordmark span { display: block; font: 9px Arial, sans-serif; letter-spacing: .24em; margin-top: 8px; opacity: .8; }
.nav-note { font-size: 10px; letter-spacing: .07em; }
.nav-note span { margin-left: 10px; }
.chapter { position: relative; min-height: 100svh; padding: 120px 9%; display: flex; align-items: center; }
.hero { min-height: 100svh; justify-content: center; text-align: center; padding-bottom: 150px; }
.hero-copy { max-width: 1100px; margin-top: -7vh; }
.eyebrow { text-transform: uppercase; font-size: 10px; font-weight: 400; letter-spacing: .25em; line-height: 1.9; }
h1, h2 { font-family: Georgia, 'Times New Roman', serif; font-weight: 400; letter-spacing: -.055em; }
h1 { font-size: clamp(68px, 8vw, 124px); line-height: 1.05; margin: 23px 0; text-shadow: 0 5px 45px #0c251e35; }
h1:focus { outline: none; }
h1 em, h2 em { font-weight: 400; color: #f3e4bd; }
.hero-subtitle { font-family: Georgia, serif; font-size: clamp(17px, 1.6vw, 22px); line-height: 1.65; color: #f5efde; }
.explore-button { display: inline-flex; gap: 40px; align-items: center; padding: 15px 23px; margin-top: 22px; border: 1px solid #fff8df80; border-radius: 50px; background: #102a2040; backdrop-filter: blur(8px); font-size: 12px !important; transition: background .2s, border-color .2s; }
.explore-button:hover { background: #f7edda; color: #14372a; border-color: #f7edda; }
.explore-button span { font-size: 20px; }
.scroll-cue { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); display: grid; justify-items: center; gap: 17px; border: 0; padding: 12px; background: transparent; font-size: 9px !important; letter-spacing: .26em; text-transform: uppercase; white-space: nowrap; }
.scroll-track { position: relative; width: 1px; height: 44px; background: #f9efd73b; overflow: hidden; }
.scroll-track::after { content: ''; position: absolute; width: 1px; height: 24px; top: -24px; background: #f9efd7; animation: scroll-drop 2.5s ease infinite; }
.edge-note { position: absolute; bottom: 90px; left: 4.5%; font-size: 9px; letter-spacing: .15em; opacity: .65; text-transform: uppercase; }
.asset-error { position: absolute; bottom: 140px; font-size: 12px; padding: 12px; background: #102c28; }
.mobile-break { display: none; }
.entrance { opacity: 0; transform: translateY(25px); }
.is-ready .entrance { animation: arrive 1.5s cubic-bezier(.2,.7,.2,1) both; }
.is-ready .entrance-one { animation-delay: 1s; }
.is-ready .entrance-two { animation-delay: 1.35s; }
.is-ready .entrance-three { animation-delay: 1.7s; }
.is-ready .entrance-four { animation-delay: 2s; }
.journey-line { position: fixed; top: 0; left: 0; height: 2px; width: 100%; z-index: 12; background: #fff3; }
.journey-line span { display: block; width: 100%; height: 100%; transform: scaleX(var(--progress)); transform-origin: left; background: #ead8a4; }
.chapter-indicator { position: fixed; right: 4.5%; bottom: 50px; z-index: 5; font-size: 11px; letter-spacing: .1em; }
.chapter-indicator span { color: #f8f2df80; margin-left: 8px; }
.story { min-height: 110svh; }
.story-copy { max-width: 650px; }
.story h2, .ending h2 { font-size: clamp(48px, 6.3vw, 94px); line-height: 1.13; margin: 28px 0; }
.story-copy > p:not(.eyebrow) { font-size: 15px; line-height: 1.9; color: #f1efdfd9; }
.tiny-line { display: inline-block; width: 30px; height: 1px; vertical-align: middle; margin-right: 13px; background: #e7d5a6; }
.story-copy .whisper { font: italic 20px Georgia, serif !important; color: #e6d6ac !important; margin-top: 30px; }
.botanical-note { display: block; margin-top: 34px; color: #d7dec8; font-size: 9px; letter-spacing: .16em; text-transform: uppercase; border-left: 1px solid #d7dec866; padding: 7px 0 7px 14px; }
.story-right { justify-content: flex-end; }
.flight-line { width: 230px; display: flex; align-items: flex-start; gap: 10px; margin-top: 40px; color: #e7d6ad; }
.flight-line svg { width: 200px; overflow: visible; }
.flight-line path { stroke: currentColor; stroke-width: 1; stroke-dasharray: 3 7; fill: none; }
.flight-line span { font-size: 22px; }
[data-reveal] { opacity: 0; transform: translateY(65px); transition: opacity 1.5s ease, transform 1.5s cubic-bezier(.16,1,.3,1); }
[data-reveal].is-visible { opacity: 1; transform: translateY(0); }
.ending { justify-content: center; text-align: center; min-height: 105svh; padding-bottom: 150px; }
.ending-copy > p:not(.eyebrow) { font: 18px/1.8 Georgia, serif; color: #e6e5d7; }
.signature { display: grid; gap: 11px; margin: 40px 0 30px; }
.signature span { font-size: 10px; letter-spacing: .13em; opacity: .7; }
.signature strong { font: italic 29px Georgia, serif; color: #ecdcb5; }
.replay-button { background: transparent; border: 0; border-bottom: 1px solid #e8dbb76b; padding: 12px 0; font-size: 12px !important; }
.replay-button span { margin-right: 10px; font-size: 19px; }
footer { position: absolute; bottom: 95px; left: 4.5%; right: 4.5%; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-top: 1px solid #f5eed12e; padding-top: 22px; font-size: 9px; letter-spacing: .08em; }
footer button { border: 0; background: transparent; padding: 8px 0; font-size: 10px !important; }
footer button span { padding-left: 8px; }
@keyframes arrive { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scroll-drop { to { transform: translateY(70px); } }
@media (max-width: 700px) {
  .navigation { padding: 23px 6%; }
  .wordmark { font-size: 15px; letter-spacing: .22em; }
  .wordmark span { font-size: 8px; }
  .nav-note { display: none; }
  .back-button { padding: 9px 13px; }
  .chapter { padding: 110px 8% 130px; }
  .hero-copy { margin-top: 0; }
  h1 { font-size: clamp(66px, 16vw, 100px); margin: 22px 0; }
  .mobile-break { display: initial; }
  .eyebrow { font-size: 8px; letter-spacing: .18em; }
  .hero-subtitle { font-size: 17px; }
  .edge-note { display: none; }
  .scroll-cue { bottom: 28px; }
  .chapter-indicator { right: 6%; bottom: 36px; font-size: 9px; }
  .story h2, .ending h2 { font-size: clamp(43px, 11.5vw, 70px); }
  .story-copy > p:not(.eyebrow) { font-size: 14px; }
  .story-right { justify-content: flex-start; }
  footer { align-items: flex-start; left: 8%; right: 8%; }
  footer > span { max-width: 100px; line-height: 1.8; }
  footer button { max-width: 130px; text-align: right; line-height: 1.8; }
  .ending { padding-bottom: 220px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .entrance, [data-reveal] { opacity: 1; transform: none; }
}
</style>
