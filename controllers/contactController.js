const { handleIdentify } = require("../services/contactService");

exports.identifyContact = async (req, res) => {
  try {
    const response = await handleIdentify(req.body);
    res.status(200).json({ contact: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
