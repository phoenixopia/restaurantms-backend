module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
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
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "customers",
          key: "id",
        },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      transaction_id: {
        type: DataTypes.STRING,
      },

      status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "cancelled"),
        defaultValue: "pending",
      },
      payment_date: {
        type: DataTypes.DATE,
      },
    },
    {
      tableName: "payments",
      timestamps: true,
      underscored: true,
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
    Payment.belongsTo(models.Order, {
      foreignKey: "order_id",
    });
    Payment.belongsTo(models.Customer, {
      foreignKey: "customer_id",
    });
    Payment.belongsTo(models.User, {
      foreignKey: "user_id",
    });
  };

  return Payment;
};
