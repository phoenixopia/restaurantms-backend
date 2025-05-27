"use strict";

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const { getGeneratedId } = require('../utils/idGenerator');

// let generateId;
// (async () => {
//   const { customAlphabet } = await import('nanoid');
//   generateId = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 21);
// })();


module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("User",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            role_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "roles",
                    key: "id",
                },
            },
            first_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            last_name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true,
                },
                set(value) {
                    if (value) {
                    this.setDataValue('email', value.toLowerCase());
                    }
                },
            },
            phone_number: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    is: /^\+?[1-9]\d{1,14}$/ // E.164 format validation
                }
            },
            password: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: [8, 100],
                },
            },         
            confirmation_code: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: () => Math.floor(100000 + Math.random() * 900000).toString(),
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
            reset_token: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: null,
            },
            profile_picture: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: 'https://res.cloudinary.com/dqj8v1x4e/image/upload/v1695221232/restaurant/default-user.png',
            },
            provider: {
                type: DataTypes.ENUM('local','google', 'facebook', 'apple', 'twitter', 'github', 'linkedin'),
                allowNull: true,
                defaultValue: 'local',
            },
            provider_id: {
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
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
            language: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: 'en',
            },
            timezone: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: 'UTC',
            },
            device_type: {
                type: DataTypes.ENUM('web', 'android', 'ios', 'tablet', 'pos-terminal', 'test'),
                allowNull: true,
                defaultValue: 'test',
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
            timestamps: true,
            //   underscored: true,
            getterMethods: {
                full_name() {
                return `${this.first_name} ${this.last_name}`;
                }
            },
                
            defaultScope: {
                attributes: { exclude: ['password', 'reset_token', 'confirmation_code'] }
            },  
        }
    );

    // === Password Hash Hooks ===
    const hashPassword = async (user, password) => {
        if (user.password) {
            try {
                const salt = await bcryptjs.genSalt(10);
                user.password = await bcryptjs.hash(user.password, salt);
            } catch (error) {
                throw new Error('Error hashing password.');
            }
        } else if(password) {
            const salt = await bcryptjs.genSalt(10);
            password = await bcryptjs.hash(password, salt);
        }
    };

    User.beforeCreate(hashPassword);
    User.beforeSave(async (user) => {
        if (user.changed('password')) {
            await hashPassword(user);
        }
    });     

    // === Instance Methods ===
    User.prototype.comparePassword = async function (enteredPassword) {
        return await bcryptjs.compare(enteredPassword, this.password);
    };

    User.prototype.getJwtToken = function () {
        return jwt.sign(
            { id: this.id, role_id: this.role_id }, process.env.JWT_SECRET, { expiresIn: '6h' }
        );
    };

    User.prototype.getResetPasswordToken = function () {
        return jwt.sign(
            { id: this.id, role_id: this.role_id }, process.env.JWT_SECRET, { expiresIn: '10m' }
        );
    };

    // Mark successful login
    User.prototype.markSuccessfulLogin = async function (ipAddress, deviceType) {
        this.last_login_at = new Date();
        this.last_login_ip = ipAddress;
        this.device_type = deviceType || this.device_type;
        this.login_count += 1;
        this.failed_login_attempts = 0;
        this.locked_until = null;
        await this.save();
        // await this.save({ silent: true }); // silent avoids triggering updated_by / audit hooks
    };

    // Mark failed login and possibly lock account
    User.prototype.markFailedLoginAttempt = async function (lockThreshold = 5, lockMinutes = 15) {
        this.failed_login_attempts += 1;

        if (this.failed_login_attempts >= lockThreshold) {
            this.locked_until = new Date(Date.now() + lockMinutes * 60 * 1000); // Lock for 15 min
        }

        await this.save({ silent: true });
    };

    // Check if account is locked
    User.prototype.isLocked = function () {
        if (!this.locked_until) return false;
        return new Date() < this.locked_until;
    };

    User.associate = models => {
        User.belongsTo(models.Role, { foreignKey: "role_id", as: "roles" });
        // User.belongsTo(models.Restaurant, { foreignKey: "restaurant_id",});
        User.belongsToMany(models.Restaurant, {
            through: models.RestaurantUser,
            foreignKey: "user_id",
            as: "restaurants"
        });
        User.hasMany(models.Order, { foreignKey: "user_id", as: "orders" });
        User.hasMany(models.Feedback, { foreignKey: "user_id", as: "feedbacks" });
        User.hasMany(models.Reservation, { foreignKey: "customer_id", as: "reservations" });
        User.hasMany(models.StaffSchedule, { foreignKey: "staff_id", as: "schedules" });
        User.hasMany(models.SupportTicket, { foreignKey: "user_id", as: "support_tickets" });
        User.hasMany(models.SupportTicket, { foreignKey: "assigned_to", as: "assigned_tickets" });
        User.hasOne(models.LoyaltyPoint, { foreignKey: "customer_id", as: "loyalty_points" });
    };

    return User;
};

