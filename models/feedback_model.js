"use strict";
module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define(
    "Feedback",
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
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      user_id: {
        type: DataTypes.UUID,
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
    Feedback.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });
    Feedback.belongsTo(models.Order, { foreignKey: "order_id" });
    Feedback.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return Feedback;
};
