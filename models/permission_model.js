"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT
      },
    },
    {
      tableName: "permissions",
      timestamps: true,
      underscored: true,
    }
  );

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: "permission_id",
      otherKey: "role_id",
      as: "roles",
    });

    // Permission.belongsToMany(models.User, {
    //   through: models.UserPermission,
    //   foreignKey: "permission_id",
    //   otherKey: "user_id",
    //   as: "users",
    // });
  };

  return Permission;
};
