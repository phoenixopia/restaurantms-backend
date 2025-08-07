"use strict";
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

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
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      branch_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "branches",
          key: "id",
        },
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

      profile_picture: DataTypes.STRING(2083),

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
        type: DataTypes.ENUM("none", "google", "facebook"),
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
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.UUID,
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
      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      full_name: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.first_name} ${this.last_name}`;
        },
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
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

  User.prototype.getJwtToken = async function () {
    const tokenPayload = {
      id: this.id,
      role_id: this.role_id,
      restaurant_id: this.restaurant_id || null,
      branch_id: this.branch_id || null,
    };
    return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "6h" });
  };

  User.prototype.getResetPasswordToken = async function () {
    const tokenPayload = {
      id: this.id,
      role_id: this.role_id,
    };
    return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "10m" });
  };

  User.prototype.markSuccessfulLogin = async function () {
    this.last_login_at = new Date();
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
      this.locked_until = new Date(Date.now() + lockMinutes * 60 * 1000); // lock for 5 min
    }

    await this.save({ silent: true });
  };

  User.prototype.isLocked = function () {
    if (!this.locked_until) return false;
    return new Date() < this.locked_until;
  };

  User.associate = (models) => {
    // to get created users
    User.hasMany(models.User, {
      foreignKey: "created_by",
      as: "createdUsers",
    });
    // to get the restaurant admins who created the users
    User.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    // staffs belongs to a branch
    User.belongsTo(models.Branch, {
      foreignKey: "branch_id",
      as: "assigned_branch",
    });

    // manager of a branch
    User.hasOne(models.Branch, {
      foreignKey: "manager_id",
    });

    User.belongsTo(models.Role, {
      foreignKey: "role_id",
    });

    User.hasMany(models.UserPermission, {
      foreignKey: "user_id",
    });

    User.belongsToMany(models.Permission, {
      through: models.UserPermission,
      foreignKey: "user_id",
      otherKey: "permission_id",
    });

    User.hasMany(models.ActivityLog, {
      foreignKey: "user_id",
    });
    User.hasMany(models.SupportTicket, {
      foreignKey: "user_id",
    });
    User.hasMany(models.Notification, {
      foreignKey: "user_id",
    });
    User.hasMany(models.Video, {
      foreignKey: "uploaded_by",
    });

    User.hasMany(models.UploadedFile, {
      foreignKey: "user_id",
    });
  };
  return User;
};
