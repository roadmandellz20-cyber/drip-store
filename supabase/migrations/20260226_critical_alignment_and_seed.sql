-- CRITICAL ALIGNMENT: orders schema + products seed
-- Option A: add missing orders columns used by API.

alter table if exists public.orders
  add column if not exists customer_email text;

alter table if exists public.orders
  add column if not exists delivery_note text;

alter table if exists public.orders
  add column if not exists idempotency_key text;

alter table if exists public.orders
  add column if not exists email_status text default 'pending';

alter table if exists public.orders
  add column if not exists email_error text;

create unique index if not exists orders_idempotency_key_unique
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- Ensure products table has required fields for checkout validation and seed data.
alter table if exists public.products
  add column if not exists slug text;

alter table if exists public.products
  add column if not exists title text;

alter table if exists public.products
  add column if not exists description text;

alter table if exists public.products
  add column if not exists price_cents integer;

alter table if exists public.products
  add column if not exists currency text default 'GMD';

alter table if exists public.products
  add column if not exists image_url text;

alter table if exists public.products
  add column if not exists image_main text;

alter table if exists public.products
  add column if not exists image_alt text;

alter table if exists public.products
  add column if not exists status text default 'AVAILABLE';

alter table if exists public.products
  add column if not exists tagline text;

alter table if exists public.products
  add column if not exists is_active boolean default true;

with seed(slug, title, price_cents, currency, description, image_url, status, is_active, tagline) as (
  values
    (
      'luffy-01',
      'One Piece Legacy Panel Tee (Black)',
      200000,
      'GMD',
      'Built for true pirates. Multi-panel One Piece artwork with premium streetwear finish.',
      '/archive/assets/luffy-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'luffy-02',
      'Gear 5 Luffy Collage Tee (Black)',
      150000,
      'GMD',
      'Gear 5 collage graphic with layered manga details and bold street silhouette.',
      '/archive/assets/luffy-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-01',
      'Ichigo Hollow Grunge Tee (White Distressed)',
      200000,
      'GMD',
      'Distressed Ichigo Hollow collage with Japanese typography and underground finish.',
      '/archive/assets/ichigo-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-02',
      'Tensa Zangetsu Fragment Tee (White Distressed)',
      150000,
      'GMD',
      'Tensa Zangetsu panel composition with torn textures and editorial streetwear shape.',
      '/archive/assets/ichigo-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ulquiorra-01',
      'Ulquiorra Segunda Etapa Tee (Black)',
      200000,
      'GMD',
      'Monochrome Ulquiorra composition with dark archival tone and sharp print presence.',
      '/archive/assets/ulquiorra-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    )
)
update public.products p
set
  title = s.title,
  description = s.description,
  price_cents = s.price_cents,
  currency = s.currency,
  image_url = s.image_url,
  image_main = s.image_url,
  image_alt = s.image_url,
  status = s.status,
  is_active = s.is_active,
  tagline = s.tagline
from seed s
where p.slug = s.slug;

with seed(slug, title, price_cents, currency, description, image_url, status, is_active, tagline) as (
  values
    (
      'luffy-01',
      'One Piece Legacy Panel Tee (Black)',
      200000,
      'GMD',
      'Built for true pirates. Multi-panel One Piece artwork with premium streetwear finish.',
      '/archive/assets/luffy-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'luffy-02',
      'Gear 5 Luffy Collage Tee (Black)',
      150000,
      'GMD',
      'Gear 5 collage graphic with layered manga details and bold street silhouette.',
      '/archive/assets/luffy-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-01',
      'Ichigo Hollow Grunge Tee (White Distressed)',
      200000,
      'GMD',
      'Distressed Ichigo Hollow collage with Japanese typography and underground finish.',
      '/archive/assets/ichigo-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ichigo-02',
      'Tensa Zangetsu Fragment Tee (White Distressed)',
      150000,
      'GMD',
      'Tensa Zangetsu panel composition with torn textures and editorial streetwear shape.',
      '/archive/assets/ichigo-02.jpg',
      'AVAILABLE',
      true,
      'ENTER THE MUGEN.'
    ),
    (
      'ulquiorra-01',
      'Ulquiorra Segunda Etapa Tee (Black)',
      200000,
      'GMD',
      'Monochrome Ulquiorra composition with dark archival tone and sharp print presence.',
      '/archive/assets/ulquiorra-01.jpg',
      'LIMITED',
      true,
      'ENTER THE MUGEN.'
    )
)
insert into public.products (
  slug,
  title,
  description,
  price_cents,
  currency,
  image_url,
  image_main,
  image_alt,
  status,
  is_active,
  tagline
)
select
  s.slug,
  s.title,
  s.description,
  s.price_cents,
  s.currency,
  s.image_url,
  s.image_url,
  s.image_url,
  s.status,
  s.is_active,
  s.tagline
from seed s
where not exists (
  select 1 from public.products p where p.slug = s.slug
);
