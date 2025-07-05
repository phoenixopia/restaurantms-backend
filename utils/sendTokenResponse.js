const { Role, RolePermission, Permission } = require("../models");

exports.sendTokenResponse = async (
  user,
  statusCode,
  res,
  reqUrl = "/admin"
) => {
  try {
    const isCustomer = reqUrl.includes("/customer");
    const token = await user.getJwtToken();

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 8 * 60 * 60 * 1000,
    };

    if (isCustomer) {
      const {
        id,
        first_name,
        last_name,
        email,
        phone_number,
        profile_picture,
        email_verified_at,
        phone_verified_at,
        social_provider,
        social_provider_id,
        last_login_at,
        is_active,
        role_id,
        office_address_id,
        home_address_id,
        dob,
        notes,
        visit_count,
        last_visit_at,
        two_factor_enabled,
      } = user;

      return res.status(statusCode).cookie("token", token, cookieOptions).json({
        success: true,
        token,
        user: {
          id,
          first_name,
          last_name,
          email,
          phone_number,
          profile_picture,
          email_verified_at,
          phone_verified_at,
          social_provider,
          social_provider_id,
          last_login_at,
          is_active,
          role_id,
          office_address_id,
          home_address_id,
          dob,
          notes,
          visit_count,
          last_visit_at,
          two_factor_enabled,
        },
      });
    }

    // this part  for admin, staff . . . . .
    let role = null;
    let permissions = [];

    if (user.role_id) {
      role = await Role.findByPk(user.role_id, {
        include: [
          {
            model: RolePermission,
            where: { granted: true },
            required: false,
            include: [{ model: Permission, attributes: ["name"] }],
          },
        ],
      });

      permissions =
        role?.RolePermissions?.map(
          (rp) => rp.Permission?.code || rp.Permission?.name
        ) || [];
    }

    return res
      .status(statusCode)
      .cookie("token", token, cookieOptions)
      .json({
        success: true,
        token,
        data: {
          id: user.id,
          role: role?.name || null,
          permissions,
          restaurant_id: user.restaurant_id || null,
          branch_id: user.branch_id || null,
        },
      });
  } catch (error) {
    console.error("Error generating token with permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
