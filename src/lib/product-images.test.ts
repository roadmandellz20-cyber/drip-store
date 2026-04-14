import test from "node:test";
import assert from "node:assert/strict";

import { getProductAssetVariantUrl } from "./product-images.ts";

test("getProductAssetVariantUrl safely handles empty image sources", () => {
  assert.equal(getProductAssetVariantUrl(null, 900), "");
  assert.equal(getProductAssetVariantUrl(undefined, 900), "");
  assert.equal(getProductAssetVariantUrl("   ", 900), "");
});

test("getProductAssetVariantUrl returns sized local asset variants", () => {
  assert.equal(
    getProductAssetVariantUrl("/archive/assets/products/luffy-02.jpg", 480),
    "/archive/assets/products/luffy-02-480.jpg"
  );
  assert.equal(
    getProductAssetVariantUrl("/archive/assets/products/luffy-02.jpg", 900),
    "/archive/assets/products/luffy-02-900.jpg"
  );
  assert.equal(
    getProductAssetVariantUrl("/archive/assets/products/luffy-02.jpg", 1600),
    "/archive/assets/products/luffy-02.jpg"
  );
});
