<script setup lang="ts">
import type { CrewMember } from '~/types/trip'
defineProps<{ members: CrewMember[] }>()
const emit = defineEmits<{ invite: [] }>()
</script>
<template>
  <div class="rounded border border-[#e5e2db] bg-white p-6"><div class="flex items-start justify-between"><div><div class="font-mono text-[10px] uppercase tracking-[1.3px] text-[#9b958b]">Your crew</div><h2 class="mt-2 text-[22px] tracking-[-.7px]">Travel together</h2></div></div><div class="mt-5 grid gap-4"><div v-for="member in members" :key="member.initials" class="flex items-center gap-3"><div :class="['grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full text-[10px] font-bold', member.tone === 'coral' ? 'bg-[#e9b4a4]' : member.tone === 'blue' ? 'bg-[#adc7c5]' : member.tone === 'gold' ? 'bg-[#e0c881]' : 'bg-[#d9d0bf] text-[#4b4035]']">{{ member.initials }}</div><div><strong class="block text-xs">{{ member.name }}</strong><p class="mt-1 text-[10px] text-[#9b958b]">{{ member.role }}</p></div></div></div><button class="mt-6 rounded bg-[#f2eee5] px-4 py-3 text-xs font-semibold text-coral" @click="emit('invite')">Share invite</button></div>
</template>
