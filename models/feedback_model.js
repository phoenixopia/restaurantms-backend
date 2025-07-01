"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define(
    "Feedback",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
        onDelete: 'CASCADE'
      },
      order_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      rating: DataTypes.INTEGER,
      comment: DataTypes.TEXT,
      response: DataTypes.TEXT,
      status: DataTypes.ENUM("New", "Reviewed", "Resolved"),
    },
    {
      tableName: "feedbacks",
      timestamps: true,
      underscored: true,
    }
  );

  Feedback.associate = (models) => {
    Feedback.belongsTo(models.Restaurant, { foreignKey: "restaurant_id", as: "restaurant" });
    Feedback.belongsTo(models.Order, { foreignKey: "order_id", as: "order" });
    Feedback.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
  };

  return Feedback;
};
