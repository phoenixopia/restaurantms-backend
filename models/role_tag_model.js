"use strict";
module.exports = (sequelize, DataTypes) => {
  const RoleTag = sequelize.define(
    "RoleTag",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.ENUM(
          "super_admin",
          "restaurant_admin",
          "staff",
          "customer",
          "other"
        ),
        allowNull: false,
      },
      description: DataTypes.STRING(255),
    },
    { tableName: "role_tags", timestamps: true, underscored: true }
  );

  RoleTag.associate = (models) => {
    RoleTag.hasMany(models.User, { foreignKey: "role_tag_id" });
    RoleTag.hasMany(models.Role, { foreignKey: "role_tag_id" });
    RoleTag.hasMany(models.Customer, { foreignKey: "role_tag_id" });
  };

  return RoleTag;
};
