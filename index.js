import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

await mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((e) => console.error(e));

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
