import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(configDirectory, "..");

dotenv.config({ path: path.join(backendDirectory, ".env.local") });
dotenv.config({ path: path.join(backendDirectory, ".env") });
