import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema/index.js';

const poolSize = Number.parseInt(process.env.DB_POOL_SIZE ?? '10', 10);
const idleTimeout = Number.parseInt(process.env.DB_IDLE_TIMEOUT ?? '60000', 10);

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL ?? 'mysql://taskforge:taskforge@localhost:3306/taskforge',
  waitForConnections: true,
  connectionLimit: poolSize,
  queueLimit: 0,
  connectTimeout: 5000,
  idleTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

export const db = drizzle(pool, { schema, mode: 'default' });

export type Database = typeof db;
