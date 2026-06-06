import 'dotenv/config';
import app from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);

// Fail fast in production if critical secrets are missing
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in production. Set JWT_SECRET in environment.");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Api Server running on http://localhost:${PORT}`);
});
