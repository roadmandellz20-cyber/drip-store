import test from "node:test";
import assert from "node:assert/strict";

import { getLaunchDate, isLaunchLive, parseLaunchDateInput } from "./launch.ts";

test("parseLaunchDateInput accepts ISO timestamps with explicit timezone offsets", () => {
  const launchDate = parseLaunchDateInput("2026-04-30T00:00:00Z");

  assert.ok(launchDate);
  assert.equal(launchDate.toISOString(), "2026-04-30T00:00:00.000Z");
});

test("parseLaunchDateInput treats timezone-less timestamps as UTC", () => {
  const launchDate = parseLaunchDateInput("2026-04-30T12:34:56");

  assert.ok(launchDate);
  assert.equal(launchDate.toISOString(), "2026-04-30T12:34:56.000Z");
});

test("parseLaunchDateInput treats date-only values as UTC midnight", () => {
  const launchDate = parseLaunchDateInput("2026-04-30");

  assert.ok(launchDate);
  assert.equal(launchDate.toISOString(), "2026-04-30T00:00:00.000Z");
});

test("getLaunchDate falls back to a deterministic UTC default when config is invalid", () => {
  const launchDate = getLaunchDate(new Date("2026-01-15T12:00:00Z"), {
    launchAtRaw: "not-a-date",
  });

  assert.equal(launchDate.toISOString(), "2026-04-30T00:00:00.000Z");
});

test("isLaunchLive respects the configured launch timestamp", () => {
  assert.equal(
    isLaunchLive(Date.parse("2026-04-01T12:00:00Z"), {
      launchAtRaw: "2026-04-30T00:00:00Z",
    }),
    false
  );

  assert.equal(
    isLaunchLive(Date.parse("2026-04-30T00:00:00Z"), {
      launchAtRaw: "2026-04-30T00:00:00Z",
    }),
    true
  );
});
