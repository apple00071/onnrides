import { seedAdmin } from '../app/lib/seed';

async function main() {
  console.log('Starting seed process...');
  await seedAdmin();
  console.log('Seed process completed.');
}

main().catch(console.error); 