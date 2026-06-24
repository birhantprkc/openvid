/** IDB para galería de fondos custom (Editor → pestaña imagen). */
const DB_NAME    = "openvid-bg-images";
const DB_VERSION = 1;
const STORE      = "images";

export interface BgImageEntry {
    id: string;
    dataUrl: string;   // base64 — mismo formato que antes, sólo cambia dónde se guarda
    uploadedAt: number;
}

let _db: IDBDatabase | null = null;
function openDB(): Promise<IDBDatabase> {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror   = () => reject(req.error);
        req.onsuccess = () => { _db = req.result; resolve(req.result); };
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE))
                db.createObjectStore(STORE, { keyPath: "id" });
        };
    });
}

export async function bgImagesGetAll(): Promise<BgImageEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result ?? []).sort((a, b) => b.uploadedAt - a.uploadedAt));
        req.onerror   = () => reject(req.error);
    });
}

export async function bgImagesSave(entry: BgImageEntry): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(entry);
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}

export async function bgImagesDelete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}