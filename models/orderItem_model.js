"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    "OrderItem",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      menu_item_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "menu_items",
          key: "id",
        },
      },
      quantity: DataTypes.INTEGER,
      unit_price: DataTypes.DECIMAL(10, 2),
    },
    {
      tableName: "order_items",
      timestamps: true,
      underscored: true,
    }
  );

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: "order_id", as: "order" });
    OrderItem.belongsTo(models.MenuItem, { foreignKey: "menu_item_id", as: "menuItem" });
  };

  return OrderItem;
};
