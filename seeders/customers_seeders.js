"use strict";
const { Customer } = require("../models/index");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const now = new Date();

  const customerData = [
    { id: uuidv4(), first_name: "Customer", last_name: "Test1", email: "customer1@gmail.com", password: "1234567890", profile_picture: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRij6dtiHizH96qpCOe8WeXXP3yLyQJkPdGVg&s", dob: new Date(1990,0,1), email_verified_at: now },
    { id: uuidv4(), first_name: "Customer", last_name: "Test2", email: "customer2@gmail.com", password: "1234567890", profile_picture: "https://cdn.pixabay.com/photo/2023/02/17/16/25/man-7796384_1280.jpg", dob: new Date(1991,1,2), email_verified_at: now },
    // ... (rest of your 10 customers)
  ];

  await Customer.bulkCreate(customerData.map(c => ({
    ...c, created_at: now, updated_at: now
  })));
};
