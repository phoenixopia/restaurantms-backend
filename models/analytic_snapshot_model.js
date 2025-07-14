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
      snapshot_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      total_orders: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      total_sales: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      total_customers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      total_items_sold: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      reservation_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      avg_order_value: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      top_item_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "menu_items",
          key: "id",
        },
      },
      payment_method_breakdown: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
    },
    {
      tableName: "analytics_snapshots",
      timestamps: true,
      underscored: true,
    }
  );

  AnalyticsSnapshot.associate = (models) => {
    AnalyticsSnapshot.belongsTo(models.MenuItem, {
      foreignKey: "top_item_id",
    });
    AnalyticsSnapshot.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
  };

  return AnalyticsSnapshot;
};
