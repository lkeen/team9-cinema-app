-- ═══════════════════════════════════════════════
-- Sprint 3 / Deliverable 6 - Seed Data
-- Showrooms, Showtimes, and Sample Bookings
-- ═══════════════════════════════════════════════

-- ─── Ticket Prices ───

INSERT INTO ticket_prices (ticket_type, base_price, valid_from, valid_to) VALUES
  ('adult', 12.00, '2026-01-01', NULL),
  ('child', 8.00, '2026-01-01', NULL),
  ('senior', 10.00, '2026-01-01', NULL);

-- ─── Showrooms (3 required) ───

INSERT INTO showrooms (name, capacity, `rows`, cols) VALUES
  ('Showroom 1', 80, 8, 10),
  ('Showroom 2', 60, 6, 10),
  ('Showroom 3', 100, 10, 10);

-- ─── Showtimes (sample data for demo) ───
-- Uses movie_id references from seed.sql (movies 1-9)
-- Dates are set relative to current period for demo readiness

INSERT INTO showtimes (movie_id, showroom_id, show_date, show_time) VALUES
  -- Movie 1: I Can Only Imagine 2 (Now Playing)
  (1, 1, '2026-04-15', '14:00:00'),
  (1, 1, '2026-04-15', '17:00:00'),
  (1, 2, '2026-04-15', '20:00:00'),
  (1, 1, '2026-04-16', '14:00:00'),
  (1, 3, '2026-04-16', '17:00:00'),

  -- Movie 2: Zootopia 2 (Now Playing)
  (2, 2, '2026-04-15', '14:00:00'),
  (2, 2, '2026-04-15', '17:00:00'),
  (2, 3, '2026-04-15', '20:00:00'),
  (2, 1, '2026-04-16', '17:00:00'),

  -- Movie 3: Solo Mio (Now Playing)
  (3, 3, '2026-04-15', '14:00:00'),
  (3, 3, '2026-04-15', '17:00:00'),
  (3, 1, '2026-04-15', '20:00:00'),

  -- Movie 4: This Is Not a Test (Now Playing)
  (4, 1, '2026-04-16', '20:00:00'),
  (4, 2, '2026-04-16', '14:00:00'),
  (4, 2, '2026-04-16', '17:00:00'),

  -- Movie 5: Wuthering Heights (Now Playing)
  (5, 3, '2026-04-16', '14:00:00'),
  (5, 3, '2026-04-16', '20:00:00'),

  -- Movie 6: Send Help (Now Playing)
  (6, 2, '2026-04-16', '20:00:00'),
  (6, 1, '2026-04-17', '14:00:00'),
  (6, 2, '2026-04-17', '17:00:00');
