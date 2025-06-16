const axios = require("axios");

const sendFCMNotification = async (token, title, body) => {
  const serverKey = process.env.FCM_SERVER_KEY;

  const payload = {
    to: token,
    notification: {
      title: title,
      body: body,
      sound: "default",
    },
    priority: "high",
  };

  try {
    const response = await axios.post(
      "https://fcm.googleapis.com/fcm/send",
      payload,
      {
        headers: {
          Authorization: `key=${serverKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("FCM sent:", response.data);
  } catch (err) {
    console.error("Failed to send FCM:", err.response?.data || err.message);
  }
};

module.exports = { sendFCMNotification };
