/*
 * Storage ── ロジック層（IndexedDBの薄いラッパー）
 * ------------------------------------------------------------
 * 写真つきの思い出（絵本日記）と、読みかけの本の状態を端末に保存する。
 * localStorage は容量が小さく（約5MB）写真のdataURLを入れるとすぐ溢れるため、
 * 大きなデータは IndexedDB に入れる。
 *
 * 使い方は key-value の3つだけ：
 *   await Storage.get(key)      → 値 or undefined
 *   await Storage.set(key, v)   → 保存
 *   await Storage.remove(key)   → 削除
 *
 * IndexedDB が使えない環境（プライベートブラウズ等）でも例外は外に出さず、
 * 「保存されないだけで、アプリは普通に動く」ことを保証する。
 */

const DB_NAME = "ehon.store.v1";
const STORE = "kv";

let dbPromise = null;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function db() {
  if (!dbPromise) {
    dbPromise = openDb().catch((err) => {
      dbPromise = null; // 次回また試せるように
      throw err;
    });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const Storage = {
  async get(key) {
    try { return await run("readonly", (s) => s.get(key)); }
    catch (_) { return undefined; }
  },
  async set(key, value) {
    try { await run("readwrite", (s) => s.put(value, key)); return true; }
    catch (_) { return false; }
  },
  async remove(key) {
    try { await run("readwrite", (s) => s.delete(key)); return true; }
    catch (_) { return false; }
  },
};
