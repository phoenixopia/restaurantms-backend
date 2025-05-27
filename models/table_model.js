"use strict";
module.exports = (sequelize, DataTypes) => {
  const Table = sequelize.define(
    "Table",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      location_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "locations",
          key: "id",
        },
      },
      table_number: DataTypes.STRING(20),
      capacity: DataTypes.INTEGER,
      is_active: DataTypes.BOOLEAN,
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
