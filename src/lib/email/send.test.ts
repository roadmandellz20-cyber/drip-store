import test from "node:test";
import assert from "node:assert/strict";

import { resolveResendFromAddress } from "./resend-config.ts";

test("resolveResendFromAddress accepts a verified branded sender", () => {
  const from = resolveResendFromAddress({
    rawFrom: "Mugen District <orders@mugendistrict.com>",
  });

  assert.equal(from, "Mugen District <orders@mugendistrict.com>");
});

test("resolveResendFromAddress formats a raw verified address with the brand name", () => {
  const from = resolveResendFromAddress({
    rawFrom: "orders@mugendistrict.com",
    fromName: "Mugen District",
  });

  assert.equal(from, "Mugen District <orders@mugendistrict.com>");
});

test("resolveResendFromAddress rejects onboarding@resend.dev", () => {
  assert.throws(
    () =>
      resolveResendFromAddress({
        rawFrom: "onboarding@resend.dev",
        fromName: "Mugen District",
      }),
    /verified domain/i
  );
});
