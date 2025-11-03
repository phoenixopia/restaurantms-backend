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
     
      const plan = await Plan.findByPk(id, { transaction: t });
      if (!plan) throwError("Plan not found", 404);
  
     
      const oldData = plan.toJSON();
  
    
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
  
      if (duplicate) {
        throwError("Another plan with same name and billing cycle exists", 400);
      }
  
     
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
  
            if (!existingLimit) {
              throwError(`Plan limit with id ${limitUpdate.id} not found`, 404);
            }
  
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
        
            if (!limitUpdate.key || limitUpdate.value === undefined) {
              throwError("New plan limits must include 'key' and 'value'", 400);
            }
  
            await PlanLimit.create(
              {
                plan_id: id,
                key: limitUpdate.key,
                value: String(limitUpdate.value),
                data_type: limitUpdate.data_type || "number",
                description: limitUpdate.description || null,
              },
              { transaction: t }
            );
          }
        }
      }
  
    
      const changes = {};
  
      if (oldData.name !== updatedName)
        changes.name = { from: oldData.name, to: updatedName };
      if (oldData.billing_cycle !== updatedCycle)
        changes.billing_cycle = { from: oldData.billing_cycle, to: updatedCycle };
      if (updates.price !== undefined && oldData.price !== updates.price)
        changes.price = { from: oldData.price, to: updates.price };
  
  
  
      await logActivity({
        user_id: user.id,
        module: "Plan",
        action: "Update",
        details: {
          plan_id: id,
          changes: Object.keys(changes).length > 0 ? changes : "No changes",
          before: oldData,
          after: plan.toJSON(),
        },
        transaction: t,
      });
  

      await t.commit();
  

      await SendNotification.sendPlanNotification(
        "Plan Updated",
        `The plan "${updatedName}" has been updated.`,
        user.id
      );

      const updatedPlan = await Plan.findByPk(id, {
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
  
      const planJson = updatedPlan.toJSON();
  

      const transformedLimits = planJson.PlanLimits.map((limit) => {
        let castValue;
        if (limit.data_type === "number") {
          castValue = Number(limit.value);
        } else if (limit.data_type === "boolean") {
          const v = limit.value.toLowerCase();
          if (v === "true" || v === "1") castValue = true;
          else if (v === "false" || v === "0") castValue = false;
          else castValue = Boolean(limit.value);
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
        await t.rollback();
        return {
          success: false,
          message: `Cannot delete plan "${plan.name}". It is used by ${subscriptionCount} subscription(s).`,
          code: "PLAN_IN_USE",
        };
      }
  
      await PlanLimit.destroy({ where: { plan_id: id }, transaction: t });
      await plan.destroy({ transaction: t });
  
      await logActivity({
        user_id: user.id,
        module: "Plan",
        action: "Delete",
        details: { ...oldData, note: "Plan deleted (no subscriptions)" },
        transaction: t,
      });
  
      await t.commit();
  
      // Return minimal
      return { message: "Plan deleted successfully" };
  
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },


  // async delete(id, user) {
  //   const t = await sequelize.transaction();
  //   try {
  //     const plan = await Plan.findByPk(id, { transaction: t });
  //     if (!plan) throwError("Plan not found", 404);

  //     const oldData = plan.toJSON();

  //     await PlanLimit.destroy({ where: { plan_id: id }, transaction: t });
  //     await plan.destroy({ transaction: t });

  //     await logActivity({
  //       user_id: user.id,
  //       module: "Plan",
  //       action: "Delete",
  //       details: oldData,
  //       transaction: t,
  //     });

  //     await t.commit();
  //     return { message: "Plan deleted successfully" };
  //   } catch (err) {
  //     await t.rollback();
  //     throw err;
  //   }
  // },

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
