// Persistencia local de la demo: la llave privada (no exportable) y los paquetes cifrados.
// Nunca se guarda texto plano: al recargar se vuelve a descifrar cada expediente.

const DB_NAME = 'parmex-demo';
const DB_VERSION = 1;
const KEYS = 'llaves';
const PACKAGES = 'expedientes';
const RECIPIENT = 'receptora';

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEYS)) db.createObjectStore(KEYS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PACKAGES)) db.createObjectStore(PACKAGES, { keyPath: 'folio' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el almacenamiento local.'));
  });
}

async function run(store, mode, action) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const request = action(transaction.objectStore(store));
      transaction.oncomplete = () => resolve(request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error ?? new Error('Fallo de almacenamiento.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Operación cancelada.'));
    });
  } finally {
    db.close();
  }
}

export function saveRecipient({ privateKey, keyId, publicFile }) {
  return run(KEYS, 'readwrite', store => store.put({ id: RECIPIENT, privateKey, keyId, publicFile }));
}

export async function loadRecipient() {
  const record = await run(KEYS, 'readonly', store => store.get(RECIPIENT));
  if (!record?.privateKey || typeof record.keyId !== 'string' || typeof record.publicFile !== 'string') return null;
  return { privateKey: record.privateKey, keyId: record.keyId, publicFile: record.publicFile };
}

export function savePackage({ folio, json, state, recibidoEn }) {
  return run(PACKAGES, 'readwrite', store => store.put({ folio, json, state, recibidoEn }));
}

export function updateState(folio, state) {
  return run(PACKAGES, 'readwrite', store => {
    const request = store.get(folio);
    request.onsuccess = () => {
      const record = request.result;
      if (record) {
        record.state = state;
        store.put(record);
      }
    };
    return request;
  });
}

export async function listPackages() {
  const records = await run(PACKAGES, 'readonly', store => store.getAll());
  return Array.isArray(records) ? records.sort((a, b) => a.recibidoEn - b.recibidoEn) : [];
}

export function clearPackages() {
  return run(PACKAGES, 'readwrite', store => store.clear());
}
