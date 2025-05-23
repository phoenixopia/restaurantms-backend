"use strict";

const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize"); // Corrected import
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.js")[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Read all models and import them
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    console.log("Importing model file:", file);
    const modelImport = require(path.join(__dirname, file));
    if (typeof modelImport !== "function") {
      console.error(`Error: File "${file}" does NOT export a function`);
      return; // skip this file
    }
    const model = modelImport(sequelize, Sequelize.DataTypes);
    if (!model) {
      console.error(
        `Error: Model returned from file "${file}" is undefined or null`
      );
      return; // skip this file
    }
    if (!model.name) {
      console.error(
        `Error: Model from file "${file}" does not have a 'name' property`
      );
      return; // skip this file
    }
    db[model.name] = model;
  });
// .forEach((file) => {
//   const model = require(path.join(__dirname, file))(
//     sequelize,
//     Sequelize.DataTypes
//   );
//   db[model.name] = model;
// });

// Setup model associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Sync database in development only
if (env === "development") {
  sequelize
    .sync({ alter: true })
    .then(() => {
      console.log("Database synchronized (development mode)");
    })
    .catch((err) => {
      console.error("Failed to synchronize database:", err);
    });
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
