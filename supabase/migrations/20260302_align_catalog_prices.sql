-- Realign live product prices with the storefront catalog values.
-- Safe to run multiple times.

with catalog(slug, price_cents, currency) as (
  values
    ('luffy-01', 200000, 'GMD'),
    ('luffy-02', 150000, 'GMD'),
    ('ichigo-01', 200000, 'GMD'),
    ('ichigo-02', 150000, 'GMD'),
    ('ulquiorra-01', 200000, 'GMD')
)
update public.products p
set
  price_cents = c.price_cents,
  currency = c.currency
from catalog c
where p.slug = c.slug
  and (
    p.price_cents is distinct from c.price_cents
    or p.currency is distinct from c.currency
  );
