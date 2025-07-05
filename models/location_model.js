"use strict";

const { all } = require("axios");

module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define(
    "Location",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      address: DataTypes.TEXT,

      latitude: DataTypes.DECIMAL(10, 6),
      longitude: DataTypes.DECIMAL(10, 6),

      timestamp: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      accuracy: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      altitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      heading: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      speed: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      tableName: "locations",
      timestamps: true,
      underscored: true,
    }
  );

  Location.associate = (models) => {
    Location.hasOne(models.Branch, {
      foreignKey: "location_id",
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    Location.hasMany(models.Customer, {
      foreignKey: "office_address_id",
    });

    Location.hasMany(models.Customer, {
      foreignKey: "home_address_id",
    });
    // Location.hasMany(models.Table, { foreignKey: "location_id" });
  };

  return Location;
};
