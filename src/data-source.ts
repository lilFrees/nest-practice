import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'better-sqlite3',
  database: process.env.NODE_ENV === 'test' ? 'test.sqlite' : 'db.sqlite',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'test',
  migrations: ['migrations/*.js'],
};

// Used by the TypeORM CLI (e.g. for migrations)
export default new DataSource(dataSourceOptions);
