const bcryptjs = require('bcryptjs');
const { sequelize, Users, Bookings, Services, Notifications, Categories, Blogs, Testimonials, Reviews, Branches, BranchServices } = require('../models/index');
const image = "https://drive.google.com/uc?id=1pMGXklJAHoz9YkE1udmLOLCofJhh9SPW";

(async () => {
  try {
    // await sequelize.sync({ force: true }); // This will drop and recreate all tables on this db
    await Users.sync({ force: true });
    const generateHashedPassword = async () => {
      return await bcryptjs.hash('Admin123', 10);
    };
    const password = await generateHashedPassword();
    const userData = [
      { 
        first_name: 'admin', last_name: 'admin', email: 'admin@gmail.com', password: password, phone_number: '+251919765445', 
        isConfirmed: true, role: 'super-admin', created_at: new Date(), updated_at: new Date(), 
      },
      { 
        first_name: 'user', last_name: 'user', email: 'user@gmail.com', password: password, phone_number: '+251919765445', 
        isConfirmed: true, role: 'user', created_at: new Date(), updated_at: new Date(), 
      },
      { 
        first_name: 'test', last_name: 'test', email: 'test@gmail.com', password: password, phone_number: '+251919765445', 
        isConfirmed: true, role: 'user', created_at: new Date(), updated_at: new Date(), 
      },
    ];
    await Users.bulkCreate(userData);

    console.log('Seed data added successfully.');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await sequelize.close();
  }
})();
