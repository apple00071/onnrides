const fs = require('fs');
const path = require('path');

// Files to update
const files = [
  'scripts/init-whatsapp.ts',
  'scripts/send-test-message.ts',
  'scripts/test-whatsapp.ts',
  'lib/notifications/admin-notification.ts',
  'lib/documents.ts',
  'app/api/admin/whatsapp/status/route.ts',
  'app/api/admin/users/[userId]/route.ts',
  'app/api/admin/users/[userId]/notify/route.ts',
  'app/api/admin/whatsapp/send/route.ts',
  'app/api/whatsapp/user/test/route.ts',
  'app/api/whatsapp/test/route.ts',
  'app/api/payments/verify/route.ts',
  'app/api/admin/bookings/route.ts',
  'app/api/bookings/route.ts'
];

// Update each file
files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Update the import path
    content = content.replace(
      /from ['"]@?\/?(lib\/whatsapp\/service)['"]/g,
      'from \'@/app/lib/whatsapp/service\''
    );
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated imports in ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
}); 