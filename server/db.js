import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { venues as seedVenues } from "../src/services/Data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.join(__dirname, "data", "db.json");

// Tiny JSON-file database. Fine for a demo/college project; swap for
// MongoDB/Postgres by re-implementing this one module.
export function createDb(file = DEFAULT_FILE) {
  const persist = file !== ":memory:";
  let data;

  if (persist && fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } else {
    data = {
      users: [],
      venues: seedVenues.map((v) => ({ ...v })),
      bookings: [],
      reviews: [],
    };
    const adminEmail = process.env.ADMIN_EMAIL || "admin@bmv.com";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    data.users.push({
      id: 1,
      name: "BMV Admin",
      email: adminEmail,
      phone: "",
      role: "admin",
      passwordHash: bcrypt.hashSync(adminPass, 8),
      favorites: [],
      createdAt: new Date().toISOString(),
    });
  }

  // Photos that Unsplash has since removed: repair venues already saved in an older db.json
  const DEAD_PHOTOS = { "1478146059778-26ca6e370071": "1469371670807-013ccf25f16a" };
  const fixPhotos = (v) => JSON.parse(
    Object.entries(DEAD_PHOTOS).reduce((json, [dead, live]) => json.split(dead).join(live), JSON.stringify(v))
  );
  data.venues = data.venues.map(fixPhotos);

  const save = () => {
    if (!persist) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  };
  save();

  const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
  return { data, save, nextId };
}
