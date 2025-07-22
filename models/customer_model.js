"use strict";
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      two_factor_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      office_address_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "locations",
          key: "id",
        },
      },
      home_address_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "locations",
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
      dob: DataTypes.DATE,
      notes: DataTypes.TEXT,
      visit_count: DataTypes.INTEGER,
      last_visit_at: DataTypes.DATE, // order date

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

      full_name: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.first_name} ${this.last_name}`;
        },
      },
    },
    {
      tableName: "customers",
      timestamps: true,
      underscored: true,
    }
  );

  const hashPassword = async (customer) => {
    if (customer.password) {
      try {
        const salt = await bcryptjs.genSalt(10);
        customer.password = await bcryptjs.hash(customer.password, salt);
      } catch (error) {
        throw new Error("Error hashing password");
      }
    }
  };

  Customer.beforeSave(async (customer) => {
    if (customer.changed("password")) {
      await hashPassword(customer);
    }
  });

  Customer.prototype.comparePassword = async function (candidatePassword) {
    return await bcryptjs.compare(candidatePassword, this.password);
  };

  Customer.prototype.getJwtToken = async function () {
    const tokenPayload = {
      id: this.id,
      role_id: this.role_id,
    };
    return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "6h" });
  };

  Customer.prototype.getResetPasswordToken = async function () {
    const tokenPayload = {
      id: this.id,
      role_id: this.role_id,
    };
    return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "10m" });
  };

  Customer.prototype.markSuccessfulLogin = async function () {
    this.last_login_at = new Date();
    this.login_count += 1;
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
  };

  Customer.prototype.markFailedLoginAttempt = async function (
    lockThreshold = 5,
    lockMinutes = 5
  ) {
    this.failed_login_attempts += 1;

    if (this.failed_login_attempts >= lockThreshold) {
      this.locked_until = new Date(Date.now() + lockMinutes * 60 * 1000); // Lock for 5 min
    }

    await this.save({ silent: true });
  };

  Customer.prototype.isLocked = function () {
    if (!this.locked_until) return false;
    return new Date() < this.locked_until;
  };

  Customer.associate = (models) => {
    Customer.belongsTo(models.Location, {
      foreignKey: "office_address_id",
    });

    Customer.belongsTo(models.Location, {
      foreignKey: "home_address_id",
    });

    Customer.belongsTo(models.Role, {
      foreignKey: "role_id",
    });

    Customer.hasMany(models.LoyaltyPoint, {
      foreignKey: "customer_id",
    });

    Customer.hasMany(models.ActivityLog, {
      foreignKey: "customer_id",
    });

    Customer.hasOne(models.TwoFA, {
      foreignKey: "customer_id",
      as: "twoFA",
    });

    Customer.hasMany(models.Order, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.Reservation, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.Review, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.Notification, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.Payment, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.VideoView, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.VideoComment, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.VideoFavorite, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.VideoLike, {
      foreignKey: "customer_id",
    });
    Customer.hasMany(models.RestaurantFollower, {
      foreignKey: "customer_id",
    });

    Customer.belongsToMany(models.Restaurant, {
      through: models.RestaurantFollower,
      foreignKey: "customer_id",
      otherKey: "restaurant_id",
    });
  };

  return Customer;
};
