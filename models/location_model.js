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
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
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
    Location.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });
    Location.hasMany(models.Table, { foreignKey: "location_id", as: "tables" });
  };

  return Location;
};
