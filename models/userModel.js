const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const { customAlphabet } = require('nanoid');
const { customAlphabet } = require('nanoid/non-secure');


// Generate a unique ID using nanoid
const generateId = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 21);
const ROLES = ['super-admin', 'admin', 'customer', 'user'];
const USER_TYPES = ['system-user', 'end-user'];


module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('Users', {
        id: {
            type: DataTypes.STRING,
            defaultValue: generateId,
            allowNull: false,
            primaryKey: true,
        },
        // tenantId: {
        //     type: DataTypes.STRING,
        //     allowNull: false,
        //     references: {
        //         model: 'Tenants',
        //         key: 'id'
        //     }
        // },
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
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'customer',
            validate: {
                isIn: [ROLES],
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
        two_factor_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        two_factor_secret: {
            type: DataTypes.STRING, // store TOTP secret (e.g., from Google Authenticator)
            allowNull: true,
        },
        two_factor_qrCodeURL: {
            type: DataTypes.STRING,
            allowNull:true
        },
        two_factor_metod:{
            type: DataTypes.ENUM('authenticator', 'sms', 'email'),
            allowNull: true,
            default: 'email'
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
        user_type: {
            type: DataTypes.ENUM(...USER_TYPES),
            allowNull: false,
            defaultValue: 'system-user',
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
            type: DataTypes.ENUM('web', 'android', 'ios', 'tablet', 'pos-terminal'),
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
    },{
        timestamps: true,
        paranoid: true,

        getterMethods: {
            full_name() {
              return `${this.first_name} ${this.last_name}`;
            }
        },
          
        defaultScope: {
            attributes: { exclude: ['password', 'reset_token', 'confirmation_code'] }
        },

        indexes: [
            { fields: ['id']},
            { fields: ['email'] },
            // { fields: ['tenantId'] },
            { fields: ['first_name']},
            { fields: ['last_name']},
            { fields: ['role'] },
        ],         
    });

    // === Password Hash Hooks ===
    const hashPassword = async (user) => {
        if (user.password) {
        try {
            const salt = await bcryptjs.genSalt(10);
            user.password = await bcryptjs.hash(user.password, salt);
        } catch (error) {
            throw new Error('Error hashing password.');
        }
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
            { id: this.id, role: this.role }, process.env.JWT_SECRET, { expiresIn: '6h' }
        );
    };

    User.prototype.getResetPasswordToken = function () {
        return jwt.sign(
            { id: this.id, role: this.role }, process.env.JWT_SECRET, { expiresIn: '10m' }
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

    // User.associate = models => {
    //     User.hasMany(models.Notifications, { foreignKey: 'userId', as: 'notification' });
    // };

    return User;
}