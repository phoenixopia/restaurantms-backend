"use strict";
module.exports = (sequelize, DataTypes) => {
  const AnalyticsSnapshot = sequelize.define(
    "AnalyticsSnapshot",
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
      snapshot_date: DataTypes.DATEONLY,
      total_orders: DataTypes.INTEGER,
      total_sales: DataTypes.DECIMAL(10, 2),
      total_customers: DataTypes.INTEGER,
      total_items_sold: DataTypes.INTEGER,
      reservation_count: DataTypes.INTEGER,
      avg_order_value: DataTypes.DECIMAL(10, 2),
      top_item_id: {
        type: DataTypes.UUID,
        references: {
          model: "menu_items",
          key: "id",
        },
      },
      payment_method_breakdown: DataTypes.JSONB,
    },
    {
      tableName: "analytics_snapshots",
      timestamps: true,
      underscored: true,
    }
  );

  AnalyticsSnapshot.associate = (models) => {
    AnalyticsSnapshot.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id", as: "restaurant"
    });
    AnalyticsSnapshot.belongsTo(models.MenuItem, { foreignKey: "top_item_id", as: "topItem" });
  };

  return AnalyticsSnapshot;
};
