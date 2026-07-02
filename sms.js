/* global process */
import "dotenv/config";
import axios from "axios";

const apiKey = process.env.TEXTBEE_API_KEY;
const deviceId = process.env.TEXTBEE_DEVICE_ID;
const baseUrl = process.env.TEXTBEE_BASE_URL || "https://api.textbee.dev";
const toNumber = process.env.TEXTBEE_TEST_TO_NUMBER || "+639XXXXXXXXX";

const missingEnv = [
  ["TEXTBEE_API_KEY", apiKey],
  ["TEXTBEE_DEVICE_ID", deviceId],
]
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnv.length > 0) {
  console.error(`Missing TextBee environment variable(s): ${missingEnv.join(", ")}`);
  console.error("Add them to .env, then run: node sms.js");
  process.exit(1);
}

if (toNumber === "+639XXXXXXXXX") {
  console.error("Replace TEXTBEE_TEST_TO_NUMBER in .env with a real test recipient number.");
  console.error("Use E.164 format, example: +639171234567");
  process.exit(1);
}

const endpoint = `${baseUrl.replace(/\/$/, "")}/api/v1/gateway/devices/${encodeURIComponent(
  deviceId
)}/send-sms`;

try {
  const response = await axios.post(
    endpoint,
    {
      recipients: [toNumber],
      message: "Barangay Announcement: This is a test SMS notification.",
    },
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );

  console.log("SMS sent:", response.data);
} catch (error) {
  console.error("TextBee SMS failed:", error.response?.data || error.message);
  process.exit(1);
}
