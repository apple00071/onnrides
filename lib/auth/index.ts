export { authOptions } from './auth-options';

import { authOptions as options } from './auth-options';
export default options;

export { verifyAuth, verifyAdmin } from './verify';
export { hashPassword, comparePasswords } from './passwords';
export { getCurrentUser } from './user'; 