-- Full data model for the BoxHauls backend, established up front so later
-- phases (bookings, driver accounts, payouts) don't need a fresh migration
-- cycle. Phase 1 (real geocoded pricing via POST /quote) does not query any
-- of these tables -- /quote is stateless. They exist now purely so the
-- schema is documented in one place and ready for the follow-up phases
-- (real booking + payment, driver accounts + matching, job lifecycle).

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_customers_email_phone ON customers(email, phone);

CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  truck_year INTEGER,
  truck_make_model TEXT,
  veriff_status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | denied
  veriff_denied_at TEXT,
  veriff_denial_count INTEGER NOT NULL DEFAULT 0,
  stripe_connect_account_id TEXT,
  stripe_connect_onboarded INTEGER NOT NULL DEFAULT 0, -- boolean
  rating_avg REAL,
  active INTEGER NOT NULL DEFAULT 0, -- boolean; false until Veriff + Connect onboarding complete
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE hauls (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  pickup_address TEXT NOT NULL,
  pickup_lat REAL,
  pickup_lng REAL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat REAL,
  dropoff_lng REAL,
  item TEXT NOT NULL,
  tier TEXT NOT NULL, -- tier-1 | tier-2 | tier-3
  distance_miles REAL NOT NULL,
  base_fare_cents INTEGER NOT NULL,
  mileage_cents INTEGER NOT NULL,
  helper_fee_cents INTEGER NOT NULL DEFAULT 0,
  heavy_fee_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  helper_requested INTEGER NOT NULL DEFAULT 0, -- boolean
  status TEXT NOT NULL DEFAULT 'pending_driver', -- pending_driver | accepted | in_progress | completed | canceled
  assigned_driver_id TEXT REFERENCES drivers(id),
  stripe_payment_intent_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  completed_at TEXT
);
CREATE INDEX idx_hauls_status ON hauls(status);
CREATE INDEX idx_hauls_customer ON hauls(customer_id);

-- Broadcast-and-first-accept job offers for automated matching (Phase 5+).
CREATE TABLE driver_job_offers (
  id TEXT PRIMARY KEY,
  haul_id TEXT NOT NULL REFERENCES hauls(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  status TEXT NOT NULL DEFAULT 'offered', -- offered | accepted | declined | expired
  offered_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT
);
CREATE INDEX idx_offers_haul ON driver_job_offers(haul_id);
CREATE INDEX idx_offers_driver_status ON driver_job_offers(driver_id, status);

-- Tracks the 20%-off first-haul promo's anti-abuse rule: once an
-- email/phone combination redeems it, that email, that phone, or any
-- combination of the two is disqualified from redeeming it again
-- (see [[FIRST_HAUL_PROMO]] in docs/placeholders.json).
CREATE TABLE promo_redemptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  haul_id TEXT NOT NULL REFERENCES hauls(id),
  redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_promo_email ON promo_redemptions(email);
CREATE INDEX idx_promo_phone ON promo_redemptions(phone);
