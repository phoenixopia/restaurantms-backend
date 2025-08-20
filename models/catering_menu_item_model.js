module.exports = (sequelize, DataTypes) => {
  const CateringMenuItem = sequelize.define(
    "CateringMenuItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      catering_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "caterings",
          key: "id",
        },
      },
      menu_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "menu_items",
          key: "id",
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "catering_menu_items",
      underscored: true,
      timestamps: true,
    }
  );

  CateringMenuItem.associate = (models) => {
    CateringMenuItem.belongsTo(models.Catering, {
      foreignKey: "catering_id",
    });
    CateringMenuItem.belongsTo(models.MenuItem, {
      foreignKey: "menu_item_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return CateringMenuItem;
};
