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
        "staff",
        "customer"
      ),
      description: DataTypes.TEXT,
    },
    {
      tableName: "roles",
      timestamps: true,
      underscored: true,
    }
  );

  Role.associate = (models) => {
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: "role_id",
      otherKey: "permission_id",
    });
    Role.hasMany(models.User, {
      foreignKey: "role_id",
      onUpdate: "CASCADE",
    });
  };

  return Role;
};
