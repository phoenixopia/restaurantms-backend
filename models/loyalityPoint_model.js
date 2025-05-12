"use strict";
module.exports = (sequelize, DataTypes) => {
  const LoyaltyPoint = sequelize.define(
    "LoyaltyPoint",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customer_id: {
        type: DataTypes.UUID,
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
    LoyaltyPoint.belongsTo(models.User, { foreignKey: "customer_id" });
  };

  return LoyaltyPoint;
};
