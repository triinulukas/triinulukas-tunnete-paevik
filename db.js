// Tiny IndexedDB wrapper. Everything stays on this device.
const DB_NAME = 'tunnete-paevik';
const STORES = ['entries', 'audio', 'kv', 'stars'];
let dbPromise;

function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('entries', { keyPath: 'id' });
      db.createObjectStore('audio');
      db.createObjectStore('kv');
      db.createObjectStore('stars', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const db = {
  get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
  all: (store) => run(store, 'readonly', (s) => s.getAll()),
  keys: (store) => run(store, 'readonly', (s) => s.getAllKeys()),
  put: (store, value, key) => run(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key))),
  del: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
  clearAll: async () => { for (const s of STORES) await run(s, 'readwrite', (st) => st.clear()); },
  STORES,
};

export async function getSetting(key, fallback) {
  const v = await db.get('kv', key);
  return v === undefined ? fallback : v;
}
export const setSetting = (key, value) => db.put('kv', value, key);
