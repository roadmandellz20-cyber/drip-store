export type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  imageUrl: string;
  imageFallbackUrl: string;
  lookImageUrl: string;
  lookImageFallbackUrl: string;
  limited: boolean;
  isLimited: boolean;
  stockQty: number | null;
  soldQty: number;
  available: number | null;
  availableQty: number | null;
  soldOut: boolean;
  isNew: boolean;
  category: "all" | "new" | "limited";
  description: string;
  details: string[];
  brandLine: string;
};

export type ProductInventorySnapshot = {
  id?: string;
  slug: string;
  isLimited?: boolean;
  stockQty?: number | null;
  soldQty?: number;
  available?: number | null;
  availableQty?: number | null;
  soldOut?: boolean;
};

export const LIMITED_STOCK_QTY = 7;

const SUPABASE_PRODUCT_IMAGE_BASE = (() => {
  const explicitBase = process.env.NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL?.trim();
  if (explicitBase) return explicitBase.replace(/\/$/, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return "";

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/products`;
})();

function getLocalProductImageUrl(sku: string) {
  return `/archive/assets/products/${sku}.jpg`;
}

function getCanonicalProductImageUrl(sku: string) {
  if (!SUPABASE_PRODUCT_IMAGE_BASE) {
    return getLocalProductImageUrl(sku);
  }

  return `${SUPABASE_PRODUCT_IMAGE_BASE}/${sku}.jpg`;
}

function buildProductImages(sku: string) {
  const fallbackUrl = getLocalProductImageUrl(sku);

  return {
    imageUrl: getCanonicalProductImageUrl(sku),
    imageFallbackUrl: fallbackUrl,
    lookImageUrl: getCanonicalProductImageUrl(sku),
    lookImageFallbackUrl: fallbackUrl,
  };
}

function buildInventoryDefaults(limited: boolean) {
  return {
    limited,
    isLimited: limited,
    stockQty: limited ? LIMITED_STOCK_QTY : null,
    soldQty: 0,
    available: limited ? LIMITED_STOCK_QTY : null,
    availableQty: limited ? LIMITED_STOCK_QTY : null,
    soldOut: false,
  };
}

function normalizeInt(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
}

function resolveLimitedFlag(
  product: Product,
  snapshot?: ProductInventorySnapshot | Product | null
) {
  if (typeof snapshot?.isLimited === "boolean") return snapshot.isLimited;
  if (typeof product.isLimited === "boolean") return product.isLimited;
  return Boolean(product.limited);
}

export function applyProductInventory(
  product: Product,
  snapshot?: ProductInventorySnapshot | Product | null
): Product {
  const isLimited = resolveLimitedFlag(product, snapshot);
  const stockQty = isLimited
    ? normalizeInt(snapshot?.stockQty) ?? normalizeInt(product.stockQty) ?? LIMITED_STOCK_QTY
    : null;
  const soldQty = isLimited ? normalizeInt(snapshot?.soldQty) ?? normalizeInt(product.soldQty) ?? 0 : 0;
  const available =
    isLimited
      ? normalizeInt(snapshot?.availableQty) ??
        normalizeInt(snapshot?.available) ??
        Math.max(0, (stockQty ?? 0) - soldQty)
      : null;

  return {
    ...product,
    limited: isLimited,
    isLimited,
    stockQty,
    soldQty,
    available,
    availableQty: available,
    soldOut: isLimited && available !== null && available <= 0,
  };
}

export function mergeProductInventory(
  products: Product[],
  snapshots: Array<ProductInventorySnapshot | Product>
) {
  const bySlug = new Map<string, ProductInventorySnapshot | Product>();

  snapshots.forEach((snapshot) => {
    const key =
      "slug" in snapshot && typeof snapshot.slug === "string"
        ? snapshot.slug.toLowerCase()
        : "sku" in snapshot && typeof snapshot.sku === "string"
          ? snapshot.sku.toLowerCase()
          : "";
    if (key) {
      bySlug.set(key, snapshot);
    }
  });

  return products.map((product) => applyProductInventory(product, bySlug.get(product.sku.toLowerCase())));
}

export function getProductStockText(
  product: Pick<Product, "isLimited" | "soldOut" | "available" | "stockQty"> & {
    availableQty?: number | null;
  },
  launchLive = true
) {
  if (!product.isLimited) return "";

  const availableQty = product.availableQty ?? product.available;
  const fallbackTotal =
    (typeof product.stockQty === "number" && product.stockQty > 0 ? product.stockQty : null) ??
    LIMITED_STOCK_QTY;

  if (!launchLive) {
    return `LIMITED STOCK — ${fallbackTotal} TOTAL`;
  }

  if (product.soldOut) return "SOLD OUT";
  if (availableQty === null || availableQty === undefined) return `Only ${fallbackTotal} left`;
  if (availableQty <= 0) return "SOLD OUT";
  if (availableQty === 1) return "Final piece";
  return `Only ${availableQty} left`;
}

export function isProductSoldOut(product: Pick<Product, "isLimited" | "soldOut">) {
  return product.isLimited && product.soldOut;
}

const BASE_PRODUCTS: Product[] = [
  {
    id: "luffy-02",
    sku: "luffy-02",
    name: "Gear 5 Luffy Collage Tee (Black)",
    price: 1500,
    ...buildProductImages("luffy-02"),
    ...buildInventoryDefaults(false),
    isNew: true,
    category: "new",
    description:
      "Unleash Gear 5 energy with this high-impact One Piece collage tee. The front graphic features Monkey D. Luffy in his awakened form, bursting through layered manga panels with smoke effects and dynamic motion. Japanese typography and crew elements frame the composition, finished with the iconic phrase at the bottom.\n\nPrinted on a premium black tee, this piece blends raw anime chaos with modern streetwear attitude.",
    details: [
      "Premium heavyweight cotton",
      "Full front Gear 5 Luffy graphic",
      "Japanese text detailing",
      "Relaxed streetwear fit",
      "Unisex",
      "Vibe: High-energy anime street.",
    ],
    brandLine: "ENTER THE MUGEN.",
  },
  {
    id: "luffy-01",
    sku: "luffy-01",
    name: "One Piece Legacy Panel Tee (Black)",
    price: 2000,
    ...buildProductImages("luffy-01"),
    ...buildInventoryDefaults(true),
    isNew: false,
    category: "limited",
    description:
      "Built for true pirates. The One Piece Legacy Panel Tee features Gear 5 Luffy at the center, supported by Straw Hat crew visuals, the One Piece logo, and skull iconography along the base. The structured panel layout gives it a collectible feel while keeping strong streetwear presence.\n\nA must for fans who respect the journey.",
    details: [
      "Premium cotton construction",
      "Multi-panel One Piece artwork",
      "Crew and skull graphic row",
      "Soft durable print",
      "Unisex",
      "Vibe: Premium anime fan street.",
    ],
    brandLine: "ENTER THE MUGEN.",
  },
  {
    id: "ichigo-01",
    sku: "ichigo-01",
    name: "Ichigo Hollow Grunge Tee (White Distressed)",
    price: 2000,
    ...buildProductImages("ichigo-01"),
    ...buildInventoryDefaults(true),
    isNew: true,
    category: "limited",
    description:
      "Raw and battle-worn. The Ichigo Hollow Grunge Tee features a torn collage of Ichigo Kurosaki in his Hollow form, layered with Japanese typography, panel textures, and distressed graphic elements. The cropped white tee with frayed edges pushes the piece fully into modern streetwear territory.\n\nDark anime emotion meets Tokyo underground.",
    details: [
      "Soft heavyweight cotton",
      "Raw hem distressed finish",
      "Ichigo Hollow collage graphic",
      "Cropped streetwear silhouette",
      "Unisex",
      "Vibe: Anime fashion street.",
    ],
    brandLine: "ENTER THE MUGEN.",
  },
  {
    id: "ulquiorra-01",
    sku: "ulquiorra-01",
    name: "Ulquiorra Segunda Etapa Tee (Black)",
    price: 2000,
    ...buildProductImages("ulquiorra-01"),
    ...buildInventoryDefaults(true),
    isNew: false,
    category: "limited",
    description:
      "Cold. Controlled. Dangerous. The Ulquiorra Segunda Etapa Tee features a monochrome green composition centered on Ulquiorra Cifer in his released form. Vertical Japanese graphics and layered textures create a darker, more mature streetwear aesthetic.\n\nMinimal color. Maximum presence.",
    details: [
      "Premium black cotton",
      "Green monochrome Ulquiorra graphic",
      "Segunda Etapa text elements",
      "Clean streetwear fit",
      "Unisex",
      "Vibe: Premium anime street.",
    ],
    brandLine: "ENTER THE MUGEN.",
  },
  {
    id: "ichigo-02",
    sku: "ichigo-02",
    name: "Tensa Zangetsu Fragment Tee (White Distressed)",
    price: 1500,
    ...buildProductImages("ichigo-02"),
    ...buildInventoryDefaults(false),
    isNew: false,
    category: "all",
    description:
      "The Tensa Zangetsu Fragment Tee captures Ichigo’s duality through a torn-panel composition featuring layered character art, bold typography, and textured graphic blocks. The white distressed tee with raw edges gives the piece a worn, underground feel while keeping a premium finish.\n\nBuilt for those who move between worlds.",
    details: [
      "Premium soft heavyweight cotton",
      "Distressed raw hem finish",
      "Ichigo / Tensa visual collage",
      "Relaxed streetwear silhouette",
      "Unisex",
      "Vibe: Editorial anime street.",
    ],
    brandLine: "ENTER THE MUGEN.",
  },
];

export const ALL_PRODUCTS = BASE_PRODUCTS.map((product) => applyProductInventory(product));
export const getProduct = (id: string) => {
  const product = ALL_PRODUCTS.find((item) => item.id === id);
  return product ? applyProductInventory(product) : undefined;
};
export const getProductBySku = (sku: string) => {
  const product = ALL_PRODUCTS.find((item) => item.sku.toLowerCase() === sku.trim().toLowerCase());
  return product ? applyProductInventory(product) : undefined;
};
export const NEW_PRODUCTS = ALL_PRODUCTS.filter((product) => product.isNew);
export const LIMITED_PRODUCTS = ALL_PRODUCTS.filter((product) => product.isLimited);
