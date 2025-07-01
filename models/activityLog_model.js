const { DataTypes } = require('sequelize');
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.STRING,
        references: {
          model: "users",
          key: "id",
        },
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Short description of the action (e.g., login, update_user, delete_role)'
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'The type of entity affected (e.g., User, Role, Subscription)'
    },
    entity_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'The ID of the entity affected'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional context or data for the action'
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP address from which the action was triggered'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string of the client'
    }
  }, {
    tableName: 'activity_logs',
    underscored: true,
    timestamps: true
  });

  ActivityLog.associate = (models) => {
    ActivityLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };
  

  return ActivityLog;
};
