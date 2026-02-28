export type Product = {
  id: string; // stable unique id used for routing
  sku: string; // luffy-01 etc
  name: string; // display name
  price: number; // in GMD
  imageUrl: string; // canonical product image URL
  imageFallbackUrl: string; // local optimized fallback
  lookImageUrl: string; // hover/lookbook image URL
  lookImageFallbackUrl: string; // local optimized fallback
  limited: boolean;
  isNew: boolean;
  category: "all" | "new" | "limited";
  description: string;
  details: string[];
  brandLine: string;
};

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

export const PRODUCTS: Product[] = [
  {
    id: "luffy-02",
    sku: "luffy-02",
    name: "Gear 5 Luffy Collage Tee (Black)",
    price: 1500,
    ...buildProductImages("luffy-02"),
    limited: false,
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
    limited: true,
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
    limited: true,
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
    limited: true,
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
    limited: false,
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

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);

export const NEW_PRODUCTS = PRODUCTS.filter((p) => p.isNew);
export const LIMITED_PRODUCTS = PRODUCTS.filter((p) => p.limited);
export const ALL_PRODUCTS = PRODUCTS;
