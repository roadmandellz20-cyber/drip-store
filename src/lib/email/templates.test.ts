import test from "node:test";
import assert from "node:assert/strict";

import { customerOrderEmail } from "./templates.ts";

test("customer order email subject contains order ref", () => {
  const email = customerOrderEmail({
    orderNumber: "MGN-TEST-0001",
    currency: "GMD",
    totalCents: 200000,
    customerName: "Tokyo Test",
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
});

test("customer order email HTML contains order ref, item name, total, and WhatsApp link", () => {
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

  assert.match(email.html, /MGN-TEST-0001/);
  assert.match(email.html, /Gear 5 Luffy Collage Tee/);
  assert.match(email.html, /SKU: luffy-02/);
  assert.match(email.html, /https:\/\/wa\.me\/2203340558/);
  assert.match(email.html, /GMD 2000\.00/);
  assert.match(email.html, /Thanks for your order, Tokyo\./);
  assert.match(email.html, /Privacy Policy/);
});

test("customer order email text contains order ref, items, and WhatsApp link", () => {
  const email = customerOrderEmail({
    orderNumber: "MGN-TEST-0001",
    currency: "GMD",
    totalCents: 200000,
    customerName: "Tokyo Test",
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

  assert.match(email.text, /Order Ref: MGN-TEST-0001/);
  assert.match(email.text, /\[luffy-02\]/);
  assert.match(email.text, /WhatsApp: https:\/\/wa\.me\/2203340558/);
});

test("customer order email uses ichigo-01 hero fallback for test- SKU", () => {
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

test("customer order email uses real SKU image for non-test products", () => {
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

test("customer order email uses per-item fallback images for multi-item test orders", () => {
  const email = customerOrderEmail({
    orderNumber: "MGN-TEST-0004",
    currency: "GMD",
    totalCents: 5500,
    items: [
      { title: "Test 1", sku: "test-product-01", qty: 1, unitPriceCents: 100, lineTotalCents: 100, currency: "GMD" },
      { title: "Test 2", sku: "test-product-02", qty: 1, unitPriceCents: 2000, lineTotalCents: 2000, currency: "GMD" },
      { title: "Test 3", sku: "test-product-03", qty: 1, unitPriceCents: 1500, lineTotalCents: 1500, currency: "GMD" },
    ],
  });

  // Hero image uses first item → ichigo-01
  assert.match(email.html, /ichigo-01\.JPG/);
  // Thumbnail for test-product-02 → luffy-01
  assert.match(email.html, /luffy-01\.JPG/);
  // Thumbnail for test-product-03 → ulquiorra-01
  assert.match(email.html, /ulquiorra-01\.JPG/);
});
