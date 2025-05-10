"use strict";
module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, { foreignKey: "role_id" });
    RolePermission.belongsTo(models.Permission, {
      foreignKey: "permission_id",
    });
    RolePermission.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
  };

  return RolePermission;
};
