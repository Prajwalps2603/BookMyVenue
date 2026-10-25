import { createDb } from "./db.js";
import { createApp } from "./app.js";

const port = process.env.PORT || 5000;
createApp(createDb()).listen(port, () => {
  console.log(`BookMyVenue API running on http://localhost:${port}`);
  console.log(
    `Admin login: ${process.env.ADMIN_EMAIL || "admin@bmv.com"} / ${process.env.ADMIN_PASSWORD || "admin123"} (created on first run)`
  );
});
