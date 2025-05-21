const { parse } = require('pg-connection-string');
require('dotenv').config();

const dbUrl = parse(process.env.POSTGRES_URL);
// console.log(dbUrl);

const commonConfig = {
  username: dbUrl.user,
  password: dbUrl.password,
  database: dbUrl.database,
  host: dbUrl.host,
  port: dbUrl.port,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  dialectModule: require('pg'),
  
};
module.exports = {
  development: {
    ...commonConfig
  },
  test: {
    ...commonConfig
  },
  production: {
    ...commonConfig
    // 👇 only use dialectOptions.ssl if really needed
    // dialectOptions: {
    //   ssl: { require: true, rejectUnauthorized: false }
    // }
  }
};