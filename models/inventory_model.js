"use strict";

module.exports = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    "Inventory",
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
      name: { type: DataTypes.STRING, allowNull: false },
      unit: { type: DataTypes.STRING, allowNull: false }, // kg, pcs, etc
      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
      threshold: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
    },
    { tableName: "inventories", underscored: true, timestamps: true }
  );

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.Branch, {
      foreignKey: "branch_id",
    });
    Inventory.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
    Inventory.hasMany(models.InventoryTransaction, {
      foreignKey: "inventory_id",
      as: "transactions",
    });
  };

  return Inventory;
};
