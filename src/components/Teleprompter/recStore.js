// Copia de seguridad local de las grabaciones en IndexedDB del navegador.
// Sirve para no perder un vídeo si iOS recarga la página (por falta de memoria, por ejemplo) justo al
// guardarlo. Nada sale del dispositivo; se borra al descartar la grabación o desde «Grabaciones».

const DB_NAME = 'capacero_tp';
const META = 'meta';
const BLOBS = 'blobs';

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transacción cancelada'));
  });
}

export async function saveRecording({ id, name, type, video, wav, wavName }) {
  const db = await open();
  try {
    const tx = db.transaction([META, BLOBS], 'readwrite');
    tx.objectStore(META).put({
      id,
      name,
      type,
      size: video.size,
      savedAt: Date.now(),
      wavName: wav ? wavName : null,
      wavSize: wav ? wav.size : 0,
    });
    tx.objectStore(BLOBS).put({ id, video, wav: wav || null });
    await done(tx);
  } finally {
    db.close();
  }
}

export async function listRecordings() {
  try {
    const db = await open();
    try {
      const req = db.transaction(META).objectStore(META).getAll();
      const items = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return items.sort((a, b) => b.savedAt - a.savedAt);
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

export async function getRecordingBlobs(id) {
  const db = await open();
  try {
    const req = db.transaction(BLOBS).objectStore(BLOBS).get(id);
    return await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteRecording(id) {
  try {
    const db = await open();
    try {
      const tx = db.transaction([META, BLOBS], 'readwrite');
      tx.objectStore(META).delete(id);
      tx.objectStore(BLOBS).delete(id);
      await done(tx);
    } finally {
      db.close();
    }
  } catch {
    // Nada que borrar o almacenamiento no disponible
  }
}
