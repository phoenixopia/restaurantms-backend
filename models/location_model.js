"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define(
    "Location",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      name: DataTypes.STRING(255),
      latitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Timestamp of the location reading',
      },
      accuracy: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Accuracy in meters',
      },
      altitude: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Altitude in meters above sea level',
      },
      heading: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Heading in degrees (0–360)',
      },
      speed: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Speed in meters per second',
      }
    },
    {
      tableName: "locations",
      timestamps: true,
      underscored: true,
    }
  );

  Location.associate = (models) => {
    Location.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant", onDelete: 'CASCADE' },);
    Location.hasMany(models.Table, { foreignKey: "location_id", as: "tables" });
  };

  return Location;
};
