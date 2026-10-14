
USE petcare_db;

-- T09: Seed species data
INSERT INTO species (id, name)
VALUES
    (1, 'Dog'),
    (2, 'Cat'),
    (3, 'Rabbit')
AS new_species
ON DUPLICATE KEY UPDATE
    name = new_species.name;



-- T09: Seed vaccine types

INSERT INTO vaccine_types
    (name, species_id, interval_days, description, is_active)
SELECT
    v.name,
    s.id,
    v.interval_days,
    v.description,
    TRUE
FROM (
    SELECT 'Rabies - Dog' AS name, 'Dog' AS species_name,
           365 AS interval_days,
           'Demo rabies vaccine for dogs' AS description
    UNION ALL
    SELECT 'DHPP - Dog', 'Dog', 365,
           'Demo combination vaccine for dogs'
    UNION ALL
    SELECT 'Rabies - Cat', 'Cat', 365,
           'Demo rabies vaccine for cats'
    UNION ALL
    SELECT 'FVRCP - Cat', 'Cat', 365,
           'Demo combination vaccine for cats'
) AS v
JOIN species AS s
    ON s.name = v.species_name
WHERE NOT EXISTS (
    SELECT 1
    FROM vaccine_types AS existing
    WHERE existing.name = v.name
      AND existing.species_id = s.id
);




-- T09: Demo users


-- T09: Seed demo users
INSERT INTO users
    (name, email, password_hash, role)
VALUES
    (
        'Demo User',
        'demo@petcare.com',
        '$2b$12$GLVCTZRVAgN1/JAowuRlDOqItMXfkS19V678k6AOscqIgSkcrnL9G',
        'USER'
    ),
    (
        'PetCare Admin',
        'admin@petcare.com',
        '$2b$12$ON8LPA2QUIvEjp6U9.OZzeUF2ZCMGQaPtBEXTEMgVZhf6LijO15Oa',
        'ADMIN'
        )
AS new_user
ON DUPLICATE KEY UPDATE
    name = new_user.name,
    role = new_user.role;



-- T09: Demo pets
-- These pets will belong to demo@petcare.com.


INSERT INTO pets
    (user_id, name, species_id, breed, gender,
     birth_date, color, note)
SELECT
    u.id,
    pet.name,
    s.id,
    pet.breed,
    pet.gender,
    pet.birth_date,
    pet.color,
    pet.note
FROM (
    SELECT
        'Milo' AS name,
        'Dog' AS species_name,
        'Poodle' AS breed,
        'MALE' AS gender,
        '2023-05-12' AS birth_date,
        'Brown' AS color,
        'Friendly and active' AS note
    UNION ALL
    SELECT 'Luna', 'Cat', 'British Shorthair',
           'FEMALE', '2022-09-20',
           'Gray', 'Calm and playful'
    UNION ALL
    SELECT 'Bunny', 'Rabbit', 'Holland Lop',
           'FEMALE', '2024-02-15',
           'White', 'Loves carrots'
) AS pet
JOIN users AS u
    ON u.email = 'demo@petcare.com'
JOIN species AS s
    ON s.name = pet.species_name
WHERE NOT EXISTS (
    SELECT 1
    FROM pets AS existing
    WHERE existing.user_id = u.id
      AND existing.name = pet.name
);





-- T09: Demo weight history

INSERT INTO weight_logs
    (pet_id, weight_kg, measured_at, note)
VALUES
    (
        (SELECT id FROM pets WHERE name = 'Milo'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        4.20,
        '2026-08-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Milo'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        4.50,
        '2026-09-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Milo'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        4.70,
        '2026-10-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Luna'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        3.80,
        '2026-08-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Luna'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        3.90,
        '2026-09-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Luna'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        4.00,
        '2026-10-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Bunny'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        1.50,
        '2026-08-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Bunny'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        1.60,
        '2026-09-01 09:00:00',
        'Monthly weight check'
    ),
    (
        (SELECT id FROM pets WHERE name = 'Bunny'
         AND user_id = (SELECT id FROM users
         WHERE email = 'demo@petcare.com')),
        1.70,
        '2026-10-01 09:00:00',
        'Monthly weight check'
       )
AS new_weight
ON DUPLICATE KEY UPDATE
    weight_kg = new_weight.weight_kg,
    note = new_weight.note;
    



-- T09: Demo vaccination history


INSERT INTO vaccinations
    (pet_id, vaccine_type_id, given_date,
     next_due_date, clinic, note)
SELECT
    p.id,
    vt.id,
    v.given_date,
    v.next_due_date,
    'PetCare Demo Clinic',
    'Demo vaccination record'
FROM (
    SELECT 'Milo' AS pet_name,
           'Rabies - Dog' AS vaccine_name,
           '2026-05-15' AS given_date,
           '2027-05-15' AS next_due_date
    UNION ALL
    SELECT 'Milo', 'DHPP - Dog',
           '2026-06-10', '2027-06-10'
    UNION ALL
    SELECT 'Luna', 'FVRCP - Cat',
           '2026-04-20', '2027-04-20'
) AS v
JOIN users AS u
    ON u.email = 'demo@petcare.com'
JOIN pets AS p
    ON p.user_id = u.id
   AND p.name = v.pet_name
JOIN vaccine_types AS vt
    ON vt.name = v.vaccine_name
WHERE NOT EXISTS (
    SELECT 1
    FROM vaccinations AS existing
    WHERE existing.pet_id = p.id
      AND existing.vaccine_type_id = vt.id
      AND existing.given_date = v.given_date
);




-- T09: Demo vet visit history


INSERT INTO vet_visits
    (pet_id, visit_date, clinic, reason,
     diagnosis, cost, note)
SELECT
    p.id,
    v.visit_date,
    'PetCare Demo Clinic',
    v.reason,
    v.diagnosis,
    v.cost,
    v.note
FROM (
    SELECT
        'Milo' AS pet_name,
        '2026-07-10' AS visit_date,
        'Routine health check' AS reason,
        'Healthy' AS diagnosis,
        250000 AS cost,
        'Annual checkup' AS note
    UNION ALL
    SELECT 'Luna', '2026-08-15',
           'Skin irritation', 'Mild dermatitis',
           350000, 'Follow-up if symptoms persist'
    UNION ALL
    SELECT 'Bunny', '2026-09-05',
           'Routine health check', 'Healthy',
           200000, 'General wellness check'
) AS v
JOIN users AS u
    ON u.email = 'demo@petcare.com'
JOIN pets AS p
    ON p.user_id = u.id
   AND p.name = v.pet_name
WHERE NOT EXISTS (
    SELECT 1
    FROM vet_visits AS existing
    WHERE existing.pet_id = p.id
      AND existing.visit_date = v.visit_date
      AND existing.clinic = 'PetCare Demo Clinic'
      AND existing.reason = v.reason
);
