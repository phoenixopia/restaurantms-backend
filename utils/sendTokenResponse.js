const { Role, RolePermission, Permission } = require("../models");

exports.sendTokenResponse = async (user, statusCode, res) => {
  try {
    const role = await Role.findByPk(user.role_id, {
      include: [
        {
          model: RolePermission,
          where: { granted: true },
          required: false,
          include: [
            {
              model: Permission,
              attributes: ["name"],
            },
          ],
        },
      ],
    });

    const permissions =
      role.RolePermissions?.map(
        (rp) => rp.Permission?.code || rp.Permission?.name
      ) || [];

    const token = await user.getJwtToken();
    const cookieOptions = {
      httpOnly: true,
      secure: false, // only for local dev!
      sameSite: "Lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    };

    return res
      .status(statusCode)
      .cookie("token", token, cookieOptions)
      .json({
        success: true,
        data: {
          id: user.id,
          role: role.name,
          permissions,
          token,
        },
      });
  } catch (error) {
    console.error("Error generating token with permissions:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
