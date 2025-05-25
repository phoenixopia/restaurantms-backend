require("dotenv").config();
const { sequelize } = require("./models");
const app = require("./app");

// require("./cron");

const PORT = process.env.PORT || 4000;

sequelize
  .authenticate()
  .then(() => {
    console.log("Connected to the database");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(" Unable to connect to the database:", error);
  });
