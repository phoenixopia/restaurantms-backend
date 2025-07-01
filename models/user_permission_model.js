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
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "permissions",
          key: "id",
        },
      },
      scope_type: {
        type: DataTypes.ENUM("restaurant", "branch"),
        allowNull: false,
      },
      scope_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      granted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      granted_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
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
  };

  return UserPermission;
};
