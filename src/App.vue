<script setup>
import { ref } from 'vue'

const count = ref(0)

function increaseCount() {
  count.value++
}
</script>

<template>
  <main>
    <h1>My Docker Learning App</h1>
    <p>This Vue app is from Preeti & Logesh github repo.</p>

    <button @click="increaseCount">
      Clicked {{ count }} times
    </button>
  </main>
</template>

<style scoped>
main {
  max-width: 600px;
  margin: 60px auto;
  padding: 24px;
  font-family: Arial, sans-serif;
}

button {
  padding: 12px 20px;
  cursor: pointer;
}
</style>