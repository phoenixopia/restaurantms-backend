"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Table = sequelize.define(
    "Table",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      location_id: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: "locations",
          key: "id",
        },
      },
      table_number: DataTypes.STRING(20),
      capacity: DataTypes.INTEGER,
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
    },
    {
      tableName: "tables",
      timestamps: true,
      underscored: true,
    }
  );

  Table.associate = (models) => {
    Table.belongsTo(models.Location, { foreignKey: "location_id", as: "location" });
    Table.hasMany(models.Order, { foreignKey: "table_id", as: "orders" });
    Table.hasMany(models.Reservation, { foreignKey: "table_id", as: "reservations" });
  };

  return Table;
};
