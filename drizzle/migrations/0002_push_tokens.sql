CREATE TABLE public.push_tokens (
  token text PRIMARY KEY,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX push_tokens_address_idx ON public.push_tokens (address);