<script setup lang="ts">
import type { CrewMember } from "~/types/trip";
defineProps<{ members: CrewMember[] }>();
const emit = defineEmits<{ invite: [] }>();
</script>
<template>
  <div class="crew-panel">
    <div class="panel-heading">
      <div>
        <div class="section-label">Your crew</div>
        <h2>Travel together</h2>
      </div>
    </div>
    <div class="crew-members">
      <div v-for="member in members" :key="member.initials" class="crew-member">
        <div :class="['crew-avatar', member.tone]">{{ member.initials }}</div>
        <div>
          <strong>{{ member.name }}</strong>
          <p>
            <span class="crew-presence" :class="{ online: member.online }" aria-hidden="true"></span
            >{{ member.online ? "Online" : "Offline" }}
          </p>
        </div>
      </div>
    </div>
    <button class="crew-invite" @click="emit('invite')">Share invite</button>
  </div>
</template>
<style>
.crew-panel {
  padding: 18px;
  border: 1px solid var(--line);
  background: var(--white);
}
.crew-panel h2 {
  margin: 8px 0;
  color: var(--night);
  font:
    400 28px Instrument Serif,
    serif;
}
.crew-members {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}
.crew-member {
  display: flex;
  align-items: center;
  gap: 12px;
}
.crew-avatar {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: var(--night);
  font:
    500 10px IBM Plex Mono,
    monospace;
}
.crew-avatar.coral {
  background: #e9b4a4;
}
.crew-avatar.blue {
  background: #adc7c5;
}
.crew-avatar.gold {
  background: #e0c881;
}
.crew-avatar.mint {
  background: #b5cbb6;
}
.crew-member strong {
  display: block;
  font-size: 12px;
}
.crew-member p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 10px;
}
.crew-presence {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 5px;
  border-radius: 50%;
  background: var(--muted);
  vertical-align: 1px;
}
.crew-presence.online {
  background: #4f9b63;
  box-shadow: 0 0 0 2px #4f9b6330;
}
.crew-invite {
  min-height: 44px;
  margin-top: 22px;
  border: 0;
  background: #527d8718;
  padding: 10px 14px;
  color: var(--blue);
  font-size: 11px;
  font-weight: 800;
}
@media (min-width: 801px) {
  .crew-panel {
    padding: 22px;
  }
}
</style>
