"use strict";

module.exports = (sequelize, DataTypes) => {
  const KdsOrder = sequelize.define(
    "KdsOrder",
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
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM(
          "Pending",
          "InProgress",
          "Preparing",
          "Ready",
          "Served",
          "Cancelled"
        ),
        defaultValue: "Pending",
      },
    },
    {
      tableName: "kds_orders",
      timestamps: true,
      underscored: true,
    }
  );

  KdsOrder.associate = (models) => {
    KdsOrder.belongsTo(models.Order, { foreignKey: "order_id" });
    KdsOrder.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });
    KdsOrder.belongsTo(models.Branch, { foreignKey: "branch_id" });
  };

  return KdsOrder;
};
