import { pool } from '@taskforge/db';
import { initIndexes } from '../services/search.service.js';

async function main(): Promise<void> {
  console.info('[Search] Starting Meilisearch reindex...');
  await initIndexes();
  console.info('[Search] Reindex complete.');
}

void main()
  .catch((error: unknown) => {
    console.error('[Search] Reindex failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
