const { Plan, sequelize } = require("../models");
const { Op } = require("sequelize");
const { capitalizeFirstLetter } = require("../utils/capitalizeFirstLetter");
const throwError = require("../utils/throwError");

const PlanService = {
  async listPlans() {
    return await Plan.findAll();
  },

  async getById(id) {
    const plan = await Plan.findByPk(id);
    if (!plan) throwError("Plan not found", 404);
    return plan;
  },

  async create(data) {
    const t = await sequelize.transaction();
    try {
      const formattedName = capitalizeFirstLetter(data.name);
      const exists = await Plan.findOne({
        where: { name: formattedName },
        transaction: t,
      });
      if (exists) throwError("A plan with this name already exists", 400);

      const newPlan = await Plan.create(
        { ...data, name: formattedName },
        { transaction: t }
      );

      await t.commit();
      return newPlan;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async update(id, updates) {
    const t = await sequelize.transaction();
    try {
      const plan = await Plan.findByPk(id, { transaction: t });
      if (!plan) throwError("Plan not found", 404);

      if (updates.name) {
        const formattedName = capitalizeFirstLetter(updates.name);
        const exists = await Plan.findOne({
          where: { name: formattedName, id: { [Op.ne]: id } },
          transaction: t,
        });
        if (exists)
          throwError("Another plan with this name already exists", 400);
        updates.name = formattedName;
      }

      await plan.update(updates, { transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async delete(id) {
    const t = await sequelize.transaction();
    try {
      const plan = await Plan.findByPk(id, { transaction: t });
      if (!plan) throwError("Plan not found", 404);

      await plan.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = PlanService;
