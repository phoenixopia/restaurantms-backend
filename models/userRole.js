"use strict";
module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define(
    "UserRole",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "roles",
          key: "id",
        },
      },
      restaurant_id: {
        type: DataTypes.UUID,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
    },
    {
      tableName: "user_roles",
      timestamps: true,
      underscored: true,
    }
  );

  // UserRole.associate = (models) => {
  //   UserRole.belongsTo(models.User, { foreignKey: "user_id" });
  //   UserRole.belongsTo(models.Role, { foreignKey: "role_id" });
  //   UserRole.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });
  // };

  return UserRole;
};
