// Re-export authentication utilities for global availability
export {
    authOptions,
    verifyAuth,
    verifyAdmin,
    hashPassword,
    comparePasswords,
    getCurrentUser
} from './auth/index';

import { authOptions } from './auth/index';
export default authOptions;