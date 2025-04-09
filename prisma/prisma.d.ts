declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $on(event: string, callback: (e: any) => void): void;
    $transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T>;
    $queryRaw<T = any>(query: string, ...args: any[]): Promise<T>;
    $executeRaw(query: string, ...args: any[]): Promise<number>;
    $use(middleware: any): void;
    $extends(extension: any): any;
    
    // Add your models here
    users: {
      findUnique(params: any): Promise<any>;
      create(params: any): Promise<any>;
      update(params: any): Promise<any>;
      delete(params: any): Promise<any>;
      findMany(params?: any): Promise<any[]>;
      upsert(params: { where: any; update: any; create: any; }): Promise<any>;
    };
    settings: {
      findUnique(params: any): Promise<any>;
      create(params: any): Promise<any>;
      update(params: any): Promise<any>;
      delete(params: any): Promise<any>;
      findMany(params?: any): Promise<any[]>;
      upsert(params: { where: any; update: any; create: any; }): Promise<any>;
      createMany(params: { data: any[]; skipDuplicates?: boolean }): Promise<any>;
    };
    vehicles: {
      findUnique(params: any): Promise<any>;
      create(params: any): Promise<any>;
      update(params: any): Promise<any>;
      delete(params: any): Promise<any>;
      findMany(params?: any): Promise<any[]>;
      upsert(params: { where: any; update: any; create: any; }): Promise<any>;
    };
    locations: {
      findUnique(params: any): Promise<any>;
      create(params: any): Promise<any>;
      update(params: any): Promise<any>;
      delete(params: any): Promise<any>;
      findMany(params?: any): Promise<any[]>;
      upsert(params: { where: any; update: any; create: any; }): Promise<any>;
    };
    bookings: {
      findUnique(params: any): Promise<any>;
      create(params: any): Promise<any>;
      update(params: any): Promise<any>;
      delete(params: any): Promise<any>;
      findMany(params?: any): Promise<any[]>;
      upsert(params: { where: any; update: any; create: any; }): Promise<any>;
    };
    documents: {
      findUnique(params: any): Promise<any>;
      create(params: any): Promise<any>;
      createMany(params: any): Promise<any>;
      update(params: any): Promise<any>;
      delete(params: any): Promise<any>;
      findMany(params?: any): Promise<any[]>;
      upsert(params: { where: any; update: any; create: any; }): Promise<any>;
    };
    document_submissions: any;
    payments: any;
    profiles: any;
    reviews: any;
    coupons: {
      findUnique(params: any): Promise<any>;
      create(params: any): Promise<any>;
      update(params: any): Promise<any>;
      delete(params: any): Promise<any>;
      findMany(params?: any): Promise<any[]>;
      upsert(params: { where: any; update: any; create: any; }): Promise<any>;
    };
    email_logs: any;
    whatsapp_logs: any;
    password_resets: any;
    AdminNotification: any;
  }
  
  // Export PrismaClient as both a type and a class
  export { PrismaClient };
  
  // Export the Prisma namespace
  export namespace Prisma {
    // Add common Prisma types here
    export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
    export interface JsonObject {
      [key: string]: JsonValue;
    }
    export type JsonArray = JsonValue[];
    
    // Add other common Prisma types as needed
    export type DateTime = string;
    export type Decimal = string;
    export type Int = number;
    export type Float = number;
    export type String = string;
    export type Boolean = boolean;
    export type Bytes = Buffer;
    export type BigInt = bigint;
    
    // Add Prisma error classes
    export class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: Record<string, any>;
    }
    
    export class PrismaClientInitializationError extends Error {
      errorCode?: string;
    }
    
    export class PrismaClientValidationError extends Error {}
    
    export class PrismaClientRustPanicError extends Error {}
    
    export class PrismaClientRustQueryEngineError extends Error {}
  }
} 