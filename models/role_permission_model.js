"use strict";
module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      role_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: "roles", key: "id" },
      },
      permission_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        references: { model: "permissions", key: "id" },
      },
    },
    { tableName: "role_permissions", timestamps: true, underscored: true }
  );

  return RolePermission;
};
