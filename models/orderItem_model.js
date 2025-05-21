"use strict";
module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    "OrderItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      // order_id: {
      //   type: DataTypes.UUID,
      //   allowNull: false,
      //   references: {
      //     model: "orders",
      //     key: "id",
      //   },
      // },
      menu_item_id: {
        type: DataTypes.UUID,
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
    OrderItem.belongsToMany(models.Order, {
      through: "OrderItemOrder",
      foreignKey: "order_item_id",
      otherKey: "order_id",
    });
    OrderItem.belongsToMany(models.MenuItem, { foreignKey: "menu_item_id" });
  };

  return OrderItem;
};
