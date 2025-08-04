const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false, // Set to true if you want to see SQL queries in the console
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // This might be necessary for some providers like Render
    },
  },
});

module.exports = sequelize;
