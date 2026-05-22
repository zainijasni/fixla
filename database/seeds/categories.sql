-- Seed: Service Categories
INSERT INTO service_categories (id, name, name_ms, slug) VALUES
  (uuid_generate_v4(), 'Electrical', 'Elektrikal', 'electrical'),
  (uuid_generate_v4(), 'Aircond', 'Penghawa Dingin', 'aircond'),
  (uuid_generate_v4(), 'Plumbing', 'Paip & Sanitari', 'plumbing'),
  (uuid_generate_v4(), 'Appliance Repair', 'Baiki Peralatan', 'appliance'),
  (uuid_generate_v4(), 'IT & Technology', 'IT & Teknologi', 'it-tech'),
  (uuid_generate_v4(), 'Handyman', 'Handyman', 'handyman')
ON CONFLICT (slug) DO NOTHING;

-- Seed: Subcategories — Electrical
INSERT INTO service_subcategories (id, category_id, name, name_ms)
SELECT uuid_generate_v4(), id, sub.name, sub.name_ms
FROM service_categories, (VALUES
  ('Fan Installation', 'Pasang Kipas'),
  ('Light Bulb Replacement', 'Tukar Mentol'),
  ('Switch & Socket Repair', 'Baiki Suis & Soket'),
  ('Water Heater Installation', 'Pasang Water Heater'),
  ('Circuit Breaker', 'Circuit Breaker'),
  ('CCTV Installation', 'Pasang CCTV')
) AS sub(name, name_ms)
WHERE service_categories.slug = 'electrical';

-- Seed: Subcategories — Aircond
INSERT INTO service_subcategories (id, category_id, name, name_ms)
SELECT uuid_generate_v4(), id, sub.name, sub.name_ms
FROM service_categories, (VALUES
  ('Aircond Service', 'Service Aircond'),
  ('Aircond Repair', 'Baiki Aircond'),
  ('New Aircond Installation', 'Pasang Aircond Baru'),
  ('Gas Refill', 'Isi Gas')
) AS sub(name, name_ms)
WHERE service_categories.slug = 'aircond';

-- Seed: Subcategories — Plumbing
INSERT INTO service_subcategories (id, category_id, name, name_ms)
SELECT uuid_generate_v4(), id, sub.name, sub.name_ms
FROM service_categories, (VALUES
  ('Pipe Leak Repair', 'Baiki Paip Bocor'),
  ('Toilet Repair', 'Baiki Toilet'),
  ('Sink Repair', 'Baiki Sink'),
  ('Water Pump & Tank', 'Pam Air & Tangki')
) AS sub(name, name_ms)
WHERE service_categories.slug = 'plumbing';

-- Seed: Subcategories — Appliance
INSERT INTO service_subcategories (id, category_id, name, name_ms)
SELECT uuid_generate_v4(), id, sub.name, sub.name_ms
FROM service_categories, (VALUES
  ('TV Repair', 'Baiki TV'),
  ('Refrigerator Repair', 'Baiki Peti Ais'),
  ('Washing Machine Repair', 'Baiki Mesin Basuh'),
  ('Microwave & Hood Repair', 'Baiki Microwave & Hood')
) AS sub(name, name_ms)
WHERE service_categories.slug = 'appliance';

-- Seed: Subcategories — IT & Tech
INSERT INTO service_subcategories (id, category_id, name, name_ms)
SELECT uuid_generate_v4(), id, sub.name, sub.name_ms
FROM service_categories, (VALUES
  ('Laptop/PC Repair', 'Baiki Laptop/Komputer'),
  ('Software Installation', 'Install Software'),
  ('Virus Removal', 'Buang Virus'),
  ('WiFi Setup', 'Setup WiFi'),
  ('Data Recovery', 'Pulih Data'),
  ('Phone Repair', 'Baiki Telefon')
) AS sub(name, name_ms)
WHERE service_categories.slug = 'it-tech';

-- Seed: Subcategories — Handyman
INSERT INTO service_subcategories (id, category_id, name, name_ms)
SELECT uuid_generate_v4(), id, sub.name, sub.name_ms
FROM service_categories, (VALUES
  ('Door & Window Repair', 'Baiki Pintu & Tingkap'),
  ('Wall Painting', 'Cat Dinding'),
  ('Furniture Assembly', 'Pasang Perabot'),
  ('Roof Leak', 'Bumbung Bocor'),
  ('Pest Control', 'Kawalan Perosak')
) AS sub(name, name_ms)
WHERE service_categories.slug = 'handyman';
