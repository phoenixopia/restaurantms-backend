"use strict";

module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define(
    "Review",
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
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
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

      comment: {
        type: DataTypes.TEXT,
      },

      rating: {
        type: DataTypes.ENUM("1", "2", "3", "4", "5"),
      },
    },
    {
      tableName: "reviews",
      timestamps: true,
      underscored: true,
    }
  );

  Review.associate = (models) => {
    Review.belongsTo(models.Customer, {
      foreignKey: "customer_id",
    });
    Review.belongsTo(models.Order, {
      foreignKey: "order_id",
    });
    Review.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
  };

  return Review;
};
