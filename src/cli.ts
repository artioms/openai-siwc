#!/usr/bin/env node

import { Command } from "commander";
import { client } from "./client.js";

const program = new Command();

program
  .name("openai-siwc")
  .description("OpenAI Sign in with ChatGPT CLI")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with ChatGPT")
  .action(async () => {
    try {
      const session = await client.signIn();

      if (session.status !== "connected") {
        console.error("Login did not complete:", session.error?.message);
        process.exitCode = 1;
        return;
      }

      console.log("Connected to ChatGPT.");
      console.log("Identity:", session.identity?.email ?? "Unknown");
      console.log("Token sharing:", session.sharing ? "Enabled" : "Disabled");
    } catch (error) {
      console.error("Login failed:", error);
      process.exitCode = 1;
    }
  });

program
  .command("status")
  .description("Show ChatGPT connection status")
  .action(async () => {
    const session = await client.getSession();

    console.log("Status:", session.status);
    console.log("Identity:", session.identity?.email ?? "Unknown");
    console.log("Token sharing:", session.sharing ? "Enabled" : "Disabled");

    if (session.error) {
      console.error("Error:", session.error.message);
    }
  });

program
  .command("models")
  .description("List available ChatGPT models")
  .action(async () => {
    try {
      const models = await client.listModels();

      for (const model of models) {
        console.log(`${model.slug}\t${model.displayName}`);
      }
    } catch (error) {
      console.error("Unable to list models:", error);
      process.exitCode = 1;
    }
  });

program
  .command("logout")
  .description("Disconnect and remove local ChatGPT credentials")
  .action(async () => {
    try {
      await client.disconnect();
      console.log("Disconnected from ChatGPT.");
    } catch (error) {
      console.error("Logout warning:", error);
      process.exitCode = 1;
    }
  });

program
  .command("sbx-secret")
  .description("Print the current SIWC access token for Docker SBX")
  .action(async () => {
    try {
      const session = await client.getSession();

      if (session.status !== "connected") {
        throw new Error("Not connected to ChatGPT. Run openai-siwc login.");
      }

      if (!session.sharing) {
        throw new Error(
          "ChatGPT token sharing is disabled. Reconnect with sharing enabled."
        );
      }

      const token = await client.getAccessToken();

      // stdout must contain ONLY the secret.
      process.stdout.write(token);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to retrieve token.";

      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);

