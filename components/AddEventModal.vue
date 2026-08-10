<script setup lang="ts">
const emit = defineEmits<{ submit: [{ title: string; place: string; time: string; tag: string }]; close: [] }>()
const title = ref('')
const place = ref('')
const time = ref('20:00')
const tag = ref('New')
function submit() { if (!title.value.trim() || !place.value.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.value)) return; emit('submit', { title: title.value.trim(), place: place.value.trim(), time: time.value, tag: tag.value }); title.value = ''; place.value = '' }
</script>
<template>
  <div class="overlay" @click.self="emit('close')"><section class="invite-modal"><button class="close-btn" @click="emit('close')">×</button><div class="section-label">New stop</div><h2>Add event</h2><p>Set place and schedule time for this stop.</p><form @submit.prevent="submit"><input v-model="title" placeholder="Event title" required /><input v-model="place" placeholder="Location" required /><label>Schedule time<input v-model="time" type="time" required /></label><select v-model="tag"><option>New</option><option>Food</option><option>Explore</option><option>Transit</option></select><button class="primary-btn" type="submit">Add to timeline</button></form></section></div>
</template>
