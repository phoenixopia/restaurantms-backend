module.exports = (sequelize, DataTypes) => {
  const UserPermission = sequelize.define(
    "UserPermission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },

      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
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

      granted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      tableName: "user_permissions",
      timestamps: true,
      underscored: true,
    }
  );

  UserPermission.associate = (models) => {
    UserPermission.belongsTo(models.User, { foreignKey: "user_id" });
    UserPermission.belongsTo(models.Permission, {
      foreignKey: "permission_id",
    });
    UserPermission.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
  };

  return UserPermission;
};
