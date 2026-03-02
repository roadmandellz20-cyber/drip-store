import test from "node:test";
import assert from "node:assert/strict";

import { customerOrderEmail } from "./templates.ts";

test("customer order email includes order ref, items, total, WhatsApp, and Instagram links", () => {
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
  assert.match(email.subject, /MUGEN DISTRICT/);

  assert.match(email.html, /MGN-TEST-0001/);
  assert.match(email.html, /SKU: luffy-02/);
  assert.match(email.html, /https:\/\/wa\.me\/2203340558/);
  assert.match(email.html, /https:\/\/instagram\.com\/mugendistrict/);
  assert.match(email.html, /GMD 2000\.00/);

  assert.match(email.text, /Order Ref: MGN-TEST-0001/);
  assert.match(email.text, /\[luffy-02\]/);
  assert.match(email.text, /WhatsApp support: https:\/\/wa\.me\/2203340558/);
  assert.match(email.text, /Instagram: https:\/\/instagram\.com\/mugendistrict/);
});
