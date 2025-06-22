"use strict";
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const { where } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
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
        unique: true,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        unique: true,
      },
      password: {
        type: DataTypes.TEXT,
        validate: {
          len: [6, 100],
        },
      },
      address: DataTypes.STRING(20),
      profile_picture: DataTypes.TEXT,
      confirmation_code: {
        type: DataTypes.STRING(6),
        allowNull: true,
      },
      confirmation_code_expires: {
        type: DataTypes.DATE,
        allowNull: true,
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
        type: DataTypes.ENUM(
          "web",
          "android",
          "ios",
          "tablet",
          "pos-terminal",
          "unknown"
        ),
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
      role_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "roles",
          key: "id",
        },
      },
    },
    {
      tableName: "users",
      paranoid: true,
      timestamps: true,
      underscored: true,

      getterMethods: {
        full_name() {
          return `${this.first_name} ${this.last_name}`;
        },
      },
    }
  );

  const hashPassword = async (user) => {
    if (user.password) {
      try {
        const salt = await bcryptjs.genSalt(10);
        user.password = await bcryptjs.hash(user.password, salt);
      } catch (error) {
        throw new Error("Error hashing password");
      }
    }
  };

  User.beforeSave(async (user) => {
    if (user.changed("password")) {
      await hashPassword(user);
    }
  });

  User.prototype.comparePassword = async function (candidatePassword) {
    return await bcryptjs.compare(candidatePassword, this.password);
  };

  User.prototype._buildTokenPayload = async function () {
    const tokenPayload = {
      id: this.id,
      role_id: this.role_id,
    };

    try {
      if (this.created_by) {
        const restaurant = await sequelize.models.Restaurant.findOne({
          where: { created_by: this.created_by },
        });
        if (restaurant) {
          tokenPayload.restaurant_id = restaurant.id;
        }
      } else {
        const role = await this.getRole();
        if (role && role.name === "restaurant_admin") {
          const restaurant = await sequelize.models.Restaurant.findOne({
            where: { created_by: this.id },
          });
          if (restaurant) {
            tokenPayload.restaurant_id = restaurant.id;
          }
        }
      }
    } catch (error) {
      console.error("Error adding restaurant_id to token payload:", error);
    }

    return tokenPayload;
  };

  User.prototype.getJwtToken = async function () {
    const tokenPayload = await this._buildTokenPayload();
    return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "6h" });
  };

  User.prototype.getResetPasswordToken = async function () {
    const tokenPayload = await this._buildTokenPayload();
    return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "10m" });
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
    lockMinutes = 5
  ) {
    this.failed_login_attempts += 1;

    if (this.failed_login_attempts >= lockThreshold) {
      this.locked_until = new Date(Date.now() + lockMinutes * 60 * 1000); // Lock for 5 min
    }

    await this.save({ silent: true });
  };

  User.prototype.isLocked = function () {
    if (!this.locked_until) return false;
    return new Date() < this.locked_until;
  };

  User.associate = (models) => {
    // to get created users by restaurant admin
    User.hasMany(models.User, {
      foreignKey: "created_by",
      as: "createdUsers",
    });
    // to get the restaurant admins who created the users
    User.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    User.hasOne(models.Restaurant, {
      foreignKey: "created_by",
    });
    User.belongsTo(models.Role, {
      foreignKey: "role_id",
    });
    User.belongsToMany(models.Permission, {
      through: models.UserPermission,
      foreignKey: "user_id",
      otherKey: "permission_id",
    });
    User.hasOne(models.TwoFA, {
      foreignKey: "user_id",
      as: "twoFA",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    User.hasMany(models.Branch, {
      foreignKey: "user_id",
      as: "manager",
    });
    User.belongsToMany(models.Restaurant, {
      through: "RestaurantUser",
      foreignKey: "user_id",
      otherKey: "restaurant_id",
    });
  };
  return User;
};
