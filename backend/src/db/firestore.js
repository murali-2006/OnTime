const fs = require('fs');
const path = require('path');
const config = require('../config');

let initializeApp, cert, applicationDefault, getApps;
let getFirestoreAdmin;

try {
  ({ initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app'));
  ({ getFirestore: getFirestoreAdmin } = require('firebase-admin/firestore'));
} catch (e) {
  console.warn('⚠️ firebase-admin modular SDK not loaded:', e.message);
}

let firestoreInstance = null;
let isCloudFirestore = false;

// Helper to locate service account key file
const findServiceAccountKey = () => {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH && path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH && path.resolve(__dirname, '../../', process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH && path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    path.resolve(__dirname, '../../serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'backend/serviceAccountKey.json')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Check if any *.json file in backend directory is a valid service account
  try {
    const backendDir = path.resolve(__dirname, '../../');
    const files = fs.readdirSync(backendDir);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'package.json' && file !== 'package-lock.json') {
        const fullPath = path.join(backendDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (content && content.type === 'service_account' && content.private_key) {
            return fullPath;
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  return null;
};

// Check if Firebase credentials exist in environment or local key file
const hasFirebaseCredentials = () => {
  return (
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    Boolean(findServiceAccountKey()) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
    (Boolean(process.env.FIREBASE_PROJECT_ID) &&
      Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
      Boolean(process.env.FIREBASE_PRIVATE_KEY))
  );
};

// Initialize Firebase Admin SDK
const initFirebase = (options = { allowFallback: true }) => {
  if (firestoreInstance) return firestoreInstance;

  if (initializeApp && cert && hasFirebaseCredentials()) {
    try {
      let credential;
      let detectedProjectId = process.env.FIREBASE_PROJECT_ID;

      const detectedKeyFile = findServiceAccountKey();
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const parsed = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string'
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
          : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        credential = cert(parsed);
        detectedProjectId = detectedProjectId || parsed.project_id;
      } else if (detectedKeyFile) {
        const parsed = JSON.parse(fs.readFileSync(detectedKeyFile, 'utf8'));
        credential = cert(parsed);
        detectedProjectId = detectedProjectId || parsed.project_id;
        console.log(`🔑 [Firebase]: Loaded service account key from: ${path.basename(detectedKeyFile)}`);
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        credential = cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && applicationDefault) {
        credential = applicationDefault();
      }

      if (!getApps().length) {
        initializeApp({
          credential,
          projectId: detectedProjectId || 'ontime-d56b5'
        });
      }

      firestoreInstance = getFirestoreAdmin();
      isCloudFirestore = true;
      console.log(`🔥 [Firebase]: Connected to Google Firebase Cloud Firestore successfully (Project: ${detectedProjectId || 'ontime-d56b5'}).`);
      return firestoreInstance;
    } catch (err) {
      console.error('❌ [Firebase Error]: Could not initialize Cloud Firestore with provided credentials:', err.message);
      throw err;
    }
  }

  if (hasFirebaseCredentials() || (options && options.allowFallback === false)) {
    throw new Error('Cloud Firestore initialization failed: Firebase credentials were provided but could not be initialized.');
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

const getConnectionStatus = () => {
  const detectedKeyFile = findServiceAccountKey();
  let detectedProjectId = process.env.FIREBASE_PROJECT_ID;
  if (detectedKeyFile) {
    try {
      const parsed = JSON.parse(fs.readFileSync(detectedKeyFile, 'utf8'));
      detectedProjectId = detectedProjectId || parsed.project_id;
    } catch (e) {}
  }

  const hasEnvVars = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
  const hasJsonStr = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasGoogleApp = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  return {
    isCloudFirestore,
    configured: Boolean(detectedKeyFile || hasEnvVars || hasJsonStr || hasGoogleApp),
    method: detectedKeyFile
      ? `Service Account File: ${path.basename(detectedKeyFile)}`
      : hasEnvVars
      ? 'Environment Variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)'
      : hasJsonStr
      ? 'FIREBASE_SERVICE_ACCOUNT_JSON'
      : hasGoogleApp
      ? 'GOOGLE_APPLICATION_CREDENTIALS'
      : 'Local persistent provider (Zero external config)',
    keyFilePath: detectedKeyFile ? detectedKeyFile : null,
    projectId: detectedProjectId || 'ontime-d56b5'
  };
};

module.exports = {
  getFirestore: initFirebase,
  isCloud: () => isCloudFirestore,
  getConnectionStatus,
  findServiceAccountKey
};
