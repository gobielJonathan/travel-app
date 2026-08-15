<script setup lang="ts">
defineProps<{
  budget: {
    progress: number;
    total: number;
    spent: number;
    remaining: number;
    categories: { name: string; spent: number }[];
  };
}>();
</script>
<template>
  <div class="panel budget-panel">
    <div class="panel-heading">
      <div>
        <div class="section-label">Trip budget</div>
        <h2>Spend with intent</h2>
      </div>
      <strong
        class="budget-progress-label"
        :class="{ 'budget-progress-label--over': budget.progress >= 100 }"
        >{{ Math.round(budget.progress) }}%</strong
      >
    </div>
    <div class="budget-summary">
      <div>
        <strong>${{ budget.total.toLocaleString() }}</strong
        ><span>total budget</span>
      </div>
      <div>
        <strong>${{ budget.spent.toLocaleString() }}</strong
        ><span>spent</span>
      </div>
      <div>
        <strong>${{ budget.remaining.toLocaleString() }}</strong
        ><span>remaining</span>
      </div>
    </div>
    <div
      class="budget-progress"
      role="progressbar"
      aria-label="Trip budget spent"
      :aria-valuenow="budget.progress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ width: `${budget.progress}%` }"></span>
    </div>
    <div class="budget-categories">
      <div v-for="category in budget.categories" :key="category.name">
        <span>{{ category.name }}</span
        ><strong>${{ category.spent.toLocaleString() }}</strong>
      </div>
    </div>
  </div>
</template>
<style scoped>
.budget-panel {
  position: relative;
}

.budget-progress-label {
  color: var(--orange);
  font:
    500 12px IBM Plex Mono,
    monospace;
}

.budget-progress-label--over {
  color: var(--coral);
}

.budget-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.budget-summary strong,
.budget-summary span {
  display: block;
}

.budget-summary strong {
  color: var(--night);
  font:
    400 24px Instrument Serif,
    serif;
}

.budget-summary span,
.budget-categories span {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.budget-progress {
  height: 6px;
  margin: 18px 0;
  overflow: hidden;
  background: var(--paper);
}

.budget-progress span {
  display: block;
  height: 100%;
  background: var(--orange);
}

.budget-categories {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 18px;
}

.budget-categories div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding-top: 8px;
}

.budget-categories span {
  margin-top: 0;
}

.budget-categories strong {
  color: var(--night);
  font:
    500 10px IBM Plex Mono,
    monospace;
}
</style>
