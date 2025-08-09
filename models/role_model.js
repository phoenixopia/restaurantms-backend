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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role_tag_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "role_tags",
          key: "id",
        },
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      description: {
        type: DataTypes.STRING(255),
      },

      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
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

    Role.belongsTo(models.RoleTag, {
      foreignKey: "role_tag_id",
    });

    Role.hasMany(models.Customer, {
      foreignKey: "role_id",
      onUpdate: "CASCADE",
    });
  };

  return Role;
};
