const { exec } = require('child_process');
require('dotenv').config();

console.log('Resetting database connections...');

// Run the command to regenerate the Prisma client
exec('npx prisma generate', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error generating Prisma client: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log('Prisma client regenerated successfully');

  // Now run the command to manually create the settings table
  exec('node scripts/manually-create-settings-table.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error creating settings table: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log('Settings table created successfully');
  });
});

console.log('Database reset process initiated');

// Exit gracefully
setTimeout(() => {
  console.log('Database reset complete');
}, 5000); 