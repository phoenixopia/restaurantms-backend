"use strict";

module.exports = (sequelize, DataTypes) => {
  const VideoView = sequelize.define(
    "VideoView",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      video_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "videos",
          key: "id",
        },
      },

      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
      },
    },
    {
      tableName: "video_views",
      timestamps: true,
      updatedAt: false,
      createdAt: "created_at",
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["video_id", "customer_id"],
        },
      ],
    }
  );

  VideoView.associate = (models) => {
    VideoView.belongsTo(models.Video, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    VideoView.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return VideoView;
};
