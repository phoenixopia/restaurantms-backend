"use strict";
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: DataTypes.ENUM(
        "super_admin",
        "restaurant_admin",
        "customer",
        "staff"
      ), // we can remove the staff role.... i added in case of future use
      description: DataTypes.TEXT,
    },
    {
      tableName: "roles",
      timestamps: true,
      underscored: true,
    }
  );

  Role.associate = (models) => {
    Role.belongsToMany(models.User, {
      through: models.UserRole,
      foreignKey: "role_id",
    });
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: "role_id",
    });
  };

  return Role;
};
