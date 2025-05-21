"use strict";
const { RestaurantUser } = require("../models");
const jwt = require("jsonwebtoken");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      first_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: "Please enter a valid email address.",
          },
        },
        set(value) {
          if (value) {
            this.setDataValue("email", value.toLowerCase());
          }
        },
      },
      phone_number: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true,
        validate: {
          is: {
            args: /^\+?[1-9]\d{1,14}$/,
            msg: "Please enter a valid phone number.",
          },
        },
      },
      password_hash: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: DataTypes.STRING(20),
      profile_picture: DataTypes.TEXT,
      confirmation_code: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: () =>
          Math.floor(100000 + Math.random() * 900000).toString(),
      },
      isConfirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      phone_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      social_provider: {
        type: DataTypes.ENUM(
          "none",
          "google",
          "facebook",
          "apple",
          "twitter",
          "github",
          "linkedin"
        ),
        allowNull: true,
        defaultValue: "none",
      },
      social_provider_id: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_login_ip: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      login_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      language: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "en",
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "UTC",
      },
      device_type: {
        type: DataTypes.ENUM("web", "android", "ios", "tablet", "pos-terminal"),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      failed_login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      paranoid: true,
      timestamps: true,
      underscored: true,

      defaultScope: {
        attributes: {
          exclude: ["password_hash", "confirmation_code"],
        },
      },
    }
  );

  User.prototype.getJwtToken = async function () {
    let restaurantId = null;
    const RestaurantUser = this.sequelize.models.RestaurantUser;

    const link = await RestaurantUser.findOne({
      where: { user_id: this.id },
    });
    if (link) {
      restaurantId = link.restaurant_id;
    }
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
        role_id: this.role_id || null,
        restaurant_id: restaurantId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );
  };

  User.prototype.getResetPasswordToken = async function () {
    let restaurantId = null;

    const link = await RestaurantUser.findOne({
      where: { user_id: this.id },
    });
    if (link) {
      restaurantId = link.restaurant_id;
    }
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
        role_id: this.role_id || null,
        restaurant_id: restaurantId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );
  };

  User.prototype.markSuccessfulLogin = async function (ipAddress, deviceType) {
    this.last_login_at = new Date();
    this.last_login_ip = ipAddress;
    this.device_type = deviceType || this.device_type;
    this.login_count += 1;
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
  };

  User.prototype.markFailedLoginAttempt = async function (
    lockThreshold = 5,
    lockMinutes = 15
  ) {
    this.failed_login_attempts += 1;

    if (this.failed_login_attempts >= lockThreshold) {
      this.locked_until = new Date(Date.now() + lockMinutes * 60 * 1000); // Lock for 15 min
    }

    await this.save({ silent: true });
  };

  User.prototype.isLocked = function () {
    if (!this.locked_until) return false;
    return new Date() < this.locked_until;
  };

  User.associate = (models) => {
    User.belongsToMany(models.Restaurant, {
      through: "RestaurantUser",
      foreignKey: "user_id",
      otherKey: "restaurant_id",
    });
    User.hasOne(models.TwoFA, {
      foreignKey: "user_id",
      as: "twoFA",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    User.hasMany(models.Branch, {
      foreignKey: "manager_id",
    });
    User.belongsTo(models.Role, {
      foreignKey: "role_id",
      onDelete: "SET NULL",
    });
    User.hasMany(models.Order, { foreignKey: "user_id" });
    User.hasMany(models.Feedback, { foreignKey: "user_id" });
    User.hasMany(models.Reservation, { foreignKey: "customer_id" });
    User.hasMany(models.StaffSchedule, { foreignKey: "staff_id" });
    User.hasMany(models.SupportTicket, { foreignKey: "user_id" });
    User.hasMany(models.SupportTicket, { foreignKey: "assigned_to" });
    User.hasOne(models.LoyaltyPoint, { foreignKey: "customer_id" });
  };

  return User;
};
