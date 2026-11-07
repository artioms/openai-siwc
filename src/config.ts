import { homedir } from "node:os";
import { join } from "node:path";

export const config = {
  appName: "OpenAI SIWC",
  appId: "openai-siwc",
  redirectPort: 0,
  storageDir: join(homedir(), ".config", "openai-siwc"),
  sendHostId: true,
};

