const { parse } = require("pg-connection-string");
require("dotenv").config();

const dbUrl = parse(process.env.DATABASE_URL);

const commonConfig = {
  username: dbUrl.user,
  password: dbUrl.password,
  database: dbUrl.database,
  host: dbUrl.host,
  port: dbUrl.port,
  dialect: "postgres",
  logging: false,
  dialectOptions: {},
};

module.exports = {
  development: {
    ...commonConfig,
  },
  test: {
    ...commonConfig,
  },
  production: {
    ...commonConfig,
  },
};
