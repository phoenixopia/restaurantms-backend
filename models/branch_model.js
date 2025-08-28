"use strict";
const moment = require("moment-timezone");
module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define(
    "Branch",
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
      location_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "locations",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      manager_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "under_maintenance"),
        defaultValue: "active",

        allowNull: false,
      },
      main_branch: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      opening_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      closing_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      tableName: "branches",
      timestamps: true,
      underscored: true,
    }
  );

  Branch.prototype.isCurrentlyOpen = function () {
    const now = moment().tz("Africa/Addis_Ababa");
    const currentTime = now.format("hh:mm A");

    const openingTime = moment(this.opening_time, "hh:mm A");
    const closingTime = moment(this.closing_time, "hh:mm A");
    const currentMoment = moment(currentTime, "hh:mm A");

    if (closingTime.isBefore(openingTime)) {
      return (
        currentMoment.isSameOrAfter(openingTime) ||
        currentMoment.isBefore(closingTime)
      );
    }

    return (
      currentMoment.isSameOrAfter(openingTime) &&
      currentMoment.isBefore(closingTime)
    );
  };

  Branch.paginate = async function ({
    page = 1,
    limit = 10,
    where = {},
    order = [["created_at", "DESC"]],
    include = [],
  } = {}) {
    const offset = (page - 1) * limit;

    const { count, rows } = await this.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include,
    });

    const totalPages = Math.ceil(count / limit);

    return {
      data: rows,
      meta: {
        totalItems: count,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  };

  Branch.associate = (models) => {
    // Branch.hasMany(models.ContactInfo, {
    //   foreignKey: "module_id",
    //   constraints: false,
    //   scope: {
    //     module_type: "branch",
    //   },
    //   onUpdate: "CASCADE",
    //   onDelete: "CASCADE",
    // });

    Branch.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
    });
    //===============
    Branch.hasOne(models.Inventory, {
      foreignKey: "branch_id",
    });

    Branch.hasMany(models.RestaurantBankAccount, {
      foreignKey: "branch_id",
      onDelete: "CASCADE",
    });

    Branch.belongsTo(models.Location, { foreignKey: "location_id" });

    Branch.hasMany(models.User, {
      foreignKey: "branch_id",
      as: "assigned_users",
    });

    Branch.belongsTo(models.Location, {
      foreignKey: "location_id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    Branch.belongsTo(models.User, {
      foreignKey: "manager_id",
      as: "manager",
    });

    Branch.hasMany(models.MenuCategory, { foreignKey: "branch_id" });

    Branch.hasMany(models.Order, {
      foreignKey: "branch_id",
    });

    Branch.hasMany(models.Table, {
      foreignKey: "branch_id",
    });
    Branch.hasMany(models.Reservation, {
      foreignKey: "branch_id",
    });
    Branch.hasMany(models.KdsOrder, {
      foreignKey: "branch_id",
    });
    Branch.hasMany(models.Promotion, {
      foreignKey: "branch_id",
    });
    Branch.hasMany(models.Video, {
      foreignKey: "branch_id",
    });

    Branch.hasMany(models.SupportTicket, {
      foreignKey: "branch_id",
    });
  };

  return Branch;
};
