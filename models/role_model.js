"use strict";

const { getGeneratedId } = require("../utils/idGenerator");

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
        //   type: DataTypes.ENUM(
        //   "super_admin",
        //   "admin",
        //   "customer",
        //   "staff"
        // ), // we can remove the staff role.... i added in case of future use
        unique: true,
        description: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active"
      }
    },
    {
      tableName: "roles",
      timestamps: true,
      underscored: true,
    }
  );

  Role.associate = (models) => {
    // Role.belongsToMany(models.User, {
    //   through: models.UserRole,
    //   foreignKey: "role_id",
    //   as: "users",
    // });
    Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: "role_id",
      as: "permissions",
    });
  };

  return Role;
};
