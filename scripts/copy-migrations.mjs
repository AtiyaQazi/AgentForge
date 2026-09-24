import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/db/migrations', { recursive: true });
cpSync('src/db/migrations', 'dist/db/migrations', { recursive: true });
console.log('[build] copied migrations to dist/db/migrations');