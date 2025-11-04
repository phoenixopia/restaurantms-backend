const { Plan, PlanLimit,Subscription, sequelize } = require("../../models");
const { Op } = require("sequelize");
const { capitalizeFirstLetter } = require("../../utils/capitalizeFirstLetter");
const throwError = require("../../utils/throwError");
const logActivity = require("../../utils/logActivity");
const SendNotification = require("../../utils/send_notification");

const PlanService = {
  async listPlans({ page = 1, limit = 10 }) {
    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await Plan.findAndCountAll({
      attributes: {
        exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
      },
      include: [
        {
          model: PlanLimit,
          attributes: {
            exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
          },
        },
      ],
      limit,
      offset,
    });

    const transformedPlans = rows.map((plan) => {
      const planJson = plan.toJSON();
      planJson.price = Number(planJson.price);

      const orderedPlanLimits = planJson.PlanLimits.map((limit) => {
        let castValue;

        if (limit.data_type === "number") {
          castValue = Number(limit.value);
        } else if (limit.data_type === "boolean") {
          const v = limit.value;
          if (v === "true" || v === "1") castValue = true;
          else if (v === "false" || v === "0") castValue = false;
          else castValue = Boolean(v);
        } else {
          castValue = limit.value;
        }

        return {
          id: limit.id,
          plan_id: limit.plan_id,
          key: limit.key,
          value: castValue,
          data_type: limit.data_type,
          description: limit.description,
        };
      });

      return {
        ...planJson,
        PlanLimits: orderedPlanLimits,
      };
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      plans: transformedPlans,
    };
  },

  async listPlansGroupedByNameAndDuration() {
    const plans = await Plan.findAll({
      attributes: {
        exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
      },
      include: [
        {
          model: PlanLimit,
          attributes: {
            exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
          },
        },
      ],
    });

    const result = {};

    plans.forEach((plan) => {
      const planJson = plan.toJSON();

      planJson.price = Number(planJson.price);

      const transformedLimits = planJson.PlanLimits.map((limit) => {
        let castValue;

        if (limit.data_type === "number") {
          castValue = Number(limit.value);
        } else if (limit.data_type === "boolean") {
          const v = limit.value;
          if (v === "true" || v === "1") castValue = true;
          else if (v === "false" || v === "0") castValue = false;
          else castValue = Boolean(v);
        } else {
          castValue = limit.value;
        }

        return {
          id: limit.id,
          plan_id: limit.plan_id,
          key: limit.key,
          value: castValue,
          data_type: limit.data_type,
          description: limit.description,
        };
      });

      const { name, billing_cycle } = planJson;

      if (!result[name]) {
        result[name] = {};
      }

      result[name][billing_cycle] = {
        ...planJson,
        PlanLimits: transformedLimits,
      };
    });

    return result;
  },

  async getById(id) {
    const plan = await Plan.findByPk(id, {
      attributes: {
        exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
      },
      include: [
        {
          model: PlanLimit,
          attributes: {
            exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
          },
        },
      ],
    });

    if (!plan) throwError("Plan not found", 404);

    const planJson = plan.toJSON();
    planJson.price = Number(planJson.price);

    const orderedPlanLimits = planJson.PlanLimits.map((limit) => {
      let castValue;

      if (limit.data_type === "number") {
        castValue = Number(limit.value);
      } else if (limit.data_type === "boolean") {
        const v = limit.value;
        if (v === "true" || v === "1") castValue = true;
        else if (v === "false" || v === "0") castValue = false;
        else castValue = Boolean(v);
      } else {
        castValue = limit.value;
      }

      return {
        id: limit.id,
        plan_id: limit.plan_id,
        key: limit.key,
        value: castValue,
        data_type: limit.data_type,
        description: limit.description,
      };
    });

    return {
      ...planJson,
      PlanLimits: orderedPlanLimits,
    };
  },

  async getByFilters(filters) {
    const where = {};

    if (filters.name) {
      where.name = { [Op.iLike]: `%${filters.name}%` };
    }

    if (filters.billing_cycle) {
      where.billing_cycle = filters.billing_cycle;
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Plan.findAndCountAll({
      where,

      limit,
      offset,
      include: [
        {
          model: PlanLimit,
          required: false,
          attributes: {
            exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
          },
        },
      ],
      attributes: {
        exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
      },
    });

    if (!rows.length) throwError("No plans found", 404);

    const transformedPlans = rows.map((plan) => {
      const planJson = plan.toJSON();
      planJson.price = Number(planJson.price);

      const limits = planJson.PlanLimits.map((limit) => {
        let castValue;
        if (limit.data_type === "number") {
          castValue = Number(limit.value);
        } else if (limit.data_type === "boolean") {
          const v = limit.value;
          if (v === "true" || v === "1") castValue = true;
          else if (v === "false" || v === "0") castValue = false;
          else castValue = Boolean(v);
        } else {
          castValue = limit.value;
        }

        return {
          id: limit.id,
          plan_id: limit.plan_id,
          key: limit.key,
          value: castValue,
          data_type: limit.data_type,
          description: limit.description,
        };
      });

      return {
        ...planJson,
        PlanLimits: limits,
      };
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      plans: transformedPlans,
    };
  },

  async create(data, user) {
    const t = await sequelize.transaction();
    try {
      const formattedName = capitalizeFirstLetter(data.name);

      const exists = await Plan.findOne({
        where: {
          name: { [Op.iLike]: formattedName },
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

      await logActivity({
        user_id: user.id,
        module: "Plan",
        action: "Create",
        details: plan.toJSON(),
        transaction: t,
      });

      await t.commit();

      await SendNotification.sendPlanNotification(
        "New Plan Created",
        `A new plan "${plan.name}" has been created.`,
        user.id
      );

      const newPlan = await Plan.findByPk(plan.id, {
        attributes: {
          exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
        },
        include: [
          {
            model: PlanLimit,
            attributes: {
              exclude: ["created_at", "updated_at", "createdAt", "updatedAt"],
            },
          },
        ],
      });

      const planJson = newPlan.toJSON();

      const transformedLimits = planJson.PlanLimits.map((limit) => {
        let castValue;
        if (limit.data_type === "number") {
          castValue = Number(limit.value);
        } else if (limit.data_type === "boolean") {
          const v = limit.value;
          if (v === "true" || v === "1") castValue = true;
          else if (v === "false" || v === "0") castValue = false;
          else castValue = Boolean(v);
        } else {
          castValue = limit.value;
        }

        return {
          id: limit.id,
          plan_id: limit.plan_id,
          key: limit.key,
          value: castValue,
          data_type: limit.data_type,
          description: limit.description,
        };
      });

      return {
        ...planJson,
        PlanLimits: transformedLimits,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },


async update(id, updates, user) {
  const t = await sequelize.transaction();
  try {
    // Load plan
    const plan = await Plan.findByPk(id, { transaction: t });
    if (!plan) throwError("Plan not found", 404);

    const oldData = plan.toJSON();

    // Track changes
    let planChanged = false;
    let limitsChanged = false;
    const changes = {};

    // Update plan fields (only if changed)
    if (updates.name !== undefined) {
      const newName = capitalizeFirstLetter(updates.name);
      if (newName !== plan.name) {
        changes.name = { from: plan.name, to: newName };
        plan.name = newName;
        planChanged = true;
      }
    }

    if (updates.billing_cycle !== undefined && updates.billing_cycle !== plan.billing_cycle) {
      changes.billing_cycle = { from: plan.billing_cycle, to: updates.billing_cycle };
      plan.billing_cycle = updates.billing_cycle;
      planChanged = true;
    }

    if (updates.price !== undefined && updates.price !== plan.price) {
      changes.price = { from: plan.price, to: updates.price };
      plan.price = updates.price;
      planChanged = true;
    }

    // OVERRIDE PLAN LIMITS: Delete All + Insert New (if sent)
    if (updates.plan_limits !== undefined) {
      // Delete ALL existing limits
      await PlanLimit.destroy({
        where: { plan_id: id },
        transaction: t,
      });

      // Insert new ones (if array and has items)
      if (Array.isArray(updates.plan_limits) && updates.plan_limits.length > 0) {
        const newLimits = updates.plan_limits.map((limit, idx) => {
          if (!limit.key || limit.value === undefined) {
            throwError(`plan_limits[${idx}] must have 'key' and 'value'`, 400);
          }
          return {
            plan_id: id,
            key: limit.key,
            value: String(limit.value),
            data_type: limit.data_type || 'number',
            description: limit.description ?? null,
          };
        });

        await PlanLimit.bulkCreate(newLimits, { transaction: t });
      }

      limitsChanged = true;
    }

    // Save plan if changed
    if (planChanged) {
      await plan.save({ transaction: t });
    }

    // Log & Notify only if real change
    const anyChange = planChanged || limitsChanged;

    if (anyChange) {
      await logActivity({
        user_id: user.id,
        module: "Plan",
        action: "Update",
        details: {
          plan_id: id,
          changes: Object.keys(changes).length ? changes : null,
          limits_overridden: limitsChanged,
        },
        transaction: t,
      });

      await SendNotification.sendPlanNotification(
        "Plan Updated",
        `The plan "${plan.name}" has been updated.`,
        user.id
      );
    }

    // Commit
    await t.commit();

    // Return fresh data
    const freshPlan = await Plan.findByPk(id, {
      attributes: { exclude: ["created_at", "updated_at", "createdAt", "updatedAt"] },
      include: [{
        model: PlanLimit,
        attributes: { exclude: ["created_at", "updated_at", "createdAt", "updatedAt"] },
      }],
    });

    const json = freshPlan.toJSON();

    const castValue = (type, val) => {
      switch (type) {
        case "number": return Number(val);
        case "boolean": return ['true', '1', true].includes(val);
        default: return val;
      }
    };

    const transformedLimits = (json.PlanLimits || []).map(l => ({
      id: l.id,
      plan_id: l.plan_id,
      key: l.key,
      value: castValue(l.data_type, l.value),
      data_type: l.data_type,
      description: l.description,
    }));

    return {
      ...json,
      PlanLimits: transformedLimits,
    };

  } catch (err) {
    await t.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      throwError("Another plan with same name and billing cycle exists", 400);
    }
    throw err;
  }
},

async delete(id, user) {
  const t = await sequelize.transaction();
  try {
    const plan = await Plan.findByPk(id, { transaction: t });
    if (!plan) throwError("Plan not found", 404);

    const oldData = plan.toJSON();

    const subscriptionCount = await Subscription.count({
      where: { plan_id: id },
      transaction: t,
    });

    if (subscriptionCount > 0) {
      throwError(
        `Cannot delete plan "${plan.name}". It is used by ${subscriptionCount} active subscription(s).`,
        409
      );
    }

    await PlanLimit.destroy({ where: { plan_id: id }, transaction: t });
    await plan.destroy({ transaction: t });

    await logActivity({
      user_id: user.id,
      module: "Plan",
      action: "Delete",
      details: { ...oldData, note: "Plan deleted" },
      transaction: t,
    });

    await t.commit();

    return {
      success: true,
      message: "Plan deleted successfully",
      data: null,
    };

  } catch (err) {
    await t.rollback();
    throw err;
  }
},


  async listAllPlanLimit({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await PlanLimit.findAndCountAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "created_at", "updated_at"],
      },
      offset,
      limit,
    });

    const transformedLimits = rows.map((limit) => {
      const limitJson = limit.toJSON();

      let castValue;
      if (limitJson.data_type === "number") {
        castValue = Number(limitJson.value);
      } else if (limitJson.data_type === "boolean") {
        const v = limitJson.value;
        if (v === "true" || v === "1") castValue = true;
        else if (v === "false" || v === "0") castValue = false;
        else castValue = Boolean(v);
      } else {
        castValue = limitJson.value;
      }

      return {
        id: limitJson.id,
        plan_id: limitJson.plan_id,
        key: limitJson.key,
        value: castValue,
        data_type: limitJson.data_type,
        description: limitJson.description,
      };
    });

    return {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
      plan_limits: transformedLimits,
    };
  },

  async listAllPlanLimitsWithPlans({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await PlanLimit.findAndCountAll({
      include: [
        {
          model: Plan,
          attributes: {
            exclude: ["createdAt", "updatedAt", "created_at", "updated_at"],
          },
        },
      ],
      attributes: {
        exclude: ["createdAt", "updatedAt", "created_at", "updated_at"],
      },
      offset,
      limit,
    });

    const transformedLimits = rows.map((limit) => {
      const limitJson = limit.toJSON();

      let castValue;
      if (limitJson.data_type === "number") {
        castValue = Number(limitJson.value);
      } else if (limitJson.data_type === "boolean") {
        const v = limitJson.value;
        if (v === "true" || v === "1") castValue = true;
        else if (v === "false" || v === "0") castValue = false;
        else castValue = Boolean(v);
      } else {
        castValue = limitJson.value;
      }

      return {
        id: limitJson.id,
        plan_id: limitJson.plan_id,
        key: limitJson.key,
        value: castValue,
        data_type: limitJson.data_type,
        description: limitJson.description,
        plan: limitJson.Plan,
      };
    });

    return {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
      plan_limits: transformedLimits,
    };
  },

  async createAndAssign(data, user) {
    const { key, value, data_type, description, plan_ids } = data;
    const t = await sequelize.transaction();
    try {
      const plans = await Plan.findAll({
        where: { id: { [Op.in]: plan_ids } },
        include: [{ model: PlanLimit }],
        transaction: t,
      });

      if (plans.length !== plan_ids.length) {
        throwError("One or more plan IDs are invalid", 404);
      }

      const conflictingPlans = plans.filter((plan) =>
        plan.PlanLimits.some((limit) => limit.key === key)
      );

      if (conflictingPlans.length > 0) {
        const conflictNames = conflictingPlans.map((p) => p.name).join(", ");
        throwError(`The key ${key} already exists in: ${conflictNames}`, 400);
      }

      const createdLimits = [];
      for (const plan of plans) {
        const newLimit = await PlanLimit.create(
          {
            plan_id: plan.id,
            key,
            value: String(value),
            data_type,
            description: description || null,
          },
          { transaction: t }
        );
        createdLimits.push(newLimit);
      }

      await logActivity({
        user_id: user.id,
        module: "PlanLimit",
        action: "Create",
        details: {
          key,
          value,
          data_type,
          description,
          plan_ids,
        },
        transaction: t,
      });

      await t.commit();
      return createdLimits;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },
};

module.exports = PlanService;
