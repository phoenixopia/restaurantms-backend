"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const UserPermission = sequelize.define(
    "UserPermission",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
    },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      permission_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "permissions",
          key: "id",
        },
      },
      restaurant_id: {
        type: DataTypes.STRING,
        references: {
          model: "restaurants",
          key: "id",
        },
        onDelete: 'CASCADE'
      },
      granted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      tableName: "user_permissions",
      timestamps: true,
      underscored: true,
    }
  );

  // UserPermission.associate = (models) => {
  //   UserPermission.belongsTo(models.User, { foreignKey: "user_id" });
  //   UserPermission.belongsTo(models.Permission, {
  //     foreignKey: "permission_id",
  //   });
  //   UserPermission.belongsTo(models.Restaurant, {
  //     foreignKey: "restaurant_id", onDelete: 'CASCADE',
  //   });
  // };

  return UserPermission;
};
