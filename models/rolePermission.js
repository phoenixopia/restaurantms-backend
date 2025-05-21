"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define("RolePermission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "roles",
          key: "id",
        },
      },
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "permissions",
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
      granted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      tableName: "role_permissions",
      timestamps: true,
      underscored: true,
    }
  );

  return RolePermission;
};
