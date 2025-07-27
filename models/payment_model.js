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
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      tip_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      payment_method: {
        type: DataTypes.ENUM("cash", "telebirr", "CBE", "arifpay", "other"),
        allowNull: false,
      },
      transaction_id: {
        type: DataTypes.STRING,
      },
      session_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // promotion_id: {
      //   type: DataTypes.UUID,
      //   allowNull: true,
      //   references: {
      //     model: "promotions",
      //     key: "id",
      //   },
      // },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "completed",
          "failed",
          "cancelled",
          "refunded"
        ),
        defaultValue: "pending",
      },
      payment_date: {
        type: DataTypes.DATE,
      },
      refund_reason: {
        type: DataTypes.TEXT,
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

    // Payment.belongsTo(models.Promotion, {
    //   foreignKey: "promotion_id",
    // });
  };

  return Payment;
};
