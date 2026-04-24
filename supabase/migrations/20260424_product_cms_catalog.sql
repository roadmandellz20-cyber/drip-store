alter table if exists public.products
  add column if not exists details jsonb default '[]'::jsonb;

alter table if exists public.products
  add column if not exists is_new boolean default false;

alter table if exists public.products
  add column if not exists brand_line text default 'ENTER THE MUGEN.';

alter table if exists public.products
  add column if not exists sort_order integer default 0;

update public.products
set
  details = coalesce(details, '[]'::jsonb),
  is_new = coalesce(is_new, false),
  brand_line = coalesce(nullif(btrim(brand_line), ''), nullif(btrim(tagline), ''), 'ENTER THE MUGEN.'),
  sort_order = coalesce(sort_order, 0);

with seed(slug, is_new, brand_line, sort_order, image_url, details) as (
  values
    (
      'luffy-02',
      true,
      'ENTER THE MUGEN.',
      10,
      '/archive/assets/products/luffy-02.jpg',
      '["Premium heavyweight cotton","Full front Gear 5 Luffy graphic","Japanese text detailing","Relaxed streetwear fit","Unisex","Vibe: High-energy anime street."]'::jsonb
    ),
    (
      'luffy-01',
      false,
      'ENTER THE MUGEN.',
      20,
      '/archive/assets/products/luffy-01.jpg',
      '["Premium cotton construction","Multi-panel One Piece artwork","Crew and skull graphic row","Soft durable print","Unisex","Vibe: Premium anime fan street."]'::jsonb
    ),
    (
      'ichigo-01',
      true,
      'ENTER THE MUGEN.',
      30,
      '/archive/assets/products/ichigo-01.jpg',
      '["Soft heavyweight cotton","Raw hem distressed finish","Ichigo Hollow collage graphic","Cropped streetwear silhouette","Unisex","Vibe: Anime fashion street."]'::jsonb
    ),
    (
      'ulquiorra-01',
      false,
      'ENTER THE MUGEN.',
      40,
      '/archive/assets/products/ulquiorra-01.jpg',
      '["Premium black cotton","Green monochrome Ulquiorra graphic","Segunda Etapa text elements","Clean streetwear fit","Unisex","Vibe: Premium anime street."]'::jsonb
    ),
    (
      'ichigo-02',
      false,
      'ENTER THE MUGEN.',
      50,
      '/archive/assets/products/ichigo-02.jpg',
      '["Premium soft heavyweight cotton","Distressed raw hem finish","Ichigo / Tensa visual collage","Relaxed streetwear silhouette","Unisex","Vibe: Editorial anime street."]'::jsonb
    )
)
update public.products p
set
  is_new = s.is_new,
  brand_line = s.brand_line,
  sort_order = s.sort_order,
  image_url = coalesce(nullif(btrim(p.image_url), ''), s.image_url),
  image_main = coalesce(nullif(btrim(p.image_main), ''), s.image_url),
  image_alt = coalesce(nullif(btrim(p.image_alt), ''), s.image_url),
  details = case
    when jsonb_typeof(coalesce(p.details, '[]'::jsonb)) = 'array'
         and jsonb_array_length(coalesce(p.details, '[]'::jsonb)) > 0
      then p.details
    else s.details
  end
from seed s
where p.slug = s.slug;
