module.exports = (sequelize, DataTypes) => {
  const Promotion = sequelize.define(
    "Promotion",
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
      branch_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "branches",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      discount_type: {
        type: DataTypes.ENUM("percentage", "fixed", "bogo"),
        allowNull: false,
      },
      discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      applicable_to: {
        type: DataTypes.ENUM("all", "category", "item"),
        allowNull: false,
      },
      category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "menu_categories",
          key: "id",
        },
      },
      menu_item_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "menu_items",
          key: "id",
        },
      },
      start_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      end_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      valid_days: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "promotions",
      timestamps: true,
      underscored: true,
    }
  );

  Promotion.associate = (models) => {
    Promotion.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });

    Promotion.belongsTo(models.Branch, {
      foreignKey: "branch_id",
    });

    Promotion.belongsTo(models.MenuCategory, {
      foreignKey: "category_id",
    });

    Promotion.belongsTo(models.MenuItem, {
      foreignKey: "menu_item_id",
    });

    // Promotion.hasMany(models.Payment, {
    //   foreignKey: "promotion_id",
    // });
  };

  return Promotion;
};
