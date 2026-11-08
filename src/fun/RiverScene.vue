<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import landscape from './assets/river-morning.jpg'
import flowers from './assets/bluebells.png'
import { createRiverRenderer } from './river-renderer.js'

const props = defineProps({ progress: { type: Number, default: 0 } })
const emit = defineEmits(['ready', 'error'])
const scene = ref(null)
const canvas = ref(null)
const image = ref(null)
const gpuReady = ref(false)
const reducedMotion = ref(false)
const paused = ref(false)

const flock = [
  { top: 16, width: 35, delay: -6, duration: 58, wing: 1.6, tone: .64 },
  { top: 18, width: 26, delay: -10, duration: 60, wing: 1.85, tone: .58 },
  { top: 13, width: 17, delay: -15, duration: 67, wing: 1.5, tone: .46 },
  { top: 25, width: 12, delay: -37, duration: 83, wing: 1.9, tone: .39 },
]
const pollen = Array.from({ length: 9 }, (_, index) => ({
  left: `${(index * 31 + 11) % 85}%`,
  top: `${35 + ((index * 17) % 55)}%`,
  delay: `${-index * 3.1}s`,
  duration: `${18 + (index % 4) * 5}s`,
}))

let renderer
let animationFrame = 0
let lastFrame = 0
let elapsed = 0
let alive = true
let initialized = false
let preference
let targetX = 0
let targetY = 0
let lookX = 0
let lookY = 0
let cameraProgress = 0

function paint(now) {
  animationFrame = 0
  if (!alive || !renderer || document.hidden) return
  if (now - lastFrame < 32 && !reducedMotion.value && !paused.value) {
    animationFrame = requestAnimationFrame(paint)
    return
  }
  const delta = Math.min((now - (lastFrame || now)) / 1000, .06)
  lastFrame = now
  const still = reducedMotion.value || paused.value
  if (!still) elapsed += delta
  // Exponential easing makes camera motion independent of frame rate.
  const damping = still ? 0 : 1 - Math.exp(-delta * 3.5)
  lookX += (targetX - lookX) * damping
  lookY += (targetY - lookY) * damping
  cameraProgress += (props.progress - cameraProgress) * damping
  if (reducedMotion.value) { lookX = 0; lookY = 0; cameraProgress = 0 }
  renderer.draw(elapsed, cameraProgress, lookX, lookY)
  scene.value?.style.setProperty('--foreground-pan', `${-cameraProgress * 55}px`)
  scene.value?.style.setProperty('--look-x', `${lookX * -7}px`)
  if (!still) animationFrame = requestAnimationFrame(paint)
}

function schedule() {
  if (!animationFrame && renderer && !document.hidden) animationFrame = requestAnimationFrame(paint)
}

function syncMotion() {
  reducedMotion.value = preference.matches
  lastFrame = 0
  schedule()
}

function handleVisibility() {
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
  lastFrame = 0
  schedule()
}

function pointerMove(event) {
  if (event.pointerType === 'touch') return
  targetX = event.clientX / window.innerWidth * 2 - 1
  targetY = event.clientY / window.innerHeight * 2 - 1
}

function pointerLeave() { targetX = 0; targetY = 0 }

function contextLost(event) {
  event.preventDefault()
  gpuReady.value = false
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
  renderer?.dispose()
  renderer = null
}

function contextRestored() {
  if (!alive || !image.value?.naturalWidth) return
  renderer = createRiverRenderer(canvas.value, image.value)
  gpuReady.value = Boolean(renderer)
  schedule()
}

async function imageLoaded() {
  if (initialized) return
  initialized = true
  try { await image.value.decode() } catch { /* The loaded image can still be drawn. */ }
  if (!alive) return
  renderer = createRiverRenderer(canvas.value, image.value)
  gpuReady.value = Boolean(renderer)
  schedule()
  emit('ready')
}

function imageFailed() { emit('error') }

function toggleMotion() {
  paused.value = !paused.value
  lastFrame = 0
  schedule()
}

watch(() => props.progress, schedule)

onMounted(() => {
  preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMotion()
  preference.addEventListener('change', syncMotion)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('resize', schedule)
  window.addEventListener('pointermove', pointerMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', pointerLeave)
  if (image.value.complete) {
    if (image.value.naturalWidth) imageLoaded()
    else imageFailed()
  }
})

onBeforeUnmount(() => {
  alive = false
  cancelAnimationFrame(animationFrame)
  renderer?.dispose()
  preference?.removeEventListener('change', syncMotion)
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('resize', schedule)
  window.removeEventListener('pointermove', pointerMove)
  document.documentElement.removeEventListener('pointerleave', pointerLeave)
})
</script>

<template>
  <div ref="scene" class="nature-scene" :class="{ 'motion-paused': paused || reducedMotion }">
    <div class="scene-picture" aria-hidden="true">
      <img ref="image" class="still-landscape" :src="landscape" alt="" fetchpriority="high" @load="imageLoaded" @error="imageFailed" />
      <canvas ref="canvas" class="river-canvas" :class="{ 'is-active': gpuReady }" @webglcontextlost="contextLost" @webglcontextrestored="contextRestored"></canvas>
      <div class="valley-haze haze-far"></div>
      <div class="valley-haze haze-near"></div>
      <div class="exposure"></div>
    </div>

    <div class="nature-details" aria-hidden="true">
      <div v-for="(bird, index) in flock" :key="index" class="flight" :style="{
        top: `${bird.top}%`, width: `${bird.width}px`, opacity: bird.tone,
        '--duration': `${bird.duration}s`, '--delay': `${bird.delay}s`, '--wing-time': `${bird.wing}s`,
      }">
        <div class="banking">
          <svg viewBox="0 0 120 70" fill="currentColor">
            <g class="left-wing">
              <path d="M60 39C48 32 45 19 31 15L8 8L17 17L11 15L23 25L19 23L33 31L29 31L44 36L40 37L60 42Z" />
            </g>
            <g class="right-wing">
              <path d="M60 39C72 30 77 19 90 16L115 11L105 19L111 17L98 26L103 24L88 32L92 31L76 37L80 38L60 42Z" />
            </g>
            <path d="M56 35Q58 31 61 32Q65 32 66 35L71 36L66 38L63 48L68 58L60 55L54 59L57 47L54 42Z" />
          </svg>
        </div>
      </div>

      <i v-for="(speck, index) in pollen" :key="`pollen-${index}`" class="pollen" :style="{
        left: speck.left, top: speck.top, animationDelay: speck.delay, animationDuration: speck.duration,
      }"></i>

      <div class="flowers flowers-far"><img :src="flowers" alt="" /></div>
      <div class="flowers flowers-near"><img :src="flowers" alt="" /></div>
      <div class="film-grain"></div>
    </div>

  </div>
    <button v-if="!reducedMotion" type="button" class="motion-toggle" :aria-pressed="paused" @click="toggleMotion">
      <span class="motion-symbol" aria-hidden="true">{{ paused ? '▷' : 'Ⅱ' }}</span>
      {{ paused ? 'Resume nature' : 'Pause a moment' }}
    </button>
</template>

<style scoped>
.nature-scene { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; background: #1c302a; --foreground-pan: 0px; --look-x: 0px; }
.scene-picture { position: absolute; inset: 0; }
.still-landscape, .river-canvas { position: absolute; width: 100%; height: 100%; inset: 0; object-fit: cover; object-position: 54% 50%; }
.river-canvas { opacity: 0; transition: opacity 1.5s; }
.river-canvas.is-active { opacity: 1; }
.exposure { position: absolute; inset: 0; background: linear-gradient(180deg, #091c2340, transparent 35%, #061d1930 80%, #06161177); }
.valley-haze { position: absolute; width: 125%; left: -12%; height: 20%; opacity: .17; background: radial-gradient(ellipse at 28% 50%, #e2e5dc99, transparent 45%), radial-gradient(ellipse at 68% 45%, #e4e7dc66, transparent 40%); animation: drift 65s ease-in-out infinite alternate; }
.haze-far { top: 30%; }
.haze-near { top: 44%; opacity: .08; animation-duration: 85s; animation-delay: -28s; }
.nature-details { position: absolute; inset: 0; }
.flight { position: absolute; left: -10%; color: #2b3637; animation: glide var(--duration) linear var(--delay) infinite; }
.banking { transform-origin: center; animation: bank 13s ease-in-out infinite; }
.flight:nth-child(2) .banking { animation-delay: -4s; }
.flight svg { width: 100%; overflow: visible; }
.left-wing, .right-wing { transform-origin: 60px 40px; animation: wings calc(var(--wing-time) * 5) ease-in-out infinite; }
.right-wing { animation-delay: -.08s; }
.flight:nth-child(2n) .left-wing, .flight:nth-child(2n) .right-wing { animation-delay: -2.3s; }
.pollen { position: absolute; width: 2px; height: 2px; background: #f4e4b4b0; border-radius: 50%; animation: pollen 22s ease-in-out infinite; }
.pollen:nth-of-type(3n) { filter: blur(.7px); width: 3px; height: 3px; }
.flowers { position: absolute; bottom: -7%; width: min(44vw, 640px); transform: translate3d(var(--look-x), var(--foreground-pan), 0); transform-origin: bottom left; }
.flowers img { display: block; width: 100%; transform-origin: 22% 100%; animation: wind-near 11s cubic-bezier(.42,0,.58,1) infinite; filter: brightness(.72) saturate(.75); mask-image: linear-gradient(to bottom, #000 72%, transparent 100%); }
.flowers-near { left: -9%; }
.flowers-far { left: 5%; bottom: -10%; width: min(27vw, 390px); opacity: .76; filter: blur(1.1px); }
.flowers-far img { animation: wind-far 14s ease-in-out -4s infinite; filter: brightness(.64) saturate(.7); }
.film-grain { position: absolute; inset: 0; opacity: .025; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='.7' filter='url(%23n)'/%3E%3C/svg%3E"); }
.motion-toggle { position: fixed; bottom: 32px; left: 4.5%; z-index: 6; pointer-events: auto; display: flex; align-items: center; gap: 10px; border: 1px solid #e3e5d333; border-radius: 30px; padding: 10px 14px; background: #142b274d; backdrop-filter: blur(10px); color: #e9e8da; font: 10px Arial, sans-serif; cursor: pointer; }
.motion-toggle:hover { background: #142b27bb; }
.motion-symbol { font-size: 13px; }
.motion-paused *, .motion-paused *::before, .motion-paused *::after { animation-play-state: paused !important; }
@keyframes drift { from { transform: translateX(-3%); } to { transform: translateX(5%); } }
@keyframes glide { 0% { transform: translate(-5vw, 3vh) scale(.85); } 40% { transform: translate(49vw, -2vh) scale(1); } 70% { transform: translate(85vw, 0) scale(.94); } 100% { transform: translate(125vw, -5vh) scale(.83); } }
@keyframes bank { 0%, 100% { transform: rotate(-5deg) scaleY(.83); } 35% { transform: rotate(6deg) scaleY(.95); } 65% { transform: rotate(-2deg) scaleY(.73); } }
@keyframes wings { 0%, 6%, 14%, 22%, 30% { transform: scaleY(.36); } 3%, 10%, 18%, 26%, 34% { transform: scaleY(1); } 43%, 95% { transform: scaleY(.84); } 100% { transform: scaleY(.36); } }
@keyframes wind-near { 0%, 100% { transform: rotate(-1.3deg) skewX(-.4deg); } 37% { transform: rotate(1.5deg) skewX(.6deg); } 58% { transform: rotate(.7deg) skewX(.2deg); } 76% { transform: rotate(1.8deg) skewX(.4deg); } }
@keyframes wind-far { 0%, 100% { transform: rotate(.5deg); } 40% { transform: rotate(-2deg); } 70% { transform: rotate(-.6deg); } }
@keyframes pollen { 0%, 100% { opacity: 0; transform: translate(0, 8px); } 25%, 65% { opacity: .5; } 80% { opacity: 0; transform: translate(65px, -85px); } }
@media (max-width: 700px) {
  .flowers-near { width: 72vw; left: -23%; bottom: -2%; }
  .flowers-far { width: 47vw; left: 0; bottom: -5%; }
  .flight { max-width: 26px; }
  .motion-toggle { bottom: 28px; left: 6%; padding: 9px 11px; font-size: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .flight { left: 65%; }
  .flight:nth-child(2) { left: 70%; }
  .flight:nth-child(3) { left: 59%; }
  .flight:nth-child(4) { left: 77%; }
  .pollen { display: none; }
}
</style>
