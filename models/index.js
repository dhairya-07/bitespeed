const sequelize = require("../config/db");
const Contact = require("../models/contacts");

const syncDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");
    await sequelize.sync({ alter: true });
  } catch (error) {
    console.error("Unable to connect to DB:", error);
  }
};

module.exports = { Contact, syncDB };
