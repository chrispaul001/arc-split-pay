CREATE TABLE public.merchant_profiles (
  address text PRIMARY KEY CHECK (address ~ '^0x[0-9a-f]{40}$'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  brand jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.merchant_profiles TO service_role;
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;
-- No client policies: access only through wallet-signature-verified server functions.