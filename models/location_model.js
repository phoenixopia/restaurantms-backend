"use strict";
module.exports = (sequelize, DataTypes) => {
  const Location = sequelize.define(
    "Location",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: DataTypes.STRING(255),
      address: DataTypes.TEXT,
      latitude: DataTypes.DECIMAL(10, 6),
      longitude: DataTypes.DECIMAL(10, 6),
    },
    {
      tableName: "locations",
      timestamps: true,
      underscored: true,
    }
  );

  Location.associate = (models) => {
    Location.hasOne(models.Restaurant, {
      foreignKey: "location_id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    Location.hasOne(models.Branch, {
      foreignKey: "location_id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    // Location.hasMany(models.Table, { foreignKey: "location_id" });
  };

  return Location;
};
