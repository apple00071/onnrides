import bcrypt from 'bcryptjs';

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Hashed password:', hash);
}

// Replace 'your-admin-password' with your desired password
hashPassword('your-admin-password'); 