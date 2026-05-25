// Rolling auto-backup of the coffee state into IndexedDB.
// Keeps the last MAX_BACKUPS entries (oldest pruned on each push).
// Used as a safety net: if the user accidentally hits "Vymazať všetko" past
// the toast undo window, or if localStorage gets corrupted, they can restore
// a recent snapshot from the DB panel.

const DB_NAME       = 'karticky-kava-backups';
const STORE_NAME    = 'snapshots';
const DB_VERSION    = 1;
const MAX_BACKUPS   = 10;

let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('ts', 'ts');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(mode) {
  return openDb().then(db => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
}

export async function pushBackup(snapshot) {
  try {
    const store = await tx('readwrite');
    await new Promise((resolve, reject) => {
      const req = store.add({
        ts: Date.now(),
        coffeeCount: Array.isArray(snapshot?.coffees) ? snapshot.coffees.length : 0,
        snapshot,
      });
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
    await pruneOld();
  } catch (e) {
    console.warn('IDB backup failed', e);
  }
}

async function pruneOld() {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const all = [];
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) { all.push({ id: c.value.id, ts: c.value.ts }); c.continue(); }
      else {
        // Sort newest → oldest; delete everything past the cap
        all.sort((a, b) => b.ts - a.ts);
        const tooOld = all.slice(MAX_BACKUPS);
        if (!tooOld.length) { resolve(); return; }
        Promise.all(tooOld.map(({ id }) => new Promise((res, rej) => {
          const req = store.delete(id);
          req.onsuccess = () => res();
          req.onerror   = () => rej(req.error);
        }))).then(resolve, reject);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

export async function listBackups() {
  try {
    const store = await tx('readonly');
    return await new Promise((resolve, reject) => {
      const all = [];
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) { all.push(c.value); c.continue(); }
        else   { all.sort((a, b) => b.ts - a.ts); resolve(all); }
      };
      cursor.onerror = () => reject(cursor.error);
    });
  } catch (e) {
    console.warn('IDB list failed', e);
    return [];
  }
}

export async function getBackup(id) {
  const store = await tx('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = () => reject(req.error);
  });
}

export async function deleteBackup(id) {
  const store = await tx('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
