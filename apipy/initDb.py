import sqlite3
import uuid

conn = sqlite3.connect('aquario.db')
cursor = conn.cursor()

# Create a table for tank enclosures
cursor.execute('''
CREATE TABLE IF NOT EXISTS tanks (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT
)
''')

# Create a table for reservoirs
cursor.execute('''
CREATE TABLE IF NOT EXISTS reservoirs (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT
)
''')

# Create a table for tank settings
cursor.execute('''
CREATE TABLE IF NOT EXISTS tank_settings (
    id TEXT PRIMARY KEY,
    tank_id TEXT,
    drain_time INTEGER,
    fill_time INTEGER,
    has_reservoir INTEGER DEFAULT 0,
    lower_temp_limit FLOAT,
    upper_temp_limit FLOAT,
    water_level FLOAT,
    service_status INTEGER DEFAULT 0,
    FOREIGN KEY (tank_id) REFERENCES tanks(id)
)
''')

# Create a table for reservoir settings
cursor.execute('''
CREATE TABLE IF NOT EXISTS reservoir_settings (
    id TEXT PRIMARY KEY,
    reservoir_id TEXT,
    fill_time INTEGER,
    water_level FLOAT,
    FOREIGN KEY (reservoir_id) REFERENCES reservoirs(id)
)
''')

# Create a table for tanks
cursor.execute('''
CREATE TABLE IF NOT EXISTS sensors (
    id TEXT PRIMARY KEY,
    container_id TEXT,
    container_type TEXT,
    sensor_type TEXT,
    name TEXT,
    location TEXT
)
''')

# Create a table for animal, associated with tanks
cursor.execute('''
CREATE TABLE IF NOT EXISTS animals (
    id TEXT PRIMARY KEY,
    name TEXT,
    sex TEXT,
    color TEXT,
    species TEXT,
    species_latin TEXT,
    enclosure_type TEXT,
    enclosure_id TEXT,
    image_url TEXT
)
''')

# Adjust the feeding table to include a reference to animals
cursor.execute('''
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    container_id TEXT,
    animal_id TEXT,
    action_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    log_json JSON
)
''')

tankId = str(uuid.uuid4())
# Define initial data
initial_tanks = [
    (tankId, 'Axolotl Tank', 'Freshwater'),
]

resId = str(uuid.uuid4())

initial_reservoirs = [
    (resId,'Reservoir Tank', 'Freshwater'),
]

initial_tank_settings = [
    (str(uuid.uuid4()), tankId, 30, 30, False, 18, 16, 0, 0)
]

initial_reservoir_settings = [
    (str(uuid.uuid4()),resId, 30, 0)
]

initial_sensor_settings = [
    ('28-0120626a06c9', 'Surface Temperature', 'Thermometer', tankId, 'Aquarium'),
]

animalid = str(uuid.uuid4())
initial_animals = [
    (animalid, "Cake Pop", 'Axolotl', 'Ambystoma mexicanum', "../assets/axie-cakepop.jpg", tankId, 'Aquarium'),
]

initial_logs = [
    (str(uuid.uuid4()),'Feeding', '2024-02-17 04:20:00', animalid, '{"food_type":"Test Pellet", "quantity": 1}'),
]

initial_states = [
    (str(uuid.uuid4()), '2024-01-10 10:00:00', 25.5, 7.8),
]

# Insert initial data
cursor.executemany("INSERT INTO tanks (id, name, type) VALUES (?, ?, ?)", initial_tanks)
cursor.executemany("INSERT INTO reservoirs (id, name, type) VALUES (?, ?, ?)", initial_reservoirs)
cursor.executemany("INSERT INTO tank_settings (id, tank_id, drain_time, fill_time, has_reservoir, upper_temp_limit, lower_temp_limit, water_level, service_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", initial_tank_settings)
cursor.executemany("INSERT INTO reservoir_settings (id, reservoir_id, fill_time, water_level) VALUES (?, ?, ?, ?)", initial_reservoir_settings)
cursor.executemany("INSERT INTO animals (id, name, species, species_latin, image_url, enclosure_id, enclosure_type) VALUES (?, ?, ?, ?, ?,?,?)", initial_animals)
cursor.executemany("INSERT INTO sensors (id, name, sensor_type, container_id, container_type) VALUES (?, ?, ?, ?, ?)", initial_sensor_settings)
cursor.executemany("INSERT INTO logs (id, action_type, timestamp, animal_id, log_json) VALUES (?, ?, ?, ?, ?)", initial_logs)

conn.commit()
conn.close()
