USE petcare_db;

-- T08: Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    remind_before_days INT NOT NULL DEFAULT 7,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);



-- T08: Create species table
CREATE TABLE IF NOT EXISTS species (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);



-- T08: Create pets table
CREATE TABLE IF NOT EXISTS pets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    species_id INT NOT NULL,
    breed VARCHAR(100),
    gender ENUM('MALE', 'FEMALE', 'UNKNOWN') DEFAULT 'UNKNOWN',
    birth_date DATE,
    color VARCHAR(100),
    avatar_url VARCHAR(500),
    note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pets_user
        FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT fk_pets_species
        FOREIGN KEY (species_id) REFERENCES species(id)
);




-- T08: Create weight_logs table
CREATE TABLE IF NOT EXISTS weight_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    weight_kg DECIMAL(6,2) NOT NULL,
    measured_at DATETIME NOT NULL,
    note TEXT,

    CONSTRAINT fk_weight_logs_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id),

    CONSTRAINT uq_weight_logs_pet_measured
        UNIQUE (pet_id, measured_at),

    CONSTRAINT chk_weight_logs_positive
        CHECK (weight_kg > 0)
);




-- T08: Create vaccine_types table
CREATE TABLE IF NOT EXISTS vaccine_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    species_id INT NOT NULL,
    interval_days INT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_vaccine_types_species
        FOREIGN KEY (species_id) REFERENCES species(id),

    CONSTRAINT chk_vaccine_types_interval
        CHECK (interval_days IS NULL OR interval_days > 0)
);




-- T08: Create vaccinations table
CREATE TABLE IF NOT EXISTS vaccinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    vaccine_type_id INT NOT NULL,
    given_date DATE NOT NULL,
    next_due_date DATE,
    clinic VARCHAR(255),
    note TEXT,

    CONSTRAINT fk_vaccinations_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id),

    CONSTRAINT fk_vaccinations_vaccine_type
        FOREIGN KEY (vaccine_type_id) REFERENCES vaccine_types(id),

    CONSTRAINT chk_vaccinations_due_date
        CHECK (
            next_due_date IS NULL
            OR next_due_date >= given_date
        )
);




-- T08: Create vet_visits table
CREATE TABLE IF NOT EXISTS vet_visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    visit_date DATE NOT NULL,
    clinic VARCHAR(255),
    reason TEXT,
    diagnosis TEXT,
    cost DECIMAL(12,2),
    note TEXT,

    CONSTRAINT fk_vet_visits_pet
        FOREIGN KEY (pet_id) REFERENCES pets(id),

    CONSTRAINT chk_vet_visits_cost
        CHECK (cost IS NULL OR cost >= 0)
);



