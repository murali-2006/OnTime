const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config');

async function ensureDatabaseExists() {
  const targetDb = config.db.database || 'ontime_db';

  // Base connection config pointing to default maintenance database 'postgres'
  const maintenanceConfig = config.db.password !== null
    ? {
        user: config.db.user,
        password: String(config.db.password),
        host: config.db.host,
        port: config.db.port,
        database: 'postgres',
        connectionTimeoutMillis: 5000
      }
    : {
        connectionString: config.databaseUrl.replace(/\/[^/?]+(\?.*)?$/, '/postgres$1'),
        connectionTimeoutMillis: 5000
      };

  const maintPool = new Pool(maintenanceConfig);
  try {
    const client = await maintPool.connect();
    try {
      const checkRes = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [targetDb]
      );
      if (checkRes.rows.length === 0) {
        console.log(`📦 Database "${targetDb}" does not exist. Creating database "${targetDb}"...`);
        await client.query(`CREATE DATABASE "${targetDb}"`);
        console.log(`✅ Database "${targetDb}" created successfully.`);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '28P01') {
      throw err; // Re-throw auth failure so caller can handle
    }
    // If maintenance db check fails for other reasons, proceed to let normal connection try
  } finally {
    await maintPool.end();
  }
}

async function runMigration() {
  console.log('🔄 Running PostgreSQL migration...');

  try {
    await ensureDatabaseExists();
  } catch (err) {
    if (err.code === '28P01') {
      console.error('\n❌ PostgreSQL Authentication Failed:');
      console.error('   The password configured for user "' + config.db.user + '" is incorrect.');
      console.error('   Please update DB_PASSWORD in backend/.env with your actual PostgreSQL password.\n');
      process.exit(1);
    }
  }

  const { pool } = require('./index');
  const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ schema.sql not found at ${schemaPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('\n❌ Could not connect to PostgreSQL target database:');
    if (err.code === '28P01') {
      console.error('   [Auth Error]: Password authentication failed for user "' + config.db.user + '".');
      console.error('   Please set your correct PostgreSQL password in backend/.env (DB_PASSWORD=your_password).\n');
    } else {
      console.error(`   ${err.message}\n`);
    }
    process.exit(1);
  }

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ PostgreSQL Schema migration executed successfully!');

    // Verify created tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('📋 Verified Tables in "ontime_db":', tables.join(', '));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration transaction failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
