<script setup lang="ts">
defineProps<{
  days: { month: string; date: string }[];
  crewCount: number;
  title: string;
  eventCount: number;
}>();
</script>
<template>
  <section class="trip-meta">
    <div class="meta-item">
      <span class="meta-icon">◷</span>
      <div>
        <strong>{{
          days.length
            ? `${days[0]?.month} ${days[0]?.date} — ${days[days.length - 1]?.month} ${days[days.length - 1]?.date}`
            : "No dates set"
        }}</strong
        ><small>{{ days.length }} {{ days.length === 1 ? "day" : "days" }} planned</small>
      </div>
    </div>
    <div class="meta-item">
      <span class="meta-icon">♧</span>
      <div>
        <strong>{{ crewCount }} travelers</strong><small>All members can edit</small>
      </div>
    </div>
    <div class="meta-item map-meta">
      <span class="meta-icon">⌖</span>
      <div>
        <strong>{{ title || "Destination not set" }}</strong
        ><small>{{ eventCount }} saved places</small>
      </div>
    </div>
  </section>
</template>
<style scoped>
.trip-meta {
  position: relative;
  display: flex;
  gap: 18px;
  overflow-x: auto;
  margin: 0 -16px 22px;
  padding: 16px;
  border-block: 1px solid var(--line);
}
.meta-item {
  display: flex;
  flex: 0 0 180px;
  align-items: center;
  gap: 12px;
}
.meta-icon {
  color: var(--orange);
  font-size: 23px;
}
.meta-item strong,
.meta-item small {
  display: block;
}
.meta-item strong {
  font-size: 12px;
}
.meta-item small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}
@media (min-width: 801px) {
  .trip-meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0 0 26px;
    overflow: visible;
    padding: 19px 0;
  }
  .meta-item {
    flex: initial;
    padding: 0 24px;
    border-right: 1px solid var(--line);
  }
  .meta-item:first-child {
    padding-left: 0;
  }
  .meta-item:last-child {
    border: 0;
  }
}
</style>
