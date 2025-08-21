"use strict";

module.exports = (sequelize, DataTypes) => {
  const InventoryTransaction = sequelize.define(
    "InventoryTransaction",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      inventory_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("in", "out", "wastage"),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING,
      },
    },
    { tableName: "inventory_transactions", underscored: true, timestamps: true }
  );

  InventoryTransaction.associate = (models) => {
    InventoryTransaction.belongsTo(models.Inventory, {
      foreignKey: "inventory_id",
      as: "inventory",
    });
  };

  return InventoryTransaction;
};
