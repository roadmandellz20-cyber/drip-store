import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveAggregateEmailStatus,
  isBasicCustomerEmail,
  shouldSendCustomerConfirmation,
} from "./email-state.ts";

test("isBasicCustomerEmail requires a non-empty address containing @", () => {
  assert.equal(isBasicCustomerEmail(""), false);
  assert.equal(isBasicCustomerEmail("invalid-email"), false);
  assert.equal(isBasicCustomerEmail("real@example.com"), true);
});

test("shouldSendCustomerConfirmation allows first successful send and blocks replays after sent", () => {
  assert.equal(
    shouldSendCustomerConfirmation({
      customerEmail: "real@example.com",
      customerEmailStatus: "",
      customerEmailSentAt: "",
    }),
    true
  );

  assert.equal(
    shouldSendCustomerConfirmation({
      customerEmail: "real@example.com",
      customerEmailStatus: "sent",
      customerEmailSentAt: "",
    }),
    false
  );

  assert.equal(
    shouldSendCustomerConfirmation({
      customerEmail: "real@example.com",
      customerEmailStatus: "failed",
      customerEmailSentAt: "",
    }),
    true
  );
});

test("deriveAggregateEmailStatus mirrors success, partial, and failure states", () => {
  assert.equal(
    deriveAggregateEmailStatus({
      adminStatus: "sent",
      customerStatus: "sent",
    }),
    "sent"
  );

  assert.equal(
    deriveAggregateEmailStatus({
      adminStatus: "sent",
      customerStatus: "failed",
    }),
    "partial"
  );

  assert.equal(
    deriveAggregateEmailStatus({
      adminStatus: "failed",
      customerStatus: "failed",
    }),
    "failed"
  );
});
