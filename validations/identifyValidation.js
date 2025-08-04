const Joi = require("joi");

const schema = Joi.object({
  email: Joi.string().email().allow(null, "").optional(),
  phoneNumber: Joi.string().pattern(/^\d+$/).allow(null, "").optional(),
}).custom((value, helpers) => {
  const { email, phoneNumber } = value;

  const hasValidEmail = typeof email === "string" && email.trim() !== "";
  const hasValidPhone =
    typeof phoneNumber === "string" && phoneNumber.trim() !== "";

  if (!hasValidEmail && !hasValidPhone) {
    return helpers.message(
      "At least one of email or phoneNumber must be provided"
    );
  }

  return value;
}, "At least one required");

module.exports = (req, res, next) => {
  const { error } = schema.validate(req.body);

  if (error) return res.status(400).json({ error: error.details[0].message });

  next();
};
