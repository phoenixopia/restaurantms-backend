"use strict";
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      name: DataTypes.STRING(255),
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },
      password_hash: DataTypes.TEXT,
      phone_number: DataTypes.STRING(20),
      address: DataTypes.STRING(20),
      profile_picture: DataTypes.TEXT, // in the case of file use byte
      social_provider: DataTypes.ENUM("Google", "Apple", "Facebook", "None"),
      social_id: DataTypes.STRING(255),
      two_factor_enabled: DataTypes.BOOLEAN,
      last_login_at: DataTypes.DATE,
      is_active: DataTypes.BOOLEAN, // for who??
      is_staff: DataTypes.BOOLEAN,
      is_superuser: DataTypes.BOOLEAN,
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });
    User.hasMany(models.Order, { foreignKey: "user_id" });
    User.hasMany(models.Feedback, { foreignKey: "user_id" });
    User.hasMany(models.Reservation, { foreignKey: "customer_id" });
    User.hasMany(models.StaffSchedule, { foreignKey: "staff_id" });
    User.hasMany(models.SupportTicket, { foreignKey: "user_id" });
    User.hasMany(models.SupportTicket, { foreignKey: "assigned_to" });
    User.hasOne(models.LoyaltyPoint, { foreignKey: "customer_id" });

    User.belongsToMany(models.Role, {
      through: models.UserRole,
      foreignKey: "user_id",
    });
    User.belongsToMany(models.Permission, {
      through: models.UserPermission,
      foreignKey: "user_id",
      otherKey: "permission_id",
    });
  };

  return User;
};
