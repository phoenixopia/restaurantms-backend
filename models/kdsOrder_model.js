"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const KdsOrder = sequelize.define(
    "KdsOrder",
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
      status: DataTypes.ENUM("Pending", "Preparing", "Ready", "Served"),
    },
    {
      tableName: "kds_orders",
      timestamps: true,
      underscored: true,
    }
  );

  KdsOrder.associate = (models) => {
    KdsOrder.belongsTo(models.Order, { foreignKey: "order_id", as: "order" });
  };

  return KdsOrder;
};
