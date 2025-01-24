declare module 'drizzle-orm' {
  export type SQL = { type: 'sql', value: string };
  export type SQLWrapper = SQL;

  export function eq(field: any, value: any): SQLWrapper;
  export function desc(field: any): SQLWrapper;
  export function and(...conditions: SQLWrapper[]): SQLWrapper;
  export function gte(field: any, value: any): SQLWrapper;
  export function lte(field: any, value: any): SQLWrapper;
  export function or(...conditions: SQLWrapper[]): SQLWrapper;
  export function not(condition: SQLWrapper): SQLWrapper;

  export const sql: {
    raw: (strings: TemplateStringsArray, ...values: any[]) => SQL;
  } & {
    [key: string]: (...args: any[]) => SQL;
  };

  export interface PgColumn<T = unknown> {
    name: string;
    type: string;
    notNull: boolean;
    default?: unknown;
    primaryKey: boolean;
    hasDefault: boolean;
  }

  export interface Table<T = any> {
    $inferSelect: T;
    $inferInsert: T;
  }

  export interface PgTable<T = any> extends Table<T> {
    columns: { [K in keyof T]: PgColumn };
  }
} 