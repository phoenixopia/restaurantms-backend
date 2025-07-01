"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const LoyaltyPoint = sequelize.define(
    "LoyaltyPoint",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      customer_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      points: DataTypes.INTEGER,
    },
    {
      tableName: "loyalty_points",
      timestamps: true,
      underscored: true,
    }
  );

  LoyaltyPoint.associate = (models) => {
    LoyaltyPoint.belongsTo(models.User, { foreignKey: "customer_id", as: "customer" });
  };

  return LoyaltyPoint;
};
