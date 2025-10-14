const { where, Op } = require("sequelize");
const {
  Restaurant,
  Branch,
  RestaurantBankAccount,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");

const RestaurantBankAccountService = {
  async createBankAccount(req) {
    const {
      bank_name,
      account_number,
      account_name,
      is_default,
      is_active,
      branch_id,
    } = req.body;

    const t = await sequelize.transaction();

    try {
      let targetRestaurantId = null;
      let targetBranchId = branch_id || null;

      if (req.user.branch_id) {
        if (branch_id && branch_id !== req.user.branch_id) {
          throwError(
            "You are not allowed to create bank accounts for another branch",
            403
          );
        }

        targetBranchId = req.user.branch_id;

        const branch = await Branch.findByPk(targetBranchId, {
          attributes: ["restaurant_id"],
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);

        targetRestaurantId = branch.restaurant_id;
      } else if (req.user.restaurant_id) {
        targetRestaurantId = req.user.restaurant_id;

        if (branch_id) {
          const branch = await Branch.findOne({
            where: { id: branch_id, restaurant_id: targetRestaurantId },
            transaction: t,
          });
          if (!branch) throwError("Branch not found for this restaurant", 404);
        }
      } else {
        throwError("No restaurant found", 403);
      }

      const restaurant = await Restaurant.findByPk(targetRestaurantId, {
        transaction: t,
      });
      if (!restaurant) throwError("Restaurant not found", 404);

      const newAccount = await RestaurantBankAccount.create(
        {
          restaurant_id: targetRestaurantId,
          branch_id: targetBranchId,
          bank_name,
          account_number,
          account_name,
          is_default: is_default ?? true,
          is_active: is_active ?? true,
        },
        { transaction: t }
      );

      await t.commit();
      return newAccount;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async updateBankAccount(req) {
    const bankAccountId = req.params.id;
    const {
      bank_name,
      account_number,
      account_name,
      is_default,
      is_active,
      branch_id: requestedBranchId,
    } = req.body;

    const t = await sequelize.transaction();

    try {
      const account = await RestaurantBankAccount.findByPk(bankAccountId, {
        transaction: t,
      });
      if (!account) throwError("Bank account not found", 404);

      if (req.user.branch_id) {
        if (account.branch_id !== req.user.branch_id) {
          throwError(
            "You are not allowed to update bank accounts for another branch",
            403
          );
        }
      } else if (req.user.restaurant_id) {
        if (account.restaurant_id !== req.user.restaurant_id) {
          throwError("Bank account does not belong to your restaurant", 403);
        }

        if (requestedBranchId !== undefined) {
          const branch = await Branch.findOne({
            where: {
              id: requestedBranchId,
              restaurant_id: req.user.restaurant_id,
            },
            transaction: t,
          });
          if (!branch) throwError("Branch not found for this restaurant", 404);
          account.branch_id = requestedBranchId;
        }
      } else {
        throwError("No restaurant or branch context found", 403);
      }

      account.bank_name = bank_name ?? account.bank_name;
      account.account_number = account_number ?? account.account_number;
      account.account_name = account_name ?? account.account_name;
      account.is_default = is_default ?? account.is_default;
      account.is_active = is_active ?? account.is_active;

      if (is_default === false) {
        const where = {
          restaurant_id: account.restaurant_id,
          branch_id: account.branch_id,
          is_default: true,
          id: { [Op.ne]: account.id },
        };

        const otherDefaultAccount = await RestaurantBankAccount.findOne({
          where,
          transaction: t,
        });

        if (!otherDefaultAccount) {
          throwError(
            `You must have at least one default bank account for ${
              account.branch_id ? "this branch" : "the restaurant"
            }.`
          );
        }
      }

      await account.update(
        {
          bank_name: account.bank_name,
          account_number: account.account_number,
          account_name: account.account_name,
          is_default: account.is_default,
          is_active: account.is_active,
          branch_id: account.branch_id,
        },
        { transaction: t }
      );

      await t.commit();
      return account;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getAllBankAccounts(req) {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    let where = {};

    if (req.user.branch_id) {
      where.branch_id = req.user.branch_id;
    } else if (req.user.restaurant_id) {
      where.restaurant_id = req.user.restaurant_id;
    } else {
      throwError("No restaurant or branch context found", 403);
    }

    const { rows, count } = await RestaurantBankAccount.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Branch,
          attributes: ["id", "name"],
        },
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
        },
      ],
    });

    const totalPages = Math.ceil(count / limit);

    return {
      rows,
      count,
      page,
      limit,
      totalPages,
    };
  },

  async getBankAccountById(user, bankAccountId) {
    const account = await RestaurantBankAccount.findByPk(bankAccountId, {
      include: [
        { model: Branch, attributes: ["id", "name"] },
        { model: Restaurant, attributes: ["id", "restaurant_name"] },
      ],
    });

    if (!account) {
      throwError("Bank account not found", 404);
    }

    if (user.branch_id) {
      if (account.branch_id !== user.branch_id) {
        throwError(
          "Access denied: bank account does not belong to your branch",
          403
        );
      }
    } else if (user.restaurant_id) {
      if (account.restaurant_id !== user.restaurant_id) {
        throwError(
          "Access denied: bank account does not belong to your restaurant",
          403
        );
      }
    } else {
      throwError("No restaurant or branch context found", 403);
    }

    return account;
  },

  async deleteBankAccount(user, bankAccountId) {
    const t = await sequelize.transaction();
    try {
      const account = await RestaurantBankAccount.findByPk(bankAccountId, {
        transaction: t,
      });

      if (!account) {
        throwError("Bank account not found", 404);
      }

      if (user.branch_id) {
        if (account.branch_id !== user.branch_id) {
          throwError(
            "Access denied: bank account does not belong to your branch",
            403
          );
        }
      } else if (user.restaurant_id) {
        if (account.restaurant_id !== user.restaurant_id) {
          throwError(
            "Access denied: bank account does not belong to your restaurant",
            403
          );
        }
      } else {
        throwError("No restaurant or branch context found", 403);
      }

      await account.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async setDefaultBankAccount(user, bankAccountId) {
    const t = await sequelize.transaction();

    try {
      const account = await RestaurantBankAccount.findByPk(bankAccountId, {
        transaction: t,
      });

      if (!account) {
        throwError("Bank account not found", 404);
      }

      if (user.branch_id) {
        if (account.branch_id !== user.branch_id) {
          throwError(
            "Access denied: bank account does not belong to your branch",
            403
          );
        }
      } else if (user.restaurant_id) {
        if (account.restaurant_id !== user.restaurant_id) {
          throwError(
            "Access denied: bank account does not belong to your restaurant",
            403
          );
        }
      } else {
        throwError("No restaurant or branch context found", 403);
      }

      const where = {
        restaurant_id: account.restaurant_id,
        branch_id: account.branch_id || null,
        id: { [sequelize.Op.ne]: account.id },
      };

      await RestaurantBankAccount.update(
        { is_default: false },
        { where, transaction: t }
      );

      if (!account.is_default) {
        await account.update({ is_default: true }, { transaction: t });
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = RestaurantBankAccountService;
