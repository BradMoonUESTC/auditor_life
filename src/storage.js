const STORAGE_KEY = "web3_dev_tycoon_v1";

export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resetStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

