-- ============================================================================
-- ExoPet — Unified Habitat Automation Schema
-- Covers home hobbyist enclosures through zoological-scale facilities
-- ============================================================================

-- ############################################################################
-- 0. ENUMERATIONS & REFERENCE TYPES
-- ############################################################################

CREATE TYPE enclosure_scale AS ENUM (
    'nano',            -- < 10 gal / < 1 m²   (desktop tanks, insect cups)
    'micro',           -- 10–40 gal / 1–4 m²  (home terrariums, small aquariums)
    'small',           -- 40–200 gal / 4–20 m² (large tanks, walk-in vivariums)
    'medium',          -- 20–100 m²            (outdoor aviaries, pond systems)
    'large',           -- 100–2 000 m²         (zoo exhibits, barn enclosures)
    'campus',          -- 2 000–50 000 m²      (safari sections, marine parks)
    'landscape'        -- 50 000+ m²           (drive-through safari, open-range)
);

CREATE TYPE device_category AS ENUM (
    'sensor',
    'actuator',
    'controller',
    'gateway',
    'camera',
    'alarm'
);

CREATE TYPE actuator_type AS ENUM (
    'valve',           -- solenoid / proportional / ball / butterfly
    'pump',            -- peristaltic / centrifugal / dosing / sump
    'heater',          -- immersion / ceramic / radiant panel / heat mat
    'chiller',         -- thermoelectric / compressor / inline
    'humidifier',      -- ultrasonic / evaporative / fogging nozzle
    'dehumidifier',
    'fan',             -- exhaust / circulation / misting fan
    'blower',          -- HVAC blower / air handler
    'motor',           -- gate / door / conveyor / shade / retractable roof
    'light',           -- LED panel / UVB tube / basking lamp / moonlight
    'feeder',          -- timed hopper / auger / live-food dispenser / broadcast
    'mister',          -- rain bar / drip wall / fog system
    'aerator',         -- air stone / venturi / surface skimmer
    'skimmer',         -- protein skimmer / surface skimmer
    'dosing_pump',     -- chemical / supplement / medication
    'wavemaker',       -- powerhead / gyre pump
    'lock',            -- electromagnetic door / gate lock
    'speaker',         -- enrichment audio / alarm siren
    'shade',           -- motorised shade cloth / retractable canopy
    'sprinkler',       -- irrigation / cooling mist line
    'ozoniser',
    'uv_steriliser'
);

CREATE TYPE sensor_type AS ENUM (
    'temperature',
    'humidity',
    'barometric_pressure',
    'water_temperature',
    'water_level',
    'water_flow',
    'water_pressure',
    'ph',
    'orp',              -- oxidation-reduction potential
    'dissolved_oxygen',
    'salinity',
    'conductivity',
    'tds',              -- total dissolved solids
    'ammonia',
    'nitrite',
    'nitrate',
    'phosphate',
    'calcium',
    'alkalinity',
    'co2',
    'light_par',        -- photosynthetically active radiation
    'light_lux',
    'uv_index',
    'wind_speed',
    'rain_gauge',
    'soil_moisture',
    'air_quality',      -- VOC / particulate
    'sound_level',
    'vibration',
    'motion',           -- PIR / microwave
    'weight',           -- platform scale under perch / nest / basking spot
    'water_turbidity',
    'chlorine',
    'current_draw',     -- electrical monitoring on equipment
    'door_contact',     -- mag switch on gates / lids
    'gps',              -- animal or vehicle tracker in open-range
    'rfid'              -- animal ID / keeper badge
);

CREATE TYPE invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'revoked'
);

CREATE TYPE access_role AS ENUM (
    'owner',           -- full control, can delete facility, manage billing
    'admin',           -- manage devices, rules, users — cannot delete facility
    'veterinarian',    -- read all, write medical/animal records, issue commands
    'keeper',          -- read own zones, feed/clean/command devices in granted scopes
    'technician',      -- device maintenance, calibration, plumbing — no animal records
    'volunteer',       -- read-only + limited feeding/cleaning actions
    'viewer'           -- read-only dashboard and alerts
);

CREATE TYPE access_scope_type AS ENUM (
    'facility',        -- access to everything in a facility
    'zone',            -- access to a zone and all enclosures within it
    'enclosure'        -- access to a single enclosure only
);

CREATE TYPE permission AS ENUM (
    'view_telemetry',
    'view_animals',
    'view_devices',
    'view_alerts',
    'acknowledge_alerts',
    'command_actuators',
    'manage_schedules',
    'manage_rules',
    'manage_devices',
    'manage_animals',
    'manage_enclosures',
    'manage_species',
    'manage_plumbing',
    'perform_maintenance',
    'calibrate_devices',
    'invite_users',
    'manage_users',
    'manage_facility',
    'export_data',
    'view_audit_log'
);

CREATE TYPE alert_severity AS ENUM (
    'info',
    'warning',
    'critical',
    'emergency'         -- triggers keeper callout / facility lockdown
);

CREATE TYPE reading_status AS ENUM (
    'nominal',
    'caution',
    'alarm',
    'fault',            -- sensor itself is malfunctioning
    'offline'
);

CREATE TYPE command_status AS ENUM (
    'queued',
    'sent',
    'acknowledged',
    'executed',
    'failed',
    'timeout'
);


-- ############################################################################
-- 1. ORGANISATIONAL HIERARCHY
-- ############################################################################

-- Top-level: a facility can be a home, a vet clinic, a zoo, a sanctuary, etc.
CREATE TABLE facilities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    facility_type       TEXT NOT NULL,          -- 'home','zoo','sanctuary','aquarium','farm','research_lab','vet_clinic','rescue'
    address             JSONB,
    gps_lat             NUMERIC(9,6),
    gps_lon             NUMERIC(9,6),
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    owner_user_id       UUID REFERENCES users(id), -- facility owner
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A facility is divided into sites / buildings / zones
CREATE TABLE zones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    parent_zone_id      UUID REFERENCES zones(id),       -- allows nesting: building → wing → room
    name                TEXT NOT NULL,
    zone_type           TEXT,                             -- 'building','wing','room','outdoor_paddock','underwater_tunnel','greenhouse'
    area_m2             NUMERIC(12,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################################
-- 2. ENCLOSURE TAXONOMY  (the big list)
-- ############################################################################

-- Canonical catalogue of enclosure archetypes.
-- Individual enclosures reference a type from this table.
CREATE TABLE enclosure_types (
    id                  SERIAL PRIMARY KEY,
    category            TEXT NOT NULL,        -- grouping label (see INSERT block below)
    name                TEXT NOT NULL UNIQUE,
    description         TEXT,
    typical_scale       enclosure_scale NOT NULL,
    is_aquatic          BOOLEAN NOT NULL DEFAULT FALSE,
    is_semi_aquatic     BOOLEAN NOT NULL DEFAULT FALSE,
    is_terrestrial      BOOLEAN NOT NULL DEFAULT TRUE,
    is_arboreal         BOOLEAN NOT NULL DEFAULT FALSE,
    is_aerial           BOOLEAN NOT NULL DEFAULT FALSE,
    is_subterranean     BOOLEAN NOT NULL DEFAULT FALSE,
    climate_controlled  BOOLEAN NOT NULL DEFAULT FALSE,
    outdoor             BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO enclosure_types
    (category, name, typical_scale,
     is_aquatic, is_semi_aquatic, is_terrestrial, is_arboreal, is_aerial, is_subterranean,
     climate_controlled, outdoor, description)
VALUES
-- ── Aquatic — Freshwater ────────────────────────────────────────────────
('aquatic_freshwater', 'nano_freshwater_tank',          'nano',   TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Desktop planted tank or betta cube (< 10 gal)'),
('aquatic_freshwater', 'standard_freshwater_aquarium',  'micro',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Typical home freshwater tank 10–75 gal'),
('aquatic_freshwater', 'large_freshwater_aquarium',     'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, '75–300 gal show tank or monster-fish setup'),
('aquatic_freshwater', 'freshwater_pond',               'medium', TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Outdoor koi / goldfish pond'),
('aquatic_freshwater', 'freshwater_stream_table',       'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Hillstream / riffle simulation with current pumps'),
('aquatic_freshwater', 'freshwater_exhibit_tank',       'large',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Public-aquarium freshwater gallery (300+ gal)'),
('aquatic_freshwater', 'amazon_flooded_forest_exhibit', 'large',  TRUE,TRUE, FALSE,TRUE, FALSE,FALSE, TRUE,FALSE,  'Seasonal flood simulation with emergent trees'),

-- ── Aquatic — Marine / Saltwater ────────────────────────────────────────
('aquatic_marine', 'nano_reef_tank',                    'nano',   TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Pico / nano reef under 30 gal'),
('aquatic_marine', 'standard_reef_aquarium',            'micro',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Home reef 30–150 gal'),
('aquatic_marine', 'large_reef_aquarium',               'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, '150–500 gal SPS / mixed reef'),
('aquatic_marine', 'fish_only_marine_tank',             'micro',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'FOWLR (fish only with live rock)'),
('aquatic_marine', 'predator_marine_tank',              'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Shark / eel / lion-fish display'),
('aquatic_marine', 'jellyfish_kreisel',                 'micro',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Circular-flow kreisel for jellyfish'),
('aquatic_marine', 'cephalopod_tank',                   'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Escape-proof octopus / cuttlefish enclosure'),
('aquatic_marine', 'seahorse_tank',                     'micro',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Low-flow tall tank for syngnathids'),
('aquatic_marine', 'coral_frag_propagation_rack',       'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Multi-tray coral grow-out system'),
('aquatic_marine', 'touch_pool',                        'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Shallow open-top interactive pool'),
('aquatic_marine', 'open_ocean_exhibit',                'campus', TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Multi-million-gallon pelagic tank (tuna, sharks, rays)'),
('aquatic_marine', 'kelp_forest_exhibit',               'large',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Tall column tank with surge simulation'),
('aquatic_marine', 'tidal_pool_exhibit',                'medium', TRUE,TRUE, TRUE, FALSE,FALSE,FALSE, TRUE,FALSE,  'Tide-cycling shallow pool exhibit'),

-- ── Aquatic — Brackish ─────────────────────────────────────────────────
('aquatic_brackish', 'brackish_aquarium',               'micro',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Mangrove / mudskipper / archer-fish tank'),
('aquatic_brackish', 'mangrove_lagoon_exhibit',         'large',  TRUE,TRUE, TRUE, TRUE, FALSE,FALSE, TRUE,TRUE,   'Zoo-scale mangrove with tidal cycling'),

-- ── Semi-Aquatic / Paludarium ──────────────────────────────────────────
('semi_aquatic', 'paludarium',                          'micro',  FALSE,TRUE,TRUE,TRUE,FALSE,FALSE, FALSE,FALSE, 'Half land / half water vivarium'),
('semi_aquatic', 'riparium',                            'micro',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Emerged riverbank planting with waterline'),
('semi_aquatic', 'turtle_basking_tank',                 'small',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Aquatic area + dry basking dock + UVB'),
('semi_aquatic', 'crocodilian_enclosure',               'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Deep pool + land + basking + heavy security'),
('semi_aquatic', 'hippo_pool_exhibit',                  'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,TRUE,   'Underwater viewing + mud wallow + land area'),
('semi_aquatic', 'penguin_exhibit',                     'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Chilled pool + rocky haul-out + snow machine'),
('semi_aquatic', 'otter_habitat',                       'medium', FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Stream channel + slides + den boxes'),
('semi_aquatic', 'beaver_lodge_exhibit',                'medium', FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Flowing water + dam structure + lodge viewing'),
('semi_aquatic', 'amphibian_shoreline',                 'small',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Simulated pond edge for newts, salamanders'),
('semi_aquatic', 'flamingo_lagoon',                     'medium', FALSE,TRUE,TRUE,FALSE,TRUE, FALSE, FALSE,TRUE,  'Shallow wading lagoon with nesting islands'),
('semi_aquatic', 'seal_sea_lion_pool',                  'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,TRUE,   'Saltwater pool with haul-out + show stage'),

-- ── Terrarium / Vivarium — Tropical ────────────────────────────────────
('terrestrial_tropical', 'tropical_vivarium',           'micro',  FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, FALSE,FALSE, 'High-humidity planted tank for dart frogs, geckos'),
('terrestrial_tropical', 'bioactive_terrarium',         'micro',  FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, FALSE,FALSE, 'Self-cleaning ecosystem with CUC'),
('terrestrial_tropical', 'large_tropical_vivarium',     'small',  FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, TRUE,FALSE,  'Walk-in or floor-to-ceiling arboreal display'),
('terrestrial_tropical', 'rainforest_dome',             'large',  FALSE,TRUE,TRUE,TRUE,TRUE,FALSE,   TRUE,FALSE,  'Zoo biome dome with canopy walkway'),
('terrestrial_tropical', 'cloud_forest_exhibit',        'large',  FALSE,TRUE,TRUE,TRUE,FALSE,FALSE,  TRUE,FALSE,  'Cool foggy highland habitat'),

-- ── Terrarium / Vivarium — Arid / Desert ───────────────────────────────
('terrestrial_arid', 'arid_terrarium',                  'micro',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Low-humidity tank for leopard geckos, uro, etc.'),
('terrestrial_arid', 'large_desert_terrarium',          'small',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Sand substrate, hot basking, deep-heat projector'),
('terrestrial_arid', 'desert_exhibit',                  'large',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,TRUE,FALSE,  'Zoo-scale desert biome with burrowing areas'),
('terrestrial_arid', 'outdoor_tortoise_pen',            'medium', FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,TRUE,  'Walled garden with hides, burrows, UVB access'),

-- ── Terrarium — Temperate ──────────────────────────────────────────────
('terrestrial_temperate', 'temperate_woodland_vivarium','micro',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Moderate humidity/temp for fire salamanders, etc.'),
('terrestrial_temperate', 'temperate_grassland_exhibit','large',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,  'Open paddock for prairie species, burrowing owls'),

-- ── Fossorial / Subterranean ───────────────────────────────────────────
('subterranean', 'ant_formicarium',                     'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,FALSE, 'Ant farm with nest chambers + outworld'),
('subterranean', 'burrowing_display',                   'micro',  FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,FALSE, 'Cross-section terrarium for mole rats, tarantulas'),
('subterranean', 'underground_exhibit',                 'medium', FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, TRUE,FALSE,  'Zoo walk-through tunnel for nocturnal burrowers'),

-- ── Arboreal / Canopy ──────────────────────────────────────────────────
('arboreal', 'tall_arboreal_enclosure',                 'small',  FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE, 'Vertical mesh/glass for chameleons, tree pythons'),
('arboreal', 'free_range_chameleon_room',               'medium', FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,TRUE,FALSE,  'Whole-room chameleon setup with live plants'),
('arboreal', 'primate_climbing_exhibit',                'large',  FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, TRUE,FALSE,  'Multi-storey with ropes, platforms, enrichment'),
('arboreal', 'sloth_canopy_exhibit',                    'large',  FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,TRUE,FALSE,  'High canopy with slow-traverse rigging'),
('arboreal', 'koala_eucalyptus_exhibit',                'medium', FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,TRUE,FALSE,  'Branching structure with browse feeding stations'),

-- ── Aviary / Flight ────────────────────────────────────────────────────
('aviary', 'indoor_bird_cage',                          'nano',   FALSE,FALSE,FALSE,TRUE,TRUE,FALSE, FALSE,FALSE, 'Single-bird or pair cage for parrots, finches'),
('aviary', 'flight_cage',                               'micro',  FALSE,FALSE,FALSE,TRUE,TRUE,FALSE, FALSE,FALSE, 'Room-sized mesh enclosure for flight exercise'),
('aviary', 'walk_in_aviary',                            'medium', FALSE,FALSE,TRUE,TRUE,TRUE,FALSE,  FALSE,TRUE,  'Outdoor planted aviary visitors can enter'),
('aviary', 'free_flight_aviary',                        'large',  FALSE,TRUE,TRUE,TRUE,TRUE,FALSE,   TRUE,FALSE,  'Zoo dome / netted canyon for mixed-species flight'),
('aviary', 'raptor_mews',                               'small',  FALSE,FALSE,TRUE,FALSE,TRUE,FALSE, FALSE,TRUE,  'Weathering yard + indoor mews for falconry birds'),
('aviary', 'penguin_aviary',                            'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Chilled air + pool + artificial snow'),
('aviary', 'bat_cave_exhibit',                          'medium', FALSE,FALSE,TRUE,FALSE,TRUE,TRUE,  TRUE,FALSE,  'Inverted-cycle dark exhibit with flight space'),
('aviary', 'hummingbird_house',                         'medium', FALSE,FALSE,FALSE,TRUE,TRUE,FALSE, TRUE,FALSE,  'Tropical greenhouse with feeders and flowers'),

-- ── Invertebrate Specific ──────────────────────────────────────────────
('invertebrate', 'tarantula_enclosure',                 'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,FALSE, 'Small acrylic box or critter keeper'),
('invertebrate', 'scorpion_enclosure',                  'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,FALSE, 'Dry substrate, hide, heat mat'),
('invertebrate', 'isopod_colony_bin',                   'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,FALSE, 'Shoebox tub with leaf litter and bark'),
('invertebrate', 'millipede_terrarium',                 'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,FALSE, 'Deep substrate column for giant millipedes'),
('invertebrate', 'mantis_enclosure',                    'nano',   FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE, 'Tall mesh cup or small vivarium'),
('invertebrate', 'butterfly_house',                     'medium', FALSE,FALSE,TRUE,TRUE,TRUE,FALSE,  TRUE,FALSE,  'Greenhouse with host plants and emergence cages'),
('invertebrate', 'bee_observation_hive',                'nano',   FALSE,FALSE,TRUE,FALSE,TRUE,FALSE, FALSE,FALSE, 'Glass-walled hive with outdoor access tube'),
('invertebrate', 'hermit_crab_crabitat',                'micro',  FALSE,TRUE,TRUE,TRUE,FALSE,FALSE,  FALSE,FALSE, 'Humid tank with saltwater pool and climbing decor'),
('invertebrate', 'giant_snail_terrarium',               'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Humid tub with calcium and greens'),
('invertebrate', 'leaf_cutter_ant_exhibit',             'medium', FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, TRUE,FALSE,  'Multi-chamber fungus garden with foraging trails'),

-- ── Reptile Specific ───────────────────────────────────────────────────
('reptile', 'snake_rack_system',                        'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Tub rack with belly heat for breeding collections'),
('reptile', 'monitor_lizard_enclosure',                 'small',  FALSE,TRUE,TRUE,TRUE,FALSE,TRUE,   FALSE,FALSE, 'Large multi-zone for water monitors, tegus'),
('reptile', 'iguana_room',                              'medium', FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, TRUE,FALSE,  'Dedicated room-scale setup with basking shelves'),
('reptile', 'komodo_dragon_exhibit',                    'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,TRUE,   'Heavy security, heated ground, wallow, sun access'),
('reptile', 'sea_turtle_rehabilitation_tank',           'large',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,FALSE,  'Round shallow hospital pool with gentle flow'),
('reptile', 'alligator_snapping_turtle_pool',           'small',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Deep murky-water setup with minimal land'),
('reptile', 'egg_incubator',                            'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,TRUE,FALSE,  'Precision temp/humidity chamber for egg clutches'),

-- ── Amphibian Specific ─────────────────────────────────────────────────
('amphibian', 'dart_frog_vivarium',                     'nano',   FALSE,TRUE,TRUE,TRUE,FALSE,FALSE,  FALSE,FALSE, 'Tropical bioactive with drip wall, bromeliads'),
('amphibian', 'axolotl_tank',                           'micro',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Cold freshwater, no land, low flow'),
('amphibian', 'pac_man_frog_tub',                       'nano',   FALSE,TRUE,TRUE,FALSE,FALSE,TRUE,  FALSE,FALSE, 'Shallow moist substrate sit-and-wait setup'),
('amphibian', 'salamander_stream_vivarium',             'micro',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,FALSE, 'Cool flowing water with mossy banks'),

-- ── Small Mammal ───────────────────────────────────────────────────────
('small_mammal', 'rodent_cage',                         'nano',   FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, FALSE,FALSE, 'Wire-bar or bin cage for hamsters, gerbils, mice'),
('small_mammal', 'guinea_pig_c_and_c_cage',             'micro',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Coroplast + grid modular pen'),
('small_mammal', 'rabbit_hutch',                        'micro',  FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,TRUE,  'Hutch + run with dig-proof floor'),
('small_mammal', 'chinchilla_tower',                    'micro',  FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, FALSE,FALSE, 'Multi-storey cool-temp cage with ledges'),
('small_mammal', 'ferret_nation_cage',                  'micro',  FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, FALSE,FALSE, 'Multi-level ferret housing'),
('small_mammal', 'sugar_glider_aviary',                 'small',  FALSE,FALSE,FALSE,TRUE,TRUE,FALSE, FALSE,FALSE, 'Tall cage with pouches, branches, enrichment'),
('small_mammal', 'hedgehog_vivarium',                   'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, 'Warm substrate tank with wheel and hides'),
('small_mammal', 'prairie_dog_exhibit',                 'medium', FALSE,FALSE,TRUE,FALSE,FALSE,TRUE, FALSE,TRUE,  'Deep-dig outdoor pen with burrow viewing'),
('small_mammal', 'nocturnal_small_mammal_house',        'medium', FALSE,FALSE,TRUE,TRUE,FALSE,TRUE,  TRUE,FALSE,  'Red-lit walk-through for bats, lorises, aye-ayes'),

-- ── Large Mammal — Zoo ─────────────────────────────────────────────────
('large_mammal', 'elephant_habitat',                    'campus', FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Multi-acre paddock, pool, mud wallow, barn'),
('large_mammal', 'great_ape_habitat',                   'large',  FALSE,FALSE,TRUE,TRUE,FALSE,FALSE, TRUE,TRUE,   'Indoor/outdoor with climbing, nesting, viewing'),
('large_mammal', 'big_cat_exhibit',                     'large',  FALSE,TRUE,TRUE,TRUE,FALSE,FALSE,  TRUE,TRUE,   'Moated paddock with pool, climbing, heated dens'),
('large_mammal', 'bear_exhibit',                        'large',  FALSE,TRUE,TRUE,TRUE,FALSE,TRUE,   TRUE,TRUE,   'Varied terrain, pool, den, foraging enrichment'),
('large_mammal', 'giraffe_barn_and_yard',               'large',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,TRUE,TRUE,   'Tall barn + paddock with elevated feeding stations'),
('large_mammal', 'rhino_paddock',                       'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Mud wallow, reinforced barrier, heated barn'),
('large_mammal', 'marine_mammal_stadium',               'large',  TRUE,TRUE,TRUE,FALSE,FALSE,FALSE,  TRUE,FALSE,  'Performance pool + medical pool + haul-out'),
('large_mammal', 'polar_bear_exhibit',                  'large',  FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Deep chilled pool + artificial snow + den'),
('large_mammal', 'bat_roost_barn',                      'medium', FALSE,FALSE,TRUE,FALSE,TRUE,FALSE, TRUE,FALSE,  'Barn-scale free-flight for large fruit bats'),

-- ── Open-Range / Safari ────────────────────────────────────────────────
('open_range', 'drive_through_safari_paddock',          'landscape',FALSE,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE, 'Vehicle-traversable multi-species savanna'),
('open_range', 'walk_through_safari_trail',             'campus', FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,  'Guided walking trail among free-ranging herbivores'),
('open_range', 'night_safari_zone',                     'campus', FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Dim-lit tram route for nocturnal viewing'),
('open_range', 'african_plains_exhibit',                'campus', FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Mixed species: zebra, giraffe, antelope, ostrich'),
('open_range', 'asian_grasslands_exhibit',              'campus', FALSE,TRUE,TRUE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Rhino, deer, crane mixed paddock'),
('open_range', 'australian_walkabout',                  'medium', FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,  'Kangaroo, wallaby, emu free-range area'),

-- ── Aquaculture / Mariculture ──────────────────────────────────────────
('aquaculture', 'raceway',                              'large',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Long flowing channel for trout, salmon grow-out'),
('aquaculture', 'recirculating_aquaculture_system',     'medium', TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'RAS with biofilter, drum filter, UV, O₂ injection'),
('aquaculture', 'shrimp_biofloc_tank',                  'medium', TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'High-density biofloc shrimp grow-out'),
('aquaculture', 'sea_pen',                              'campus', TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Net pen in open water for finfish'),
('aquaculture', 'oyster_rack',                          'medium', TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,TRUE,  'Tidal rack system for bivalve culture'),

-- ── Specialised / Other ────────────────────────────────────────────────
('specialised', 'quarantine_isolation_unit',            'small',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Negative-pressure biosecure room'),
('specialised', 'veterinary_recovery_ward',             'small',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Climate-controlled post-op cages'),
('specialised', 'nursery_brooder',                      'nano',   FALSE,FALSE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Heated ICU box for neonates or hatchlings'),
('specialised', 'cryogenic_aquatic_transport',          'nano',   TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Insulated bag-in-box with O₂ tablet for shipping'),
('specialised', 'research_terrarium',                   'micro',  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Standardised lab enclosure with full telemetry'),
('specialised', 'mobile_exhibit_trailer',               'medium', FALSE,TRUE,TRUE,TRUE,FALSE,FALSE,  TRUE,FALSE,  'Road-legal trailer housing for outreach programs'),
('specialised', 'underwater_observation_tunnel',        'large',  TRUE,FALSE,FALSE,FALSE,FALSE,FALSE, TRUE,FALSE,  'Acrylic walk-through tunnel inside large tank'),
('specialised', 'immersive_nocturnal_house',            'large',  FALSE,FALSE,TRUE,TRUE,TRUE,TRUE,   TRUE,FALSE,  'Reversed photoperiod walk-through building');


-- ############################################################################
-- 3. ENCLOSURE INSTANCES
-- ############################################################################

CREATE TABLE enclosures (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID NOT NULL REFERENCES facilities(id),
    zone_id             UUID REFERENCES zones(id),
    enclosure_type_id   INT  NOT NULL REFERENCES enclosure_types(id),
    name                TEXT NOT NULL,
    label_code          TEXT,                  -- e.g. "AQ-FR-012" asset tag
    scale               enclosure_scale NOT NULL,
    volume_litres       NUMERIC(14,2),         -- water volume if applicable
    area_m2             NUMERIC(12,2),
    length_m            NUMERIC(8,2),
    width_m             NUMERIC(8,2),
    height_m            NUMERIC(8,2),
    commissioned_at     DATE,
    decommissioned_at   DATE,
    notes               TEXT,
    metadata            JSONB DEFAULT '{}',    -- flexible per-enclosure data
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enclosures_facility ON enclosures(facility_id);
CREATE INDEX idx_enclosures_type     ON enclosures(enclosure_type_id);

-- Sub-zones inside an enclosure (e.g. basking area, deep end, hide zone)
CREATE TABLE enclosure_zones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enclosure_id        UUID NOT NULL REFERENCES enclosures(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,          -- 'deep_end','basking_shelf','land_area','canopy_level'
    zone_purpose        TEXT,                   -- 'thermal_gradient_hot','thermal_gradient_cool','feeding','nesting','quarantine_sub'
    area_m2             NUMERIC(10,2),
    volume_litres       NUMERIC(14,2),
    metadata            JSONB DEFAULT '{}'
);


-- ############################################################################
-- 4. SPECIES & STOCKING
-- ############################################################################

CREATE TABLE species (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    common_name         TEXT NOT NULL,
    scientific_name     TEXT,
    taxonomy            JSONB,                 -- {kingdom, phylum, class, order, family, genus}
    iucn_status         TEXT,
    cites_appendix      TEXT,
    care_profile        JSONB DEFAULT '{}',    -- ideal temp, humidity, pH, diet, social, etc.
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE animals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id          UUID NOT NULL REFERENCES species(id),
    name                TEXT,
    identifier          TEXT,                  -- microchip / band / pit-tag
    sex                 TEXT,
    date_of_birth       DATE,
    acquisition_date    DATE,
    status              TEXT DEFAULT 'active', -- active, deceased, transferred, released
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Many-to-many: which animals live in which enclosure (with date ranges)
CREATE TABLE enclosure_animals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enclosure_id        UUID NOT NULL REFERENCES enclosures(id),
    animal_id           UUID NOT NULL REFERENCES animals(id),
    introduced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at          TIMESTAMPTZ,
    removal_reason      TEXT                   -- 'transfer','death','breeding_loan','release'
);


-- ############################################################################
-- 5. DEVICES — SENSORS, ACTUATORS, CONTROLLERS, CAMERAS
-- ############################################################################

CREATE TABLE devices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enclosure_id        UUID REFERENCES enclosures(id),
    enclosure_zone_id   UUID REFERENCES enclosure_zones(id),
    facility_id         UUID NOT NULL REFERENCES facilities(id),
    category            device_category NOT NULL,
    sensor_type         sensor_type,           -- populated when category = 'sensor'
    actuator_type       actuator_type,         -- populated when category = 'actuator'
    manufacturer        TEXT,
    model               TEXT,
    serial_number       TEXT,
    firmware_version    TEXT,
    protocol            TEXT,                  -- 'mqtt','modbus_rtu','modbus_tcp','bacnet','zigbee','zwave','ble','wifi','canbus','analog_4_20ma','sdi12','onewire'
    bus_address         TEXT,                  -- protocol-specific address
    ip_address          INET,
    mac_address         MACADDR,
    commissioned_at     DATE,
    last_calibrated_at  TIMESTAMPTZ,
    calibration_due_at  TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    metadata            JSONB DEFAULT '{}',    -- unit of measure, range, precision, wattage, flow rate, etc.
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_enclosure ON devices(enclosure_id);
CREATE INDEX idx_devices_category  ON devices(category);

-- Parent/child wiring: a controller "owns" the sensors and actuators it drives
CREATE TABLE device_relationships (
    parent_device_id    UUID NOT NULL REFERENCES devices(id),
    child_device_id     UUID NOT NULL REFERENCES devices(id),
    relationship        TEXT NOT NULL,         -- 'controls','monitors','powers','gateway_for'
    PRIMARY KEY (parent_device_id, child_device_id)
);


-- ############################################################################
-- 6. TELEMETRY — SENSOR READINGS  (TimescaleDB hypertable candidate)
-- ############################################################################

CREATE TABLE sensor_readings (
    time                TIMESTAMPTZ NOT NULL,
    device_id           UUID NOT NULL REFERENCES devices(id),
    value               NUMERIC(16,6) NOT NULL,
    unit                TEXT,
    status              reading_status NOT NULL DEFAULT 'nominal',
    quality             SMALLINT DEFAULT 100,  -- 0-100 signal quality / confidence
    metadata            JSONB
);

-- For TimescaleDB: SELECT create_hypertable('sensor_readings', 'time');
CREATE INDEX idx_readings_device_time ON sensor_readings(device_id, time DESC);


-- ############################################################################
-- 7. ACTUATOR COMMANDS & STATE LOG
-- ############################################################################

CREATE TABLE actuator_commands (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id           UUID NOT NULL REFERENCES devices(id),
    command             TEXT NOT NULL,          -- 'set_position','turn_on','turn_off','set_speed','set_temperature','dose_ml','set_intensity','open','close'
    parameters          JSONB NOT NULL DEFAULT '{}',
    issued_by           TEXT,                  -- 'schedule','rule_engine','user:uuid','api'
    status              command_status NOT NULL DEFAULT 'queued',
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at     TIMESTAMPTZ,
    executed_at         TIMESTAMPTZ,
    error_message       TEXT
);

CREATE TABLE actuator_state_log (
    time                TIMESTAMPTZ NOT NULL,
    device_id           UUID NOT NULL REFERENCES devices(id),
    state               JSONB NOT NULL,        -- {'position_pct':45, 'flow_lpm':12.3, 'on':true, ...}
    reported_by         TEXT DEFAULT 'device'   -- 'device','inferred','manual'
);

-- For TimescaleDB: SELECT create_hypertable('actuator_state_log', 'time');
CREATE INDEX idx_actuator_log_device ON actuator_state_log(device_id, time DESC);


-- ############################################################################
-- 8. AUTOMATION RULES & SCHEDULES
-- ############################################################################

-- Setpoint profiles define ideal ranges per species + enclosure type combo
CREATE TABLE setpoint_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    species_id          UUID REFERENCES species(id),
    enclosure_type_id   INT  REFERENCES enclosure_types(id),
    parameter           TEXT NOT NULL,          -- matches sensor_type value: 'temperature','ph','humidity',...
    target_value        NUMERIC(10,4),
    min_value           NUMERIC(10,4),
    max_value           NUMERIC(10,4),
    unit                TEXT,
    time_of_day_start   TIME,                  -- nullable = 24 h
    time_of_day_end     TIME,
    season              TEXT,                   -- 'summer','winter','wet','dry' or NULL
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled events: lights on/off, feeding, misting cycles, tide simulations
CREATE TABLE schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enclosure_id        UUID NOT NULL REFERENCES enclosures(id),
    name                TEXT NOT NULL,
    cron_expression     TEXT NOT NULL,          -- '0 7 * * *' = 7 AM daily
    action              JSONB NOT NULL,         -- [{device_id, command, parameters}, ...]
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    priority            INT DEFAULT 50,
    valid_from          DATE,
    valid_to            DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reactive rules: if sensor X reads > threshold, fire commands
CREATE TABLE automation_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enclosure_id        UUID REFERENCES enclosures(id),  -- NULL = facility-wide
    name                TEXT NOT NULL,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    priority            INT DEFAULT 50,
    condition           JSONB NOT NULL,         -- DSL: {"all":[{"sensor":"device_uuid","op":">","value":28},{"sensor":"...","op":"<","value":80}]}
    debounce_seconds    INT DEFAULT 60,
    cooldown_seconds    INT DEFAULT 300,
    actions             JSONB NOT NULL,         -- [{device_id, command, parameters}, ...]
    on_clear_actions    JSONB,                  -- commands to run when condition clears
    last_triggered_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################################
-- 9. ALERTS & NOTIFICATIONS
-- ############################################################################

CREATE TABLE alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID NOT NULL REFERENCES facilities(id),
    enclosure_id        UUID REFERENCES enclosures(id),
    device_id           UUID REFERENCES devices(id),
    rule_id             UUID REFERENCES automation_rules(id),
    severity            alert_severity NOT NULL,
    title               TEXT NOT NULL,
    message             TEXT,
    reading_value       NUMERIC(16,6),
    threshold_value     NUMERIC(16,6),
    acknowledged_by     UUID REFERENCES users(id),
    acknowledged_at     TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_open ON alerts(facility_id, resolved_at) WHERE resolved_at IS NULL;


-- ############################################################################
-- 10. PLUMBING & ELECTRICAL TOPOLOGY
-- ############################################################################

-- Model how water/air/power physically flows between equipment
CREATE TABLE plumbing_circuits (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID NOT NULL REFERENCES facilities(id),
    name                TEXT NOT NULL,          -- 'main_reef_loop','quarantine_drain','fog_line_3'
    medium              TEXT NOT NULL,          -- 'freshwater','saltwater','air','refrigerant','electrical'
    is_closed_loop      BOOLEAN DEFAULT FALSE,
    notes               TEXT
);

CREATE TABLE plumbing_segments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circuit_id          UUID NOT NULL REFERENCES plumbing_circuits(id),
    from_device_id      UUID REFERENCES devices(id),
    to_device_id        UUID REFERENCES devices(id),
    from_enclosure_id   UUID REFERENCES enclosures(id),
    to_enclosure_id     UUID REFERENCES enclosures(id),
    pipe_diameter_mm    NUMERIC(6,1),
    length_m            NUMERIC(8,2),
    material            TEXT,
    sequence_order      INT NOT NULL DEFAULT 0
);


-- ############################################################################
-- 11. MAINTENANCE & CALIBRATION
-- ############################################################################

CREATE TABLE maintenance_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID NOT NULL REFERENCES facilities(id),
    enclosure_id        UUID REFERENCES enclosures(id),
    device_id           UUID REFERENCES devices(id),
    title               TEXT NOT NULL,
    description         TEXT,
    due_at              TIMESTAMPTZ,
    recurrence_cron     TEXT,                  -- recurring tasks
    completed_at        TIMESTAMPTZ,
    completed_by        UUID REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE calibration_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id           UUID NOT NULL REFERENCES devices(id),
    calibrated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    calibrated_by       UUID REFERENCES users(id),
    reference_standard  TEXT,                  -- '7.00 pH buffer', '1413 µS/cm standard'
    pre_cal_offset      NUMERIC(10,4),
    post_cal_offset     NUMERIC(10,4),
    passed              BOOLEAN NOT NULL,
    notes               TEXT
);


-- ############################################################################
-- 12. USERS & CARETAKERS
-- ############################################################################

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT NOT NULL UNIQUE,
    display_name        TEXT NOT NULL,
    phone               TEXT,
    avatar_url          TEXT,
    auth_provider       TEXT,                  -- 'email','google','apple','sso'
    auth_provider_id    TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emergency contact / professional info relevant to animal care
CREATE TABLE user_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT,                  -- 'DVM','CVT','Curator','Head Keeper'
    organisation        TEXT,
    license_number      TEXT,                  -- vet license, wildlife rehab permit, etc.
    emergency_phone     TEXT,
    bio                 TEXT,
    certifications      JSONB DEFAULT '[]',    -- [{name, issuer, expires_at}]
    notification_prefs  JSONB DEFAULT '{}',    -- {email:true, push:true, sms:false, quiet_hours:{start,end}}
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ############################################################################
-- 13. INVITATIONS
-- ############################################################################

CREATE TABLE invitations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    invited_by          UUID NOT NULL REFERENCES users(id),
    invitee_email       TEXT NOT NULL,
    invitee_user_id     UUID REFERENCES users(id),       -- set once they accept & have an account
    role                access_role NOT NULL DEFAULT 'keeper',
    status              invitation_status NOT NULL DEFAULT 'pending',
    personal_message    TEXT,                              -- "Hey, I added you to help with the reef tanks"
    token               TEXT NOT NULL UNIQUE,              -- secure random token for the invite link
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
    accepted_at         TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_email    ON invitations(invitee_email) WHERE status = 'pending';
CREATE INDEX idx_invitations_token    ON invitations(token)         WHERE status = 'pending';
CREATE INDEX idx_invitations_facility ON invitations(facility_id);


-- ############################################################################
-- 14. ACCESS GRANTS — Scoped Permissions
-- ############################################################################

-- Each row grants a user a role scoped to a facility, zone, OR enclosure.
-- A user can have multiple grants (e.g. keeper on Enclosure A, viewer on Zone B).
CREATE TABLE access_grants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_id         UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    scope_type          access_scope_type NOT NULL,
    scope_id            UUID NOT NULL,         -- references facilities.id, zones.id, or enclosures.id depending on scope_type
    role                access_role NOT NULL,
    granted_by          UUID NOT NULL REFERENCES users(id),
    invitation_id       UUID REFERENCES invitations(id),   -- links back to the invitation that created this grant
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until         TIMESTAMPTZ,           -- NULL = no expiry
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, facility_id, scope_type, scope_id)
);

CREATE INDEX idx_access_grants_user     ON access_grants(user_id)     WHERE is_active = TRUE;
CREATE INDEX idx_access_grants_facility ON access_grants(facility_id) WHERE is_active = TRUE;
CREATE INDEX idx_access_grants_scope    ON access_grants(scope_type, scope_id) WHERE is_active = TRUE;

-- Role → permission mapping.
-- Default permissions ship with the app; facility owners can customise.
CREATE TABLE role_permissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id         UUID REFERENCES facilities(id),    -- NULL = global default
    role                access_role NOT NULL,
    permission          permission NOT NULL,
    UNIQUE (facility_id, role, permission)
);

-- Seed global defaults
INSERT INTO role_permissions (facility_id, role, permission) VALUES
    -- owner gets everything
    (NULL, 'owner',         'view_telemetry'),
    (NULL, 'owner',         'view_animals'),
    (NULL, 'owner',         'view_devices'),
    (NULL, 'owner',         'view_alerts'),
    (NULL, 'owner',         'acknowledge_alerts'),
    (NULL, 'owner',         'command_actuators'),
    (NULL, 'owner',         'manage_schedules'),
    (NULL, 'owner',         'manage_rules'),
    (NULL, 'owner',         'manage_devices'),
    (NULL, 'owner',         'manage_animals'),
    (NULL, 'owner',         'manage_enclosures'),
    (NULL, 'owner',         'manage_species'),
    (NULL, 'owner',         'manage_plumbing'),
    (NULL, 'owner',         'perform_maintenance'),
    (NULL, 'owner',         'calibrate_devices'),
    (NULL, 'owner',         'invite_users'),
    (NULL, 'owner',         'manage_users'),
    (NULL, 'owner',         'manage_facility'),
    (NULL, 'owner',         'export_data'),
    (NULL, 'owner',         'view_audit_log'),
    -- admin: everything except manage_facility
    (NULL, 'admin',         'view_telemetry'),
    (NULL, 'admin',         'view_animals'),
    (NULL, 'admin',         'view_devices'),
    (NULL, 'admin',         'view_alerts'),
    (NULL, 'admin',         'acknowledge_alerts'),
    (NULL, 'admin',         'command_actuators'),
    (NULL, 'admin',         'manage_schedules'),
    (NULL, 'admin',         'manage_rules'),
    (NULL, 'admin',         'manage_devices'),
    (NULL, 'admin',         'manage_animals'),
    (NULL, 'admin',         'manage_enclosures'),
    (NULL, 'admin',         'manage_species'),
    (NULL, 'admin',         'manage_plumbing'),
    (NULL, 'admin',         'perform_maintenance'),
    (NULL, 'admin',         'calibrate_devices'),
    (NULL, 'admin',         'invite_users'),
    (NULL, 'admin',         'manage_users'),
    (NULL, 'admin',         'export_data'),
    (NULL, 'admin',         'view_audit_log'),
    -- veterinarian
    (NULL, 'veterinarian',  'view_telemetry'),
    (NULL, 'veterinarian',  'view_animals'),
    (NULL, 'veterinarian',  'view_devices'),
    (NULL, 'veterinarian',  'view_alerts'),
    (NULL, 'veterinarian',  'acknowledge_alerts'),
    (NULL, 'veterinarian',  'command_actuators'),
    (NULL, 'veterinarian',  'manage_animals'),
    (NULL, 'veterinarian',  'export_data'),
    -- keeper
    (NULL, 'keeper',        'view_telemetry'),
    (NULL, 'keeper',        'view_animals'),
    (NULL, 'keeper',        'view_devices'),
    (NULL, 'keeper',        'view_alerts'),
    (NULL, 'keeper',        'acknowledge_alerts'),
    (NULL, 'keeper',        'command_actuators'),
    (NULL, 'keeper',        'manage_schedules'),
    (NULL, 'keeper',        'manage_animals'),
    -- technician
    (NULL, 'technician',    'view_telemetry'),
    (NULL, 'technician',    'view_devices'),
    (NULL, 'technician',    'view_alerts'),
    (NULL, 'technician',    'acknowledge_alerts'),
    (NULL, 'technician',    'command_actuators'),
    (NULL, 'technician',    'manage_devices'),
    (NULL, 'technician',    'manage_plumbing'),
    (NULL, 'technician',    'perform_maintenance'),
    (NULL, 'technician',    'calibrate_devices'),
    -- volunteer
    (NULL, 'volunteer',     'view_telemetry'),
    (NULL, 'volunteer',     'view_animals'),
    (NULL, 'volunteer',     'view_alerts'),
    (NULL, 'volunteer',     'command_actuators'),
    -- viewer (read-only)
    (NULL, 'viewer',        'view_telemetry'),
    (NULL, 'viewer',        'view_animals'),
    (NULL, 'viewer',        'view_devices'),
    (NULL, 'viewer',        'view_alerts');

-- Per-grant permission overrides: add or revoke individual permissions
-- beyond what the role gives. E.g. give a specific keeper 'manage_devices'
-- on one enclosure, or revoke 'command_actuators' from a volunteer.
CREATE TABLE access_grant_overrides (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_grant_id     UUID NOT NULL REFERENCES access_grants(id) ON DELETE CASCADE,
    permission          permission NOT NULL,
    effect              TEXT NOT NULL CHECK (effect IN ('allow','deny')),
    reason              TEXT,                  -- audit trail: "Temporary pump access during filter replacement"
    granted_by          UUID NOT NULL REFERENCES users(id),
    valid_from          TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (access_grant_id, permission)
);


-- ############################################################################
-- 15. ACCESS ACTIVITY LOG
-- ############################################################################

-- Tracks invitation lifecycle and permission changes separately from the
-- general audit_log so it's easy to query "who has access to what and why."
CREATE TABLE access_activity_log (
    id                  BIGSERIAL PRIMARY KEY,
    facility_id         UUID NOT NULL REFERENCES facilities(id),
    actor_user_id       UUID REFERENCES users(id),         -- who performed the action
    target_user_id      UUID REFERENCES users(id),         -- who was affected
    invitation_id       UUID REFERENCES invitations(id),
    access_grant_id     UUID REFERENCES access_grants(id),
    action              TEXT NOT NULL,          -- 'invited','accepted','declined','revoked','grant_created','grant_updated','grant_deactivated','override_added','override_removed'
    details             JSONB,                 -- snapshot of what changed
    performed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_activity_facility ON access_activity_log(facility_id, performed_at DESC);
CREATE INDEX idx_access_activity_target   ON access_activity_log(target_user_id, performed_at DESC);


-- ############################################################################
-- 16. HELPER VIEW — Effective Permissions
-- ############################################################################

-- Resolves a user's effective permissions for any scope by combining their
-- role's default permissions with any per-grant overrides.
CREATE OR REPLACE VIEW v_effective_permissions AS
WITH base AS (
    SELECT
        ag.user_id,
        ag.facility_id,
        ag.scope_type,
        ag.scope_id,
        ag.role,
        ag.id AS access_grant_id,
        rp.permission
    FROM access_grants ag
    JOIN role_permissions rp
        ON rp.role = ag.role
        AND (rp.facility_id = ag.facility_id OR rp.facility_id IS NULL)
    WHERE ag.is_active = TRUE
      AND (ag.valid_until IS NULL OR ag.valid_until > now())
),
with_overrides AS (
    SELECT
        b.user_id,
        b.facility_id,
        b.scope_type,
        b.scope_id,
        b.role,
        b.access_grant_id,
        b.permission,
        COALESCE(ov.effect, 'allow') AS effect
    FROM base b
    LEFT JOIN access_grant_overrides ov
        ON ov.access_grant_id = b.access_grant_id
        AND ov.permission = b.permission
        AND (ov.valid_until IS NULL OR ov.valid_until > now())

    UNION ALL

    -- Include override-only "allow" permissions not in the role defaults
    SELECT
        ag.user_id,
        ag.facility_id,
        ag.scope_type,
        ag.scope_id,
        ag.role,
        ag.id,
        ov.permission,
        ov.effect
    FROM access_grant_overrides ov
    JOIN access_grants ag ON ag.id = ov.access_grant_id
    WHERE ov.effect = 'allow'
      AND ag.is_active = TRUE
      AND (ov.valid_until IS NULL OR ov.valid_until > now())
      AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role = ag.role
            AND rp.permission = ov.permission
            AND (rp.facility_id = ag.facility_id OR rp.facility_id IS NULL)
      )
)
SELECT DISTINCT
    user_id,
    facility_id,
    scope_type,
    scope_id,
    role,
    permission
FROM with_overrides
WHERE effect = 'allow';


-- ############################################################################
-- 17. AUDIT LOG
-- ############################################################################

CREATE TABLE audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    entity_type         TEXT NOT NULL,          -- 'enclosure','device','animal','rule','schedule','user','invitation','access_grant'
    entity_id           UUID NOT NULL,
    action              TEXT NOT NULL,          -- 'create','update','delete','command','alert','invite','grant','revoke'
    changed_by          UUID REFERENCES users(id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    diff                JSONB                   -- before/after snapshot
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id, changed_at DESC);
