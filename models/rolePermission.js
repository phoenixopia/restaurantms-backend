"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define("RolePermission",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      role_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "roles",
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
        onDelete: 'CASCADE',
      },
      // restaurant_id: {
      //   type: DataTypes.STRING,
      //   references: {
      //     model: "restaurants",
      //     key: "id",
      //   },
      //   onDelete: 'CASCADE'
      // },
      granted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
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
