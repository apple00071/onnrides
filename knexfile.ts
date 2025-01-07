import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  },
  pool: {
    min: 0,
    max: 7,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

export default config; 