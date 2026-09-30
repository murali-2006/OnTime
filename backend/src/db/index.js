const { Pool } = require('pg');
const config = require('../config');

// PostgreSQL Connection Pool Configuration
const poolConfig = config.db.password !== null
  ? {
      user: config.db.user,
      password: String(config.db.password),
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20
    }
  : {
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20
    };

const pool = new Pool(poolConfig);

let isPgConnected = false;

// Masked connection URI for safe console logging
const getSafeConnLog = () => {
  if (config.db.password !== null) {
    return `postgres://${config.db.user}:****@${config.db.host}:${config.db.port}/${config.db.database}`;
  }
  return config.databaseUrl.replace(/:([^:@]+)@/, ':****@');
};

// Test initial connection
pool.connect((err, client, release) => {
  if (err) {
    console.warn('\n⚠️ [Database Notice]: Could not connect to PostgreSQL at ' + getSafeConnLog());
    if (err.code === '28P01') {
      console.warn('   [Auth Error]: Password authentication failed for user "' + (config.db.user || 'postgres') + '".');
      console.warn('   Please update DB_PASSWORD in backend/.env to match your local PostgreSQL password.\n');
    } else if (err.code === '3D000') {
      console.warn('   [Database Missing]: Database "' + (config.db.database || 'ontime_db') + '" does not exist yet.');
      console.warn('   Run "npm run migrate" to auto-create the database and schema.\n');
    } else {
      console.warn('   Error details: ' + err.message + '\n');
    }
  } else {
    isPgConnected = true;
    console.log('✅ [Database]: Successfully connected to PostgreSQL database.');
    release();
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Execute parameterized SQL query
 * @param {string} text - SQL Query with parameterized placeholders ($1, $2, etc.)
 * @param {Array} params - Array of parameters
 * @returns {Promise<{ rows: Array, rowCount: number }>}
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL Query] (${duration}ms):`, { text, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('[SQL Error]:', { text, error: error.message });
    throw error;
  }
};

/**
 * Get a client for multi-statement transactions
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  return { client, query, release };
};

module.exports = {
  pool,
  query,
  getClient,
  isPgConnected: () => isPgConnected
};
