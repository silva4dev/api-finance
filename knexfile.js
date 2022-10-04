module.exports = {
  test: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'postgres',
      password: 'docker',
      database: 'apifinanca',
    },
    migrations: { directory: './src/migrations' },
    seeds: { directory: './src/seeds' },
  },
};
