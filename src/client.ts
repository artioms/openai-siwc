import { createChatGPT } from "@siwc/local";
import { config } from "./config.js";
import { credentialEncryption } from "./encryption.js";
import { openLoginBrowser } from "./browser.js";

export const client = createChatGPT({
  ...config,
  credentialEncryption,
  openBrowser: openLoginBrowser,
});

