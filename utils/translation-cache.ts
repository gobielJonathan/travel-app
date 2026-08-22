const CACHE_KEY = "roam-translation-cache-v1";

type TranslationCache = Record<string, string>;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function readCache(): TranslationCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as TranslationCache;
  } catch {
    return {};
  }
}

function writeCache(cache: TranslationCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    return;
  }
}

export async function translateItems(items: string[], workspaceCode?: string) {
  const unique = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  const cache = readCache();
  const translations: Record<string, string> = {};
  const missing: string[] = [];
  for (const item of unique) {
    const cached = cache[normalize(item)];
    if (cached) translations[item] = cached;
    else missing.push(item);
  }
  if (!missing.length) return translations;
  const response = await $fetch<{ translations: Record<string, string> }>("/api/ai/translate", {
    method: "POST",
    body: { items: missing, targetLanguage: "English", workspaceCode },
  });
  for (const item of missing) {
    const translation = response.translations[item] || item;
    translations[item] = translation;
    cache[normalize(item)] = translation;
  }
  writeCache(cache);
  return translations;
}
