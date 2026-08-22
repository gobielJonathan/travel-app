<script setup lang="ts">
import type { BillItem } from "~/types/trip";
import { translateItems } from "~/utils/translation-cache";

useHead({ title: "Split bill — Roam" });

const crew: { initials: string; name: string; role: string; tone?: string }[] = [];
const bills = ref<{ title: string; date: string; total: number; items: number }[]>([]);
const items = ref<BillItem[]>([]);
const translations = ref<Record<string, string>>({});
const { processing, scan: analyzeReceipt } = useReceiptScanner();
const translating = ref(false);
const message = ref("");
const input = ref<HTMLInputElement | null>(null);

const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.price, 0));
const assigned = computed(
  () => new Set(items.value.map((item) => item.member).filter(Boolean)).size,
);
const crewTotals = computed(() =>
  crew.map((member) => ({
    ...member,
    total: items.value
      .filter((item) => item.member === member.initials)
      .reduce((sum, item) => sum + item.price, 0),
  })),
);

function addCameraReceipt() {
  input.value?.click();
}
async function scanReceipt(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  message.value = "Reading and analyzing receipt…";
  try {
    const scanned = await analyzeReceipt(file);
    if (!scanned.length) message.value = "No priced items found.";
    else {
      items.value = scanned;
      message.value = `${scanned.length} items recognized by Roam AI.`;
    }
  } catch (error) {
    message.value = error instanceof Error ? error.message : "Receipt analysis failed.";
  } finally {
    (event.target as HTMLInputElement).value = "";
  }
}
async function translateReceipt() {
  translating.value = true;
  message.value = "Translating item names…";
  try {
    translations.value = {
      ...translations.value,
      ...(await translateItems(items.value.map((item) => item.name))),
    };
    message.value = "English translations ready.";
  } catch {
    message.value = "Translation unavailable. Try again.";
  } finally {
    translating.value = false;
  }
}
function removeItem(index: number) {
  items.value.splice(index, 1);
}
</script>

<template>
  <div class="app-shell split-page">
    <header class="split-topbar">
      <NuxtLink class="brand" to="/"><span class="brand-mark">◒</span>roam</NuxtLink
      ><NuxtLink class="back-link" to="/trip">Back to trip</NuxtLink>
    </header>
    <main>
      <section class="split-hero">
        <div>
          <div class="eyebrow">Shared expense workspace</div>
          <h1>Split the bill,<br /><em>keep the trip easy.</em></h1>
          <p>Scan receipt, assign items, settle up with crew.</p>
        </div>
        <button class="primary-btn" :disabled="processing" @click="addCameraReceipt">
          {{ processing ? "Reading…" : "Scan receipt" }}
        </button>
      </section>
      <input
        ref="input"
        class="hidden-input"
        type="file"
        accept="image/*"
        capture="environment"
        @change="scanReceipt"
      />
      <p v-if="message" class="split-message">{{ message }}</p>
      <section class="split-layout">
        <div class="split-main">
          <div class="panel-heading">
            <div>
              <div class="section-label">Recognized items</div>
              <h2>What’s on receipt</h2>
            </div>
            <button
              class="ghost-btn"
              :disabled="translating || !items.length"
              @click="translateReceipt"
            >
              {{ translating ? "Translating…" : "Translate to English" }}
            </button>
          </div>
          <div class="item-list">
            <div v-for="(item, index) in items" :key="`${item.name}-${index}`" class="bill-item">
              <input v-model="item.name" aria-label="Receipt item name" />
              <small v-if="translations[item.name]">{{ translations[item.name] }}</small>
              <strong>${{ item.price.toFixed(2) }}</strong>
              <select v-model="item.member" aria-label="Assign crew member">
                <option v-for="member in crew" :key="member.initials" :value="member.initials">
                  {{ member.initials }}
                </option>
              </select>
              <button class="remove-btn" aria-label="Remove item" @click="removeItem(index)">
                ×
              </button>
            </div>
            <p v-if="!items.length" class="empty-state">Scan receipt to recognize items.</p>
          </div>
          <div class="summary-card">
            <div>
              <span class="section-label">Bill summary</span
              ><strong>${{ subtotal.toFixed(2) }}</strong
              ><small>{{ items.length }} items · {{ assigned }} crew members</small>
            </div>
            <div class="summary-stat">
              <span>Unsettled</span
              ><b
                >${{
                  items
                    .filter((item) => !item.settled)
                    .reduce((sum, item) => sum + item.price, 0)
                    .toFixed(2)
                }}</b
              >
            </div>
          </div>
        </div>
        <aside class="split-side">
          <div class="panel-heading">
            <div>
              <div class="section-label">Your crew</div>
              <h2>Assign items</h2>
            </div>
          </div>
          <div class="crew-total" v-for="member in crewTotals" :key="member.initials">
            <div :class="['crew-avatar', member.tone]">{{ member.initials }}</div>
            <div>
              <strong>{{ member.name }}</strong
              ><small>{{ member.role }}</small>
            </div>
            <b>${{ member.total.toFixed(2) }}</b>
          </div>
          <p v-if="!crew.length" class="empty-state">No crew members to assign yet.</p>
        </aside>
      </section>
      <section class="recent-bills">
        <div class="panel-heading">
          <div>
            <div class="section-label">Recent bills</div>
            <h2>Past shared expenses</h2>
          </div>
        </div>
        <div class="recent-grid">
          <article v-for="bill in bills" :key="bill.title">
            <div>
              <strong>{{ bill.title }}</strong
              ><small>{{ bill.date }}</small>
            </div>
            <b>${{ bill.total.toFixed(2) }}</b
            ><span>{{ bill.items }} items</span>
          </article>
          <p v-if="!bills.length" class="empty-state">No shared expenses yet.</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.split-page {
  max-width: 1180px;
}
.split-topbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}
.back-link {
  color: var(--blue);
  font:
    500 10px IBM Plex Mono,
    monospace;
  text-transform: uppercase;
  text-decoration: none;
}
.split-hero {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
  padding: 58px 0 34px;
}
h1 {
  margin: 10px 0;
  color: var(--night);
  font:
    400 clamp(42px, 7vw, 76px)/0.92 Instrument Serif,
    serif;
  letter-spacing: -0.04em;
}
h1 em {
  color: var(--orange);
}
.split-hero p {
  color: var(--muted);
}
.split-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
  gap: 20px;
}
.split-main,
.split-side,
.recent-bills {
  padding: 22px;
  border: 1px solid var(--line);
  background: var(--white);
}
.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 14px;
}
h2 {
  margin: 8px 0 20px;
  color: var(--night);
  font:
    400 30px Instrument Serif,
    serif;
}
.hidden-input {
  display: none;
}
.split-message {
  margin: 0 0 18px;
  color: var(--orange);
  font-size: 12px;
}
.item-list {
  display: grid;
  gap: 8px;
}
.bill-item {
  display: grid;
  grid-template-columns: minmax(100px, 1fr) 80px 86px 28px;
  gap: 8px;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid var(--line);
}
.bill-item input {
  min-width: 0;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: var(--night);
  font-weight: 700;
}
.bill-item input:focus {
  border-color: var(--orange);
  outline: none;
}
.bill-item small {
  grid-column: 1;
  color: var(--blue);
  font-size: 10px;
}
.bill-item strong {
  text-align: right;
  font-size: 12px;
}
.bill-item select {
  width: 76px;
  border: 1px solid var(--line);
  background: var(--paper);
  padding: 6px;
  font-size: 11px;
}
.remove-btn {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 20px;
}
.summary-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 24px;
  padding: 18px;
  background: #527d8712;
}
.summary-card strong {
  display: block;
  margin: 8px 0 2px;
  color: var(--night);
  font-size: 28px;
}
.summary-card small,
.summary-stat span {
  color: var(--muted);
  font-size: 10px;
}
.summary-stat {
  display: grid;
  align-content: center;
  text-align: right;
}
.summary-stat b {
  color: var(--orange);
  font-size: 18px;
}
.crew-total {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}
.crew-total div:nth-child(2) {
  flex: 1;
}
.crew-total strong,
.crew-total small {
  display: block;
}
.crew-total small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}
.crew-total b {
  font-size: 12px;
}
.crew-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  color: var(--night);
  font:
    500 10px IBM Plex Mono,
    monospace;
}
.coral {
  background: #e9b4a4;
}
.blue {
  background: #adc7c5;
}
.gold {
  background: #e0c881;
}
.mint {
  background: #b5cbb6;
}
.recent-bills {
  margin-top: 20px;
}
.recent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.recent-grid article {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--line);
}
.recent-grid strong,
.recent-grid small,
.recent-grid span {
  display: block;
}
.recent-grid small,
.recent-grid span {
  color: var(--muted);
  font-size: 10px;
}
.recent-grid b {
  color: var(--orange);
  font-size: 20px;
}
.empty-state {
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 720px) {
  .split-hero {
    align-items: start;
    flex-direction: column;
  }
  .split-layout,
  .recent-grid {
    grid-template-columns: 1fr;
  }
  .bill-item {
    grid-template-columns: minmax(80px, 1fr) 72px 70px 24px;
  }
  .bill-item small {
    display: none;
  }
  .split-main,
  .split-side,
  .recent-bills {
    padding: 16px;
  }
}
.split-page {
  max-width: 1320px;
  padding-bottom: 72px;
}
.split-topbar {
  border-bottom: 0;
}
.split-hero {
  position: relative;
  min-height: 320px;
  margin: 12px 0 26px;
  padding: 44px clamp(24px, 5vw, 72px);
  overflow: hidden;
  background: var(--night);
  color: var(--white);
}
.split-hero::after {
  position: absolute;
  right: -80px;
  bottom: -160px;
  width: 440px;
  height: 440px;
  border: 1px solid #e26d4566;
  border-radius: 50%;
  box-shadow:
    0 0 0 28px #e26d4520,
    0 0 0 56px #e26d4510;
  content: "";
}
.split-hero > div,
.split-hero > button {
  position: relative;
  z-index: 1;
}
.split-hero .eyebrow,
.split-hero p {
  color: #a9b9b3;
}
.split-hero h1 {
  max-width: 650px;
  margin: 12px 0 16px;
  color: var(--white);
  font-size: clamp(48px, 7vw, 88px);
}
.split-hero h1 em {
  color: #f28a62;
}
.split-hero p {
  margin: 0;
}
.split-hero .primary-btn {
  min-width: 156px;
  justify-content: center;
  border: 0;
  background: var(--orange);
  color: var(--white);
}
.split-message {
  min-height: 18px;
  margin: 0 0 12px;
}
.split-layout {
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
  gap: 26px;
}
.split-main,
.split-side,
.recent-bills {
  border: 0;
  box-shadow: 0 10px 30px #1725220d;
}
.split-main {
  padding: 30px;
}
.split-side {
  position: sticky;
  top: 20px;
  padding: 26px;
  background: var(--night);
  color: var(--white);
}
.split-side h2,
.split-side .section-label {
  color: var(--white);
}
.split-side .section-label {
  opacity: 0.6;
}
.split-side h2 {
  margin-bottom: 14px;
}
.panel-heading h2 {
  font-size: 36px;
}
.split-main .ghost-btn {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--blue);
  white-space: nowrap;
}
.item-list {
  border-top: 1px solid var(--line);
}
.bill-item {
  grid-template-columns: minmax(150px, 1fr) 100px 92px 34px;
  min-height: 76px;
  padding: 14px 8px;
}
.bill-item:hover {
  background: #e8e5dc66;
}
.bill-item input {
  padding: 6px 0;
  font-size: 14px;
}
.bill-item strong {
  font-size: 14px;
}
.bill-item select {
  width: 92px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--graphite);
}
.remove-btn {
  opacity: 0;
}
.bill-item:hover .remove-btn,
.remove-btn:focus {
  opacity: 1;
}
.summary-card {
  align-items: center;
  margin: 28px -8px -8px;
  padding: 22px;
  background: var(--paper);
}
.summary-card strong {
  font-size: 40px;
  letter-spacing: -0.05em;
}
.summary-stat {
  padding-left: 28px;
  border-left: 1px solid var(--line);
}
.summary-stat b {
  font-size: 22px;
}
.crew-total {
  border-bottom-color: #ffffff24;
}
.crew-total small {
  color: #a9b9b3;
}
.crew-total b {
  color: #f28a62;
  font-size: 16px;
}
.crew-avatar {
  width: 40px;
  height: 40px;
}
.recent-bills {
  margin-top: 26px;
  padding: 30px;
}
.recent-grid {
  grid-template-columns: repeat(3, 1fr);
}
.recent-grid article {
  min-height: 150px;
  justify-content: space-between;
  border: 1px solid var(--line);
  background: var(--paper);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}
.recent-grid article:hover {
  transform: translateY(-3px);
  box-shadow: 5px 5px 0 var(--orange);
}
@media (max-width: 720px) {
  .split-page,
  .split-page main,
  .split-layout,
  .split-main,
  .split-side,
  .recent-bills {
    max-width: 100%;
    min-width: 0;
  }
  .split-page {
    width: 100%;
    max-width: none;
    padding: 0 12px 40px;
    overflow: hidden;
  }
  .split-topbar {
    gap: 12px;
  }
  .back-link {
    white-space: nowrap;
  }
  .split-hero {
    width: 100%;
    min-height: 350px;
    margin-top: 0;
    padding: 28px 20px;
    justify-content: space-between;
  }
  .split-hero h1 {
    font-size: clamp(44px, 14vw, 62px);
    overflow-wrap: break-word;
  }
  .split-hero .primary-btn {
    width: 100%;
  }
  .split-layout {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .split-main,
  .split-side,
  .recent-bills {
    width: 100%;
    min-width: 0;
    padding: 20px 16px;
  }
  .split-main {
    border-top: 4px solid var(--orange);
  }
  .split-side {
    border-top: 4px solid var(--blue);
  }
  .split-main .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .split-main .ghost-btn {
    width: 100%;
    justify-content: center;
  }
  .panel-heading h2 {
    font-size: 32px;
  }
  .split-side {
    position: static;
    padding: 20px 16px 16px;
  }
  .split-side .panel-heading {
    margin-bottom: 12px;
  }
  .split-side h2 {
    margin-bottom: 0;
  }
  .split-side .crew-total {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 8px;
    min-width: 0;
    padding: 12px 0;
  }
  .split-side .crew-total b {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
    margin-top: -4px;
  }
  .split-side .crew-total div:nth-child(2) {
    min-width: 0;
  }
  .bill-item {
    grid-template-columns: minmax(0, 1fr) auto 24px;
    grid-template-rows: auto auto;
    column-gap: 8px;
    row-gap: 4px;
    min-width: 0;
    padding: 14px 0;
  }
  .bill-item input {
    width: 100%;
    min-width: 0;
  }
  .bill-item strong {
    grid-column: 2;
    grid-row: 1;
  }
  .bill-item small {
    display: block;
    grid-column: 1 / 3;
    grid-row: 2;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bill-item select {
    grid-column: 1 / 3;
    grid-row: 3;
    width: 100%;
    margin-top: 5px;
  }
  .remove-btn {
    grid-column: 3;
    grid-row: 1;
    opacity: 1;
  }
  .summary-card {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
    margin-right: 0;
    margin-left: 0;
  }
  .summary-stat {
    padding-top: 14px;
    padding-left: 0;
    border-top: 1px solid var(--line);
    border-left: 0;
    text-align: left;
  }
  .recent-grid {
    grid-template-columns: 1fr;
  }
}
</style>
