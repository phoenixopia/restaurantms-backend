const { Plan, PlanLimit, sequelize } = require("../../models");
const { Op } = require("sequelize");
const { capitalizeFirstLetter } = require("../../utils/capitalizeFirstLetter");
const throwError = require("../../utils/throwError");

const PlanService = {
  async listPlans({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Plan.findAndCountAll({
      include: [{ model: PlanLimit }],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      plans: rows,
    };
  },

  async getById(id) {
    const plan = await Plan.findByPk(id, {
      include: [{ model: PlanLimit }],
    });

    if (!plan) throwError("Plan not found", 404);
    return plan;
  },

  async getByName(name, billing_cycle) {
    const plan = await Plan.findOne({
      where: {
        name: { [Op.iLike]: `%${name}%` },
        ...(billing_cycle && { billing_cycle }),
      },
      include: [{ model: PlanLimit }],
    });

    if (!plan) throwError("Plan not found", 404);
    return plan;
  },

  async create(data) {
    const t = await sequelize.transaction();
    try {
      const formattedName = capitalizeFirstLetter(data.name);

      const exists = await Plan.findOne({
        where: {
          name: formattedName,
          billing_cycle: data.billing_cycle,
        },
        transaction: t,
      });

      if (exists)
        throwError("Plan with this name and billing cycle already exists", 400);

      const plan = await Plan.create(
        {
          name: formattedName,
          price: data.price,
          billing_cycle: data.billing_cycle,
        },
        { transaction: t }
      );

      if (Array.isArray(data.plan_limits)) {
        for (const limit of data.plan_limits) {
          await PlanLimit.create(
            {
              plan_id: plan.id,
              key: limit.key,
              value: String(limit.value),
              data_type: limit.data_type,
              description: limit.description || null,
            },
            { transaction: t }
          );
        }
      }

      await t.commit();
      return await Plan.findByPk(plan.id, { include: [PlanLimit] });
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

      const updatedName = updates.name
        ? capitalizeFirstLetter(updates.name)
        : plan.name;
      const updatedCycle = updates.billing_cycle || plan.billing_cycle;

      const duplicate = await Plan.findOne({
        where: {
          id: { [Op.ne]: id },
          name: updatedName,
          billing_cycle: updatedCycle,
        },
        transaction: t,
      });

      if (duplicate)
        throwError("Another plan with same name and billing cycle exists", 400);

      await plan.update(
        {
          name: updatedName,
          billing_cycle: updatedCycle,
          price: updates.price ?? plan.price,
        },
        { transaction: t }
      );

      if (Array.isArray(updates.plan_limits)) {
        for (const limitUpdate of updates.plan_limits) {
          if (limitUpdate.id) {
            const existingLimit = await PlanLimit.findOne({
              where: { id: limitUpdate.id, plan_id: id },
              transaction: t,
            });

            if (!existingLimit)
              throwError(`Plan limit with id ${limitUpdate.id} not found`, 404);

            await existingLimit.update(
              {
                key: limitUpdate.key ?? existingLimit.key,
                value:
                  limitUpdate.value !== undefined
                    ? String(limitUpdate.value)
                    : existingLimit.value,
                data_type: limitUpdate.data_type ?? existingLimit.data_type,
                description:
                  limitUpdate.description !== undefined
                    ? limitUpdate.description
                    : existingLimit.description,
              },
              { transaction: t }
            );
          } else {
            await PlanLimit.create(
              {
                plan_id: id,
                key: limitUpdate.key,
                value: String(limitUpdate.value),
                data_type: limitUpdate.data_type,
                description: limitUpdate.description || null,
              },
              { transaction: t }
            );
          }
        }
      }

      await t.commit();
      return await Plan.findByPk(id, { include: [PlanLimit] });
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

      await PlanLimit.destroy({ where: { plan_id: id }, transaction: t });
      await plan.destroy({ transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = PlanService;
