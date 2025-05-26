"use strict";
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
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
    });

    // Permission.belongsToMany(models.User, {
    //   through: models.UserPermission,
    //   foreignKey: "permission_id",
    //   otherKey: "user_id",
    // });
  };

  return Permission;
};
