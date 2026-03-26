// src/config/database.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_HOST || '185.168.193.101',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '#T$AC*T2dnE+T@y!TG00PQSe3S@sjgzX5',
  database: process.env.DB_NAME || 'cascade_tz',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' ? true : false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

export let pool: sql.ConnectionPool;

export async function connectDatabase(): Promise<void> {
  try {
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server database');
    
    // Test the connection
    const result = await pool.request().query('SELECT GETDATE() as serverTime, DB_NAME() as databaseName');
    console.log(`📅 Connected to ${result.recordset[0].databaseName} at ${result.recordset[0].serverTime}`);
    
  } catch (error) {
    console.error('Database connection failed:', error);
    console.error('Connection details:', {
      server: config.server,
      database: config.database,
      user: config.user,
      port: config.port
    });
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.close();
    console.log('Database connection closed');
  }
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Closing database connection...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Closing database connection...');
  await closeDatabase();
  process.exit(0);
});