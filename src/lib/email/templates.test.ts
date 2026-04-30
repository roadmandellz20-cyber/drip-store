import test from "node:test";
import assert from "node:assert/strict";

import { customerOrderEmail } from "./templates.ts";

test("customer order email includes order ref, items, total, and WhatsApp link", () => {
  const email = customerOrderEmail({
    orderNumber: "MGN-TEST-0001",
    currency: "GMD",
    totalCents: 200000,
    customerName: "Tokyo Test",
    customerEmail: "real@example.com",
    customerPhone: "+2201234567",
    shippingAddress: "Kairaba Avenue, Banjul, The Gambia",
    deliveryNote: "Leave at the front desk.",
    items: [
      {
        title: "Gear 5 Luffy Collage Tee (Black)",
        sku: "luffy-02",
        qty: 1,
        unitPriceCents: 200000,
        lineTotalCents: 200000,
        currency: "GMD",
        size: "M",
      },
    ],
  });

  assert.match(email.subject, /MGN-TEST-0001/);

  assert.match(email.html, /MGN-TEST-0001/);
  assert.match(email.html, /SKU: luffy-02/);
  assert.match(email.html, /https:\/\/wa\.me\/2203340558/);
  assert.match(email.html, /GMD 2000\.00/);

  assert.match(email.text, /Order Ref: MGN-TEST-0001/);
  assert.match(email.text, /\[luffy-02\]/);
  assert.match(email.text, /WhatsApp: https:\/\/wa\.me\/2203340558/);
});

test("customer order email uses ichigo-01 fallback image for test- SKUs", () => {
  const email = customerOrderEmail({
    orderNumber: "MGN-TEST-0002",
    currency: "GMD",
    totalCents: 100,
    items: [
      {
        title: "Test Product",
        sku: "test-product-01",
        qty: 1,
        unitPriceCents: 100,
        lineTotalCents: 100,
        currency: "GMD",
      },
    ],
  });

  assert.match(email.html, /ichigo-01\.JPG/);
});

test("customer order email uses real SKU for non-test products", () => {
  const email = customerOrderEmail({
    orderNumber: "MGN-TEST-0003",
    currency: "GMD",
    totalCents: 200000,
    items: [
      {
        title: "Gear 5 Luffy Collage Tee (Black)",
        sku: "luffy-02",
        qty: 1,
        unitPriceCents: 200000,
        lineTotalCents: 200000,
        currency: "GMD",
      },
    ],
  });

  assert.match(email.html, /luffy-02\.JPG/);
  assert.doesNotMatch(email.html, /ichigo-01\.JPG/);
});
