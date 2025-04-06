// Global module declarations
declare module '@/lib/auth' {
  export const authOptions: any;
}

declare module '@/lib/db' {
  export function query(text: string, params?: any[]): Promise<any>;
}

declare module '@/lib/logger' {
  const logger: {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
  };
  export default logger;
} 