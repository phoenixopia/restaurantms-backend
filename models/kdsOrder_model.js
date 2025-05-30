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
      order_id: {
        type: DataTypes.UUID,
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
