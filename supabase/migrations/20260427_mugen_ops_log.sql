CREATE TABLE IF NOT EXISTS mugen_ops_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL,
  target_sku text,
  field_changed text,
  value_before jsonb,
  value_after jsonb,
  executed_at timestamptz DEFAULT now(),
  reverted_at timestamptz,
  reverted boolean DEFAULT false,
  notes text
);

CREATE INDEX IF NOT EXISTS mugen_ops_log_executed_at_idx ON mugen_ops_log (executed_at DESC);
CREATE INDEX IF NOT EXISTS mugen_ops_log_target_sku_idx ON mugen_ops_log (target_sku);
