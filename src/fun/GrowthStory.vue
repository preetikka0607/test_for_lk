<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createGrowthRenderer } from './growth-renderer.js'
import dryLandscape from './assets/love-dry.jpg'
import rainLandscape from './assets/love-rain.jpg'
import forestLandscape from './assets/love-forest.jpg'
import seatedCouple from './assets/seated-couple.png'
import bluebells from './assets/bluebells.png'

defineEmits(['close'])

const root = ref(null)
const canvas = ref(null)
const firstHeading = ref(null)
const ready = ref(false)
const assetError = ref(false)
const gpuReady = ref(false)
const progress = ref(0)
const playing = ref(false)
const pausedNature = ref(false)
const reducedMotion = ref(false)
const landscapes = [dryLandscape, rainLandscape, forestLandscape]
const images = [...landscapes, seatedCouple]
const imageElements = []
const loadedImages = new Set()
const titles = ['Winter', 'Rain', 'Roots', 'Spring', 'Afterglow']
const activeChapter = computed(() => Math.min(4, Math.floor(progress.value * 4 + .5)))

const seedlings = [
  { left: '4%', height: '105px', delay: .44 },
  { left: '8%', height: '145px', delay: .53 },
  { left: '89%', height: '125px', delay: .48 },
  { left: '94%', height: '175px', delay: .58 },
]
const petals = Array.from({ length: 10 }, (_, index) => ({
  left: `${(index * 29 + 7) % 100}%`, delay: `${-index * 3.4}s`, duration: `${18 + (index % 4) * 4}s`,
}))

let renderer
let animationFrame = 0
let lastFrame = 0
let elapsed = 0
let smoothProgress = 0
let targetProgress = 0
let alive = true
let initializing = false
let preference
let observer

function clamp(value) { return Math.min(1, Math.max(0, value)) }
function smoothstep(start, end, value) {
  const x = clamp((value - start) / (end - start))
  return x * x * (3 - 2 * x)
}

function scrollRange() { return Math.max(1, root.value.offsetHeight - window.innerHeight) }

function readScroll() {
  if (!root.value) return
  targetProgress = clamp(-root.value.getBoundingClientRect().top / scrollRange())
  progress.value = targetProgress
  schedule()
}

function pausePlayback(event) {
  if (event?.type === 'touchstart' && event.target.closest('button')) return
  if (playing.value) playing.value = false
}

function stopForKey(event) {
  if (event.target.closest('button')) return
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) pausePlayback()
}

function applyScene(value) {
  const style = root.value.style
  // The fallback uses the same image coordinates and slow camera move as WebGL.
  const imageAspect = imageElements[0]?.naturalWidth / imageElements[0]?.naturalHeight || 1.6
  const aspect = window.innerWidth / window.innerHeight
  const coverX = Math.min(1, aspect / imageAspect)
  const zoom = 1.018 + value * .045
  const planeWidth = Math.max(window.innerWidth, window.innerHeight * imageAspect) * zoom
  const planeHeight = planeWidth / imageAspect
  const centerX = .5 + .28 * (1 - coverX)
  style.setProperty('--plane-width', `${planeWidth}px`)
  style.setProperty('--plane-height', `${planeHeight}px`)
  style.setProperty('--plane-left', `${window.innerWidth * .5 - centerX * planeWidth}px`)
  style.setProperty('--plane-top', `${(window.innerHeight - planeHeight) * .5}px`)
  const wet = smoothstep(.10, .44, value)
  const green = smoothstep(.40, .89, value)
  style.setProperty('--wet', wet.toFixed(4))
  style.setProperty('--green', green.toFixed(4))
  style.setProperty('--flowers', smoothstep(.67, .91, value).toFixed(4))
  style.setProperty('--season-progress', value.toFixed(4))
  for (let index = 0; index < seedlings.length; index += 1) {
    style.setProperty(`--sprout-${index}`, smoothstep(seedlings[index].delay, seedlings[index].delay + .2, value).toFixed(4))
  }
  renderer?.draw(elapsed, value)
}

function frame(now) {
  animationFrame = 0
  if (!alive || document.hidden) return
  if (now - lastFrame < 32 && !reducedMotion.value) {
    animationFrame = requestAnimationFrame(frame)
    return
  }
  const delta = Math.min((now - (lastFrame || now)) / 1000, .06)
  lastFrame = now
  if (playing.value && ready.value) {
    // Ninety-five seconds for a complete story; manual scrolling always takes over.
    targetProgress = clamp(targetProgress + delta / 95)
    window.scrollTo({ top: root.value.offsetTop + targetProgress * scrollRange(), behavior: 'instant' })
    progress.value = targetProgress
    if (targetProgress >= 1) playing.value = false
  }
  if (!pausedNature.value && !reducedMotion.value) elapsed += delta
  const damping = reducedMotion.value ? 1 : 1 - Math.exp(-delta * 5)
  smoothProgress += (targetProgress - smoothProgress) * damping
  applyScene(smoothProgress)
  const cameraMoving = Math.abs(targetProgress - smoothProgress) > .0001
  if (ready.value && (playing.value || cameraMoving || (renderer && !reducedMotion.value && !pausedNature.value))) {
    animationFrame = requestAnimationFrame(frame)
  }
}

function schedule() {
  if (!animationFrame && alive && !document.hidden) animationFrame = requestAnimationFrame(frame)
}

function goToChapter(index) {
  playing.value = false
  root.value.querySelector(`#growth-chapter-${index}`)?.scrollIntoView({ behavior: reducedMotion.value ? 'instant' : 'smooth' })
}

function togglePlayback() {
  if (reducedMotion.value) {
    goToChapter(Math.min(4, activeChapter.value + 1))
    return
  }
  if (progress.value > .95) {
    window.scrollTo({ top: 0, behavior: 'instant' })
    targetProgress = 0
    progress.value = 0
  }
  playing.value = !playing.value
  schedule()
}

function replay() {
  playing.value = false
  goToChapter(0)
}

function toggleNature() {
  pausedNature.value = !pausedNature.value
  schedule()
}

async function imageLoaded(index) {
  loadedImages.add(index)
  if (loadedImages.size !== images.length || initializing) return
  initializing = true
  await Promise.all(imageElements.map((image) => image.decode().catch(() => {})))
  if (!alive) return
  renderer = createGrowthRenderer(canvas.value, imageElements)
  gpuReady.value = Boolean(renderer)
  ready.value = true
  readScroll()
  schedule()
}

function imageFailed() { assetError.value = true; ready.value = true; schedule() }

function handleMotion() {
  reducedMotion.value = preference.matches
  if (reducedMotion.value) playing.value = false
  lastFrame = 0
  schedule()
}

function handleVisibility() {
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
  lastFrame = 0
  schedule()
}

function contextLost(event) {
  event.preventDefault()
  renderer?.dispose()
  renderer = null
  gpuReady.value = false
}

function contextRestored() {
  if (!alive || loadedImages.size !== images.length) return
  renderer = createGrowthRenderer(canvas.value, imageElements)
  gpuReady.value = Boolean(renderer)
  schedule()
}

onMounted(() => {
  preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  handleMotion()
  preference.addEventListener('change', handleMotion)
  window.addEventListener('scroll', readScroll, { passive: true })
  window.addEventListener('resize', readScroll)
  window.addEventListener('wheel', pausePlayback, { passive: true })
  window.addEventListener('touchstart', pausePlayback, { passive: true })
  window.addEventListener('keydown', stopForKey)
  document.addEventListener('visibilitychange', handleVisibility)
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('revealed', entry.isIntersecting)
  }, { threshold: .25 })
  root.value.querySelectorAll('[data-story-copy]').forEach((element) => observer.observe(element))
  imageElements.forEach((image, index) => {
    if (image.complete) {
      if (image.naturalWidth) imageLoaded(index)
      else imageFailed()
    }
  })
  readScroll()
  firstHeading.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  alive = false
  cancelAnimationFrame(animationFrame)
  renderer?.dispose()
  observer?.disconnect()
  preference?.removeEventListener('change', handleMotion)
  window.removeEventListener('scroll', readScroll)
  window.removeEventListener('resize', readScroll)
  window.removeEventListener('wheel', pausePlayback)
  window.removeEventListener('touchstart', pausePlayback)
  window.removeEventListener('keydown', stopForKey)
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <main ref="root" class="growth-story" :class="{ 'story-ready': ready, 'nature-paused': pausedNature, 'reduced-motion': reducedMotion }" aria-label="Through the seasons: a landscape returning to life">
    <div class="world" aria-hidden="true">
      <div class="seasonal-plates">
        <img v-for="(source, index) in landscapes" :key="source" :ref="(element) => { if (element) imageElements[index] = element }" :src="source" :class="`plate plate-${index}`" alt="" @load="imageLoaded(index)" @error="imageFailed" />
        <img :ref="(element) => { if (element) imageElements[3] = element }" :src="seatedCouple" class="seated-couple" alt="" @load="imageLoaded(3)" @error="imageFailed" />
      </div>
      <canvas ref="canvas" class="world-canvas" :class="{ visible: gpuReady }" @webglcontextlost="contextLost" @webglcontextrestored="contextRestored"></canvas>
      <div class="cinematic-grade"></div>
      <div class="returning-sun"></div>
      <div class="blooming-bank"><img :src="bluebells" alt="" /></div>

      <svg v-for="(sprout, index) in seedlings" :key="index" class="seedling" viewBox="0 0 60 180" :style="{ left: sprout.left, height: sprout.height, '--growth': `var(--sprout-${index}, 0)` }">
        <defs><linearGradient :id="`stem-color-${index}`" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#253a22" /><stop offset="1" stop-color="#9aa764" /></linearGradient></defs>
        <g class="seedling-growth">
          <path d="M29 180Q21 122 33 74Q38 45 29 8" fill="none" :stroke="`url(#stem-color-${index})`" stroke-width="2" />
          <path class="unfold leaf-left" d="M29 125Q-2 122 6 92Q31 94 29 125Z" fill="#405e35" />
          <path class="unfold leaf-right" d="M31 91Q60 81 53 60Q28 64 31 91Z" fill="#6d8747" />
          <path class="unfold leaf-top" d="M31 52Q11 42 18 23Q36 30 31 52Z" fill="#819653" />
        </g>
      </svg>

      <i v-for="(petal, index) in petals" :key="`petal-${index}`" class="falling-petal" :style="{ left: petal.left, animationDelay: petal.delay, animationDuration: petal.duration }"></i>
    </div>

    <div class="opening-dark" aria-hidden="true"></div>
    <p v-if="!ready" class="preparing" role="status">A breath…</p>

    <header class="story-navigation">
      <button type="button" class="home-button" @click="$emit('close')"><span aria-hidden="true">←</span> Home</button>
      <div class="story-wordmark">Through the seasons</div>
    </header>

    <div class="story-controls">
      <div class="control-buttons">
        <button v-if="!reducedMotion" type="button" class="nature-control" :aria-pressed="pausedNature" @click="toggleNature">{{ pausedNature ? 'Resume nature' : 'Still the scene' }}</button>
        <button type="button" class="play-story" :disabled="!ready" :aria-pressed="playing" @click="togglePlayback"><span aria-hidden="true">{{ playing ? 'Ⅱ' : '▷' }}</span>{{ reducedMotion ? 'Next chapter' : playing ? 'Pause story' : 'Play the story' }}</button>
      </div>
    </div>

    <section id="growth-chapter-0" class="story-section opening-section" aria-labelledby="growth-title">
      <div class="story-copy opening-copy" data-story-copy>
        <h1 id="growth-title" ref="firstHeading" tabindex="-1">Not every season<br /><em>was gentle.</em></h1>
      </div>
      <button type="button" class="begin-story" @click="goToChapter(1)"><span>Scroll</span><span class="begin-arrow" aria-hidden="true">↓</span></button>
      <p v-if="assetError" class="asset-error" role="status">A landscape couldn’t load. Refresh to see the full transformation.</p>
    </section>

    <section id="growth-chapter-1" class="story-section" aria-labelledby="rain-title">
      <div class="story-copy" data-story-copy>
        <h2 id="rain-title">Rain softened<br /><em>the earth.</em></h2>
      </div>
    </section>

    <section id="growth-chapter-2" class="story-section" aria-labelledby="roots-title">
      <div class="story-copy" data-story-copy>
        <h2 id="roots-title">Beneath the silence,<br /><em>roots held.</em></h2>
      </div>
    </section>

    <section id="growth-chapter-3" class="story-section" aria-labelledby="bloom-title">
      <div class="story-copy" data-story-copy>
        <h2 id="bloom-title">Spring found<br /><em>what winter couldn’t take.</em></h2>
      </div>
    </section>

    <section id="growth-chapter-4" class="story-section final-section" aria-labelledby="forest-title">
      <div class="story-copy final-copy" data-story-copy>
        <h2 id="forest-title" class="end-credit">by Preeti &amp; Logesh</h2>
        <button class="replay-story" type="button" aria-label="Replay the story" title="Replay the story" @click="replay">↺</button>
      </div>
    </section>

    <nav class="chapter-dock" aria-label="Story chapters">
      <div class="timeline-track" aria-hidden="true"><span></span></div>
      <button v-for="(title, index) in titles" :key="title" type="button" :class="{ current: activeChapter === index, visited: activeChapter > index }" :aria-current="activeChapter === index ? 'step' : undefined" @click="goToChapter(index)"><span class="chapter-dot" aria-hidden="true"></span><span>{{ title }}</span></button>
    </nav>
  </main>
</template>

<style scoped>
.growth-story { --wet: 0; --green: 0; --flowers: 0; --season-progress: 0; position: relative; isolation: isolate; overflow: clip; background: #302a22; color: #fbf4e4; font-family: Arial, sans-serif; }
.growth-story button { font: inherit; color: inherit; cursor: pointer; }
.world { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.world-canvas, .cinematic-grade, .returning-sun { position: absolute; inset: 0; width: 100%; height: 100%; }
.seasonal-plates { position: absolute; left: var(--plane-left, 0px); top: var(--plane-top, 0px); width: var(--plane-width, 100vw); height: var(--plane-height, 100svh); }
.plate { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
.plate-1 { opacity: var(--wet); }
.plate-2 { opacity: var(--green); }
.seated-couple { position: absolute; left: 58.8%; top: 54.5%; width: 19%; height: auto; filter: brightness(calc(.94 - var(--wet) * .08 + var(--green) * .12)) saturate(.85); }
.world-canvas { opacity: 0; transition: opacity 1s; }
.world-canvas.visible { opacity: 1; }
.cinematic-grade { background: linear-gradient(90deg, #171d1bb3, #141d183d 55%, #141d1805), linear-gradient(0deg, #091e1bc2, transparent 26%, transparent 80%, #171d1b5e); }
.returning-sun { opacity: calc(var(--green) * .13); background: radial-gradient(ellipse at 12% 15%, #ffdc8a, transparent 65%); mix-blend-mode: screen; }
.blooming-bank { position: absolute; left: -5%; bottom: -5%; width: min(34vw, 500px); opacity: var(--flowers); transform: translateY(calc((1 - var(--flowers)) * 50px)); }
.blooming-bank img { width: 100%; display: block; filter: brightness(.63) saturate(.7); transform-origin: bottom left; animation: blossom-wind 12s ease-in-out infinite alternate; mask-image: linear-gradient(#000 70%, transparent); }
.seedling { position: absolute; bottom: -4px; width: 60px; opacity: var(--growth); overflow: visible; filter: drop-shadow(0 2px 3px #12261866); }
.seedling-growth { transform-origin: 30px 180px; transform: scaleY(var(--growth)); }
.unfold { transform-origin: 30px 110px; transform: scaleX(var(--growth)); }
.falling-petal { position: absolute; top: -20px; width: 5px; height: 8px; border-radius: 70% 10% 70% 15%; background: #dddcd6; opacity: 0; animation: petal-fall 25s linear infinite; }
.opening-dark { position: fixed; z-index: 8; inset: 0; background: #24231f; pointer-events: none; transition: opacity 2s, visibility 2s; }
.story-ready .opening-dark { opacity: 0; visibility: hidden; }
.preparing { position: fixed; z-index: 9; top: 47%; left: 8%; right: 8%; text-align: center; font: italic 22px/1.5 Georgia, serif; }
.story-navigation { position: absolute; z-index: 10; top: 0; left: 0; right: 0; padding: 30px 4.5%; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.home-button { display: flex; gap: 12px; background: #111e1930; border: 1px solid #f5e8cf66; border-radius: 30px; padding: 11px 18px; font-size: 11px !important; backdrop-filter: blur(8px); }
.story-wordmark { font: 18px Georgia, serif; letter-spacing: .16em; text-transform: uppercase; text-align: center; }
.story-controls { position: fixed; z-index: 7; top: 120px; left: 4.5%; right: 4.5%; display: flex; justify-content: flex-end; gap: 15px; align-items: center; }
.control-buttons { display: flex; align-items: center; gap: 18px; }
.play-story { border: 1px solid #f1e5c566; border-radius: 30px; background: #142b2440; padding: 11px 16px; font-size: 11px !important; display: flex; gap: 10px; align-items: center; backdrop-filter: blur(10px); }
.play-story:disabled { opacity: .5; cursor: wait; }
.nature-control { padding: 8px 0; background: transparent; border: 0; font-size: 9px !important; opacity: .72; }
.story-section { position: relative; z-index: 1; min-height: 110svh; display: flex; align-items: center; padding: 180px 9% 170px; }
.opening-section { min-height: 100svh; }
.story-copy { width: min(720px, 62%); opacity: 0; transform: translateY(40px); transition: opacity 1.4s ease, transform 1.8s cubic-bezier(.16,1,.3,1); }
.story-ready .story-copy.revealed { opacity: 1; transform: translateY(0); }
h1, h2 { font: 400 clamp(50px, 6.1vw, 96px)/1.08 Georgia, 'Times New Roman', serif; letter-spacing: -.045em; margin: 0 0 30px; text-wrap: balance; text-shadow: 0 4px 25px #0c17131a; }
h1:focus { outline: none; }
h1 em, h2 em { color: #eed8ae; font-weight: 400; }
.begin-story { position: absolute; bottom: 135px; left: 9%; display: flex; align-items: center; gap: 20px; border: 0; background: transparent; padding: 10px 0; text-transform: uppercase; font-size: 8px !important; letter-spacing: .17em; }
.begin-arrow { font-size: 23px; animation: hint 3s ease-in-out infinite; }
.asset-error { position: absolute; bottom: 175px; left: 9%; font-size: 12px; padding: 10px; background: #263029; }
.final-section { min-height: 100svh; align-items: flex-end; justify-content: center; padding-bottom: 135px; }
.final-copy { width: 100%; text-align: center; }
h2.end-credit { font: italic 28px/1.5 Georgia, serif; letter-spacing: 0; margin: 0; color: #f0dbb3; }
.replay-story { display: inline-grid; place-items: center; margin-top: 15px; width: 44px; height: 44px; padding: 0; border: 1px solid #e5d8bb66; border-radius: 50%; background: #11251c30; font-size: 20px !important; }
.chapter-dock { position: fixed; bottom: 0; left: 0; right: 0; z-index: 7; display: flex; padding: 35px 9% 28px; background: linear-gradient(transparent, #0a191acc); }
.chapter-dock button { position: relative; width: 20%; display: grid; justify-items: center; gap: 13px; background: transparent; border: 0; padding: 8px 0; font-size: 9px; letter-spacing: .1em; color: #f4ead575; transition: color .3s; }
.chapter-dock button.current { color: #fff2d7; }
.chapter-dock button.visited { color: #e8d9b7c9; }
.chapter-dot { position: relative; z-index: 1; display: block; width: 6px; height: 6px; border-radius: 50%; background: #7c8174; border: 1px solid #d8d6bf66; }
.current .chapter-dot { background: #ead9ad; box-shadow: 0 0 0 5px #e8d9ad1c; }
.visited .chapter-dot { background: #c6c8a8; }
.timeline-track { position: absolute; top: 45px; left: 17.2%; right: 17.2%; height: 1px; background: #f4ead529; }
.timeline-track span { display: block; width: 100%; height: 1px; background: #e4d1a1b3; transform: scaleX(var(--season-progress)); transform-origin: left; }
.nature-paused .world *, .nature-paused .world *::before { animation-play-state: paused !important; }
@keyframes blossom-wind { from { transform: rotate(-1deg); } to { transform: rotate(1.4deg); } }
@keyframes petal-fall { 0% { transform: translate(0, -20px) rotate(0); opacity: 0; } 10% { opacity: calc(var(--flowers) * .55); } 70% { opacity: calc(var(--flowers) * .45); } 100% { transform: translate(110px, 110vh) rotate(290deg); opacity: 0; } }
@keyframes hint { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
@media (max-width: 700px) {
  .story-navigation { padding: 22px 6%; }
  .story-wordmark { font-size: 13px; letter-spacing: .1em; }
  .home-button { padding: 9px 13px; font-size: 10px !important; }
  .story-controls { top: 104px; left: 6%; right: 6%; }
  .nature-control { display: none; }
  .play-story { font-size: 10px !important; padding: 9px 12px; }
  .story-section { align-items: flex-start; padding: 170px 8% 165px; }
  .story-copy, .final-copy { width: 100%; }
  h1, h2 { font-size: clamp(38px, 10vw, 62px); margin-bottom: 20px; }
  .begin-story { bottom: 120px; left: 8%; font-size: 7px !important; gap: 12px; }
  .cinematic-grade { background: linear-gradient(90deg, #171d1b88, #141d1815), linear-gradient(0deg, #091e1bcc, transparent 40%, #171d1b33); }
  .chapter-dock { padding: 32px 4% 24px; }
  .chapter-dock button { font-size: 8px; letter-spacing: 0; }
  .timeline-track { left: 13.2%; right: 13.2%; top: 42px; }
  .blooming-bank { width: 65vw; left: -23%; bottom: -2%; }
  .seedling { width: 40px; max-height: 120px; }
  .final-section { align-items: flex-end; padding-bottom: 110px; }
  .final-copy { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .replay-story { flex: 0 0 44px; margin-top: 0; }
  h2.end-credit { font-size: 24px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .story-copy { transform: none; }
  .falling-petal { display: none; }
}
</style>
