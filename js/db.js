// Camada de persistência offline usando IndexedDB.
const DB_NAME = 'meu-time-db';
const DB_VERSION = 3;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('jogadores')) {
        db.createObjectStore('jogadores', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('time')) {
        db.createObjectStore('time', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('escalacao')) {
        db.createObjectStore('escalacao', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('comissao')) {
        db.createObjectStore('comissao', { keyPath: 'id' });
      }
      // 'escalacao' guarda a que está em campo, uma só; 'escalacoes' é o
      // fichário: uma escalação por registro, com nome dado pelo técnico.
      if (!db.objectStoreNames.contains('escalacoes')) {
        db.createObjectStore('escalacoes', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function lerTudo(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = db.transaction(storeName, 'readonly').objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = fn(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

export const DB = {
  async salvarJogador(jogador) {
    return tx('jogadores', 'readwrite', (store) => store.put(jogador));
  },
  async removerJogador(id) {
    return tx('jogadores', 'readwrite', (store) => store.delete(id));
  },
  async listarJogadores() {
    return lerTudo('jogadores');
  },
  async salvarMembro(membro) {
    return tx('comissao', 'readwrite', (store) => store.put(membro));
  },
  async removerMembro(id) {
    return tx('comissao', 'readwrite', (store) => store.delete(id));
  },
  async listarComissao() {
    return lerTudo('comissao');
  },
  async salvarTime(time) {
    return tx('time', 'readwrite', (store) => store.put({ id: 'principal', ...time }));
  },
  async obterTime() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction('time', 'readonly').objectStore('time');
      const req = store.get('principal');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async salvarEscalacao(escalacao) {
    return tx('escalacao', 'readwrite', (store) => store.put({ id: 'principal', ...escalacao }));
  },
  async obterEscalacao() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const store = db.transaction('escalacao', 'readonly').objectStore('escalacao');
      const req = store.get('principal');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  /* O fichário: escalações guardadas com nome, para voltarem ao campo
     inteiras. Cada registro tem o próprio id — guardar com o mesmo nome
     substitui, e é o app que pergunta antes.                            */
  async guardarEscalacao(escalacao) {
    return tx('escalacoes', 'readwrite', (store) => store.put(escalacao));
  },
  async removerGuardada(id) {
    return tx('escalacoes', 'readwrite', (store) => store.delete(id));
  },
  async listarGuardadas() {
    return lerTudo('escalacoes');
  },
};
