import { promises as fs } from 'fs';
import path from 'path';

async function createMigration() {
  const args = process.argv.slice(2);
  const name = args[0];

  if (!name) {
    console.error('Please provide a migration name');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const filename = `${timestamp}_${name}.ts`;
  const migrationsPath = path.join(process.cwd(), 'migrations');
  const filePath = path.join(migrationsPath, filename);

  const template = `import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Write your migration here
}

export async function down(db: Kysely<any>): Promise<void> {
  // Write your rollback here
}
`;

  try {
    await fs.mkdir(migrationsPath, { recursive: true });
    await fs.writeFile(filePath, template, 'utf8');
    console.log(`Created migration: ${filename}`);
  } catch (error) {
    console.error('Failed to create migration:', error);
    process.exit(1);
  }
}

createMigration(); 