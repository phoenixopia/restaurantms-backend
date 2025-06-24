exports.buildPagination = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const sort = query.sort || "name";
  const order = query.order === "desc" ? "DESC" : "ASC";

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    order: [[sort, order]],
  };
};
