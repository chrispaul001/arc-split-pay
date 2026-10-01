CREATE TABLE public.wallet_transactions (
  address text NOT NULL,
  hash text NOT NULL,
  record jsonb NOT NULL,
  tx_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (address, hash)
);
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX wallet_transactions_addr_time ON public.wallet_transactions (address, tx_time DESC);