import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function openLoginBrowser(url: string): Promise<void> {
  console.log("\nLogin to OpenAI\n");

  console.log("Open this URL to sign in to Codex OAuth:\n");
  console.log(url);
  console.log("\nCtrl+click to open • Select and copy to use another browser\n");

  console.log("Opening browser...\n");

  try {
    await execFileAsync("open", [url]);
  } catch {
    console.log("Could not open browser automatically.");
  }

  console.log(
    "Complete sign-in in your browser. If the callback does not complete, paste the final redirect URL here.\n"
  );
}