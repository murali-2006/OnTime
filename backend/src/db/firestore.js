const fs = require('fs');
const path = require('path');
const config = require('../config');

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.warn('⚠️ firebase-admin module not loaded:', e.message);
}

let firestoreInstance = null;
let isCloudFirestore = false;

// Check if Firebase credentials exist in environment
const hasFirebaseCredentials = () => {
  return (
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
    (Boolean(process.env.FIREBASE_PROJECT_ID) &&
      Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
      Boolean(process.env.FIREBASE_PRIVATE_KEY))
  );
};

// Initialize Firebase Admin SDK
const initFirebase = () => {
  if (firestoreInstance) return firestoreInstance;

  if (admin && hasFirebaseCredentials()) {
    try {
      let credential;
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        credential = admin.credential.cert(parsed);
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        const parsed = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        credential = admin.credential.cert(parsed);
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        credential = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        credential = admin.credential.applicationDefault();
      }

      if (!admin.apps.length) {
        admin.initializeApp({ credential });
      }

      firestoreInstance = admin.firestore();
      isCloudFirestore = true;
      console.log('🔥 [Firebase]: Connected to Google Firebase Cloud Firestore successfully.');
      return firestoreInstance;
    } catch (err) {
      console.warn('⚠️ [Firebase Warning]: Could not initialize Cloud Firestore with provided credentials:', err.message);
      console.warn('   Falling back to persistent local Firestore provider for development.');
    }
  }

  // Persistent Local Firestore Provider (Zero external config required for local dev/testing)
  firestoreInstance = createLocalFirestoreProvider();
  console.log('📦 [Firestore]: Local persistent Firestore database provider active.');
  return firestoreInstance;
};

/**
 * Local persistent Firestore-compatible database provider
 * Replicates the Firestore Admin SDK API (collections, documents, queries, transactions)
 */
function createLocalFirestoreProvider() {
  const dataFilePath = path.resolve(__dirname, 'firestore_local_data.json');

  let store = {};
  if (fs.existsSync(dataFilePath)) {
    try {
      store = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    } catch (e) {
      store = {};
    }
  }

  const save = () => {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save local firestore data:', e.message);
    }
  };

  const getCollection = (colName) => {
    if (!store[colName]) store[colName] = {};
    return store[colName];
  };

  const createDocSnapshot = (id, data) => ({
    id: String(id),
    exists: data !== undefined && data !== null,
    data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
    get: (field) => (data ? data[field] : undefined)
  });

  const createQuerySnapshot = (docs) => ({
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (fn) => docs.forEach(fn)
  });

  class DocumentReference {
    constructor(colName, docId) {
      this.colName = colName;
      this.id = String(docId);
    }

    async get() {
      const col = getCollection(this.colName);
      const data = col[this.id];
      return createDocSnapshot(this.id, data);
    }

    async set(data, options = {}) {
      const col = getCollection(this.colName);
      const cleanData = JSON.parse(JSON.stringify(data));
      if (options.merge && col[this.id]) {
        col[this.id] = { ...col[this.id], ...cleanData };
      } else {
        col[this.id] = cleanData;
      }
      save();
      return { writeTime: new Date() };
    }

    async update(data) {
      const col = getCollection(this.colName);
      if (!col[this.id]) {
        throw new Error(`NOT_FOUND: No document to update: ${this.colName}/${this.id}`);
      }
      col[this.id] = { ...col[this.id], ...JSON.parse(JSON.stringify(data)) };
      save();
      return { writeTime: new Date() };
    }

    async delete() {
      const col = getCollection(this.colName);
      delete col[this.id];
      save();
      return { writeTime: new Date() };
    }
  }

  class Query {
    constructor(colName, filters = [], orderBys = [], limitCount = null, offsetCount = 0) {
      this.colName = colName;
      this.filters = filters;
      this.orderBys = orderBys;
      this.limitCount = limitCount;
      this.offsetCount = offsetCount;
    }

    where(field, op, val) {
      return new Query(
        this.colName,
        [...this.filters, { field, op, val }],
        this.orderBys,
        this.limitCount,
        this.offsetCount
      );
    }

    orderBy(field, direction = 'asc') {
      return new Query(
        this.colName,
        this.filters,
        [...this.orderBys, { field, direction: direction.toLowerCase() }],
        this.limitCount,
        this.offsetCount
      );
    }

    limit(n) {
      return new Query(
        this.colName,
        this.filters,
        this.orderBys,
        n,
        this.offsetCount
      );
    }

    offset(n) {
      return new Query(
        this.colName,
        this.filters,
        this.orderBys,
        this.limitCount,
        n
      );
    }

    async get() {
      const col = getCollection(this.colName);
      let items = Object.entries(col).map(([id, d]) => ({ ...d, _id: id }));

      // Apply filters
      for (const f of this.filters) {
        items = items.filter((item) => {
          const itemVal = item[f.field];
          if (f.op === '==' || f.op === '===') {
            if (typeof itemVal === 'string' && typeof f.val === 'string') {
              return itemVal.toLowerCase() === f.val.toLowerCase();
            }
            return itemVal === f.val || String(itemVal) === String(f.val);
          }
          if (f.op === '!=') return itemVal !== f.val;
          if (f.op === '>') return itemVal > f.val;
          if (f.op === '>=') return itemVal >= f.val;
          if (f.op === '<') return itemVal < f.val;
          if (f.op === '<=') return itemVal <= f.val;
          if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(itemVal);
          return true;
        });
      }

      // Apply orderBys
      for (const ob of this.orderBys) {
        items.sort((a, b) => {
          const valA = a[ob.field] !== undefined ? a[ob.field] : '';
          const valB = b[ob.field] !== undefined ? b[ob.field] : '';
          if (valA < valB) return ob.direction === 'desc' ? 1 : -1;
          if (valA > valB) return ob.direction === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Apply offset and limit
      if (this.offsetCount > 0) {
        items = items.slice(this.offsetCount);
      }
      if (this.limitCount !== null) {
        items = items.slice(0, this.limitCount);
      }

      const docSnapshots = items.map((item) => {
        const { _id, ...data } = item;
        return createDocSnapshot(_id, data);
      });

      return createQuerySnapshot(docSnapshots);
    }
  }

  class CollectionReference extends Query {
    constructor(colName) {
      super(colName);
    }

    doc(docId) {
      if (!docId) {
        // Auto-generate ID if none provided
        const col = getCollection(this.colName);
        const existingIds = Object.keys(col).map((k) => parseInt(k, 10)).filter((n) => !isNaN(n));
        const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        docId = String(nextId);
      }
      return new DocumentReference(this.colName, docId);
    }

    async add(data) {
      const col = getCollection(this.colName);
      const existingIds = Object.keys(col).map((k) => parseInt(k, 10)).filter((n) => !isNaN(n));
      const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const docRef = new DocumentReference(this.colName, String(nextId));
      await docRef.set({ id: nextId, ...data });
      return docRef;
    }
  }

  return {
    collection: (name) => new CollectionReference(name),
    doc: (pathStr) => {
      const parts = pathStr.split('/');
      return new DocumentReference(parts[0], parts[1]);
    },
    runTransaction: async (updateFunction) => {
      const transaction = {
        get: async (docRef) => docRef.get(),
        set: (docRef, data, options) => docRef.set(data, options),
        update: (docRef, data) => docRef.update(data),
        delete: (docRef) => docRef.delete()
      };
      return await updateFunction(transaction);
    },
    batch: () => {
      const ops = [];
      return {
        set: (docRef, data, options) => ops.push(() => docRef.set(data, options)),
        update: (docRef, data) => ops.push(() => docRef.update(data)),
        delete: (docRef) => ops.push(() => docRef.delete()),
        commit: async () => {
          for (const op of ops) await op();
        }
      };
    },
    isCloud: () => isCloudFirestore
  };
}

module.exports = {
  getFirestore: initFirebase,
  get admin() {
    return admin;
  },
  isCloud: () => isCloudFirestore
};
