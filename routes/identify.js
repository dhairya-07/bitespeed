const express = require("express");

const router = express.Router();

const { identifyContact } = require("../controllers/contactController");
const validate = require("../validations/identifyValidation");

router.post("/", validate, identifyContact);

module.exports = router;
