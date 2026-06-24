/** IDB para overlays subidos por el usuario (ElementsMenu → pestaña uploads). */
import type { UploadedImage } from "@/types/canvas-elements.types";

const DB_NAME    = "openvid-canvas-uploads";
const DB_VERSION = 1;
const STORE      = "uploads";

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

export async function canvasUploadsGetAll(): Promise<UploadedImage[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
        req.onsuccess = () => resolve((req.result ?? []).sort((a, b) => b.uploadedAt - a.uploadedAt));
        req.onerror   = () => reject(req.error);
    });
}

export async function canvasUploadsSave(entry: UploadedImage): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(entry);
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}

export async function canvasUploadsDelete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}

export async function canvasUploadsClear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).clear();
        req.onsuccess = () => resolve();
        req.onerror   = () => reject(req.error);
    });
}