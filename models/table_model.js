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
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      branch_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "branches",
          key: "id",
        },
      },
      table_number: DataTypes.STRING(20),

      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "tables",
      timestamps: true,
      underscored: true,
    }
  );

  Table.associate = (models) => {
    Table.hasMany(models.Order, { foreignKey: "table_id" });

    Table.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });

    Table.belongsTo(models.Branch, { foreignKey: "branch_id" });

    Table.hasMany(models.Reservation, {
      foreignKey: "table_id",
    });
  };

  return Table;
};
