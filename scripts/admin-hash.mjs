#!/usr/bin/env node
import { pbkdf2Sync, randomBytes } from "node:crypto";
import readline from "node:readline";

const ITERATIONS = 210000;
const KEY_LENGTH = 32;

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha256");
  return `pbkdf2_sha256$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function getArgPassword() {
  const value = process.argv.slice(2).join(" ").trim();
  return value;
}

function promptPassword(promptLabel) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    rl.stdoutMuted = true;
    const originalWrite = rl._writeToOutput.bind(rl);

    rl._writeToOutput = function writeMasked(stringToWrite) {
      if (rl.stdoutMuted) {
        const trimmed = rl.line.replace(/\r|\n/g, "");
        originalWrite(`\r${promptLabel}${"*".repeat(trimmed.length)}`);
        return;
      }

      originalWrite(stringToWrite);
    };

    rl.question(promptLabel, (answer) => {
      rl.stdoutMuted = false;
      rl.output.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  let password = getArgPassword();

  if (!password) {
    password = await promptPassword("Enter admin password: ");
    if (!password) {
      throw new Error("Password cannot be empty.");
    }

    const confirm = await promptPassword("Confirm admin password: ");
    if (confirm !== password) {
      throw new Error("Passwords do not match.");
    }
  }

  if (password.length < 8) {
    throw new Error("Use at least 8 characters for admin password.");
  }

  console.log(hashPassword(password));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Error: ${message}`);
  process.exit(1);
});
