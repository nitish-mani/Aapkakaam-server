const axios = require("axios");

exports.pincode_controller = async (req, res, next) => {
  const { pincode } = req.body;
  if (!pincode) {
    return res.status(400).json({ error: "Pincode is required" });
  }

  try {
    const response = await axios.get(
      `https://pincode-data.pages.dev/${pincode}.json`
    );

    return res.status(200).json({ data: response.data });
  } catch (error) {
    console.error("Error fetching pincode data:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
