# ExoPet — Unified Habitat Automation Schema Specification

> **Version:** 1.0  
> **Last updated:** March 10, 2026  
> **Scope:** Home hobbyist enclosures through zoological-scale facilities

---

## Table of Contents

1. [Overview](#1-overview)
2. [Enumerations & Reference Types](#2-enumerations--reference-types)
3. [Organisational Hierarchy](#3-organisational-hierarchy)
4. [Enclosure Taxonomy](#4-enclosure-taxonomy)
5. [Enclosure Instances](#5-enclosure-instances)
6. [Species & Stocking](#6-species--stocking)
7. [Devices — Sensors, Actuators, Controllers, Cameras](#7-devices)
8. [Telemetry — Sensor Readings](#8-telemetry--sensor-readings)
9. [Actuator Commands & State Log](#9-actuator-commands--state-log)
10. [Automation Rules & Schedules](#10-automation-rules--schedules)
11. [Alerts & Notifications](#11-alerts--notifications)
12. [Plumbing & Electrical Topology](#12-plumbing--electrical-topology)
13. [Maintenance & Calibration](#13-maintenance--calibration)
14. [Users & Caretakers](#14-users--caretakers)
15. [Invitations](#15-invitations)
16. [Access Grants — Scoped Permissions](#16-access-grants--scoped-permissions)
17. [Access Activity Log](#17-access-activity-log)
18. [Effective Permissions (View)](#18-effective-permissions-view)
19. [Audit Log](#19-audit-log)

---

## 1. Overview

ExoPet's data model is designed to manage the full lifecycle of animal habitats — from a single nano reef tank on a desk to a multi-acre drive-through safari — and the engineering infrastructure that automates them. The schema covers organisational structure, a comprehensive enclosure type catalogue, device telemetry and control, automation logic, access control for caretaker teams, and a complete audit trail.

### Design Principles

- **UUID primary keys** on all entity tables for global uniqueness across distributed systems.
- **JSONB metadata columns** on most tables for extensibility without schema migrations.
- **TimescaleDB-ready** time-series tables (`sensor_readings`, `actuator_state_log`) with timestamp-first design.
- **Hierarchical scoping** for both physical layout (facility → zone → enclosure → enclosure zone) and access control (facility → zone → enclosure).
- **Temporal tracking** with `created_at` / `updated_at` on entities and date-range fields on relationships (e.g. `enclosure_animals`, `access_grants`).

### Conventions

| Convention | Detail |
|---|---|
| Primary key | `id UUID DEFAULT gen_random_uuid()` unless noted |
| Timestamps | All `TIMESTAMPTZ`, defaulting to `now()` |
| Soft deletes | Prefer `is_active` flags or `decommissioned_at` / `removed_at` over hard deletes |
| Units | Metric (metres, litres, Celsius), stored as `NUMERIC` |
| Enums | Postgres `CREATE TYPE ... AS ENUM` for closed value sets |

---

## 2. Enumerations & Reference Types

### `enclosure_scale`

Classifies the physical size of an enclosure.

| Value | Size Range | Examples |
|---|---|---|
| `nano` | < 10 gal / < 1 m² | Desktop tanks, insect cups |
| `micro` | 10–40 gal / 1–4 m² | Home terrariums, small aquariums |
| `small` | 40–200 gal / 4–20 m² | Large tanks, walk-in vivariums |
| `medium` | 20–100 m² | Outdoor aviaries, pond systems |
| `large` | 100–2,000 m² | Zoo exhibits, barn enclosures |
| `campus` | 2,000–50,000 m² | Safari sections, marine parks |
| `landscape` | 50,000+ m² | Drive-through safari, open-range |

### `device_category`

| Value | Description |
|---|---|
| `sensor` | Any measurement device |
| `actuator` | Any device that performs a physical action |
| `controller` | Microcontroller, PLC, or hub that drives sensors/actuators |
| `gateway` | Network bridge (e.g. Zigbee coordinator, Modbus-to-MQTT) |
| `camera` | Video/still surveillance or enrichment monitoring |
| `alarm` | Standalone audible/visual alarm unit |

### `actuator_type`

| Value | Subtypes / Notes |
|---|---|
| `valve` | Solenoid, proportional, ball, butterfly |
| `pump` | Peristaltic, centrifugal, dosing, sump |
| `heater` | Immersion, ceramic, radiant panel, heat mat |
| `chiller` | Thermoelectric, compressor, inline |
| `humidifier` | Ultrasonic, evaporative, fogging nozzle |
| `dehumidifier` | — |
| `fan` | Exhaust, circulation, misting fan |
| `blower` | HVAC blower, air handler |
| `motor` | Gate, door, conveyor, shade, retractable roof |
| `light` | LED panel, UVB tube, basking lamp, moonlight |
| `feeder` | Timed hopper, auger, live-food dispenser, broadcast |
| `mister` | Rain bar, drip wall, fog system |
| `aerator` | Air stone, venturi, surface skimmer |
| `skimmer` | Protein skimmer, surface skimmer |
| `dosing_pump` | Chemical, supplement, medication |
| `wavemaker` | Powerhead, gyre pump |
| `lock` | Electromagnetic door / gate lock |
| `speaker` | Enrichment audio, alarm siren |
| `shade` | Motorised shade cloth, retractable canopy |
| `sprinkler` | Irrigation, cooling mist line |
| `ozoniser` | — |
| `uv_steriliser` | — |

### `sensor_type`

| Value | Notes |
|---|---|
| `temperature` | Ambient air |
| `humidity` | Relative humidity |
| `barometric_pressure` | — |
| `water_temperature` | Submersible probe |
| `water_level` | Float switch, ultrasonic, pressure |
| `water_flow` | Inline flow meter |
| `water_pressure` | — |
| `ph` | — |
| `orp` | Oxidation-reduction potential |
| `dissolved_oxygen` | — |
| `salinity` | — |
| `conductivity` | — |
| `tds` | Total dissolved solids |
| `ammonia` | — |
| `nitrite` | — |
| `nitrate` | — |
| `phosphate` | — |
| `calcium` | — |
| `alkalinity` | — |
| `co2` | — |
| `light_par` | Photosynthetically active radiation |
| `light_lux` | — |
| `uv_index` | — |
| `wind_speed` | — |
| `rain_gauge` | — |
| `soil_moisture` | — |
| `air_quality` | VOC / particulate |
| `sound_level` | — |
| `vibration` | — |
| `motion` | PIR / microwave |
| `weight` | Platform scale under perch, nest, basking spot |
| `water_turbidity` | — |
| `chlorine` | — |
| `current_draw` | Electrical monitoring on equipment |
| `door_contact` | Magnetic switch on gates / lids |
| `gps` | Animal or vehicle tracker in open-range |
| `rfid` | Animal ID / keeper badge |

### `invitation_status`

`pending` · `accepted` · `declined` · `expired` · `revoked`

### `access_role`

| Value | Description |
|---|---|
| `owner` | Full control — can delete facility, manage billing |
| `admin` | Manage devices, rules, users — cannot delete facility |
| `veterinarian` | Read all, write medical/animal records, issue commands |
| `keeper` | Read own zones, feed/clean/command devices in granted scopes |
| `technician` | Device maintenance, calibration, plumbing — no animal records |
| `volunteer` | Read-only + limited feeding/cleaning actions |
| `viewer` | Read-only dashboard and alerts |

### `access_scope_type`

| Value | Description |
|---|---|
| `facility` | Access to everything in a facility |
| `zone` | Access to a zone and all enclosures within it |
| `enclosure` | Access to a single enclosure only |

### `permission`

`view_telemetry` · `view_animals` · `view_devices` · `view_alerts` · `acknowledge_alerts` · `command_actuators` · `manage_schedules` · `manage_rules` · `manage_devices` · `manage_animals` · `manage_enclosures` · `manage_species` · `manage_plumbing` · `perform_maintenance` · `calibrate_devices` · `invite_users` · `manage_users` · `manage_facility` · `export_data` · `view_audit_log`

### `alert_severity`

| Value | Description |
|---|---|
| `info` | Informational, no action required |
| `warning` | Parameter approaching threshold |
| `critical` | Immediate attention needed |
| `emergency` | Triggers keeper callout / facility lockdown |

### `reading_status`

`nominal` · `caution` · `alarm` · `fault` (sensor malfunction) · `offline`

### `command_status`

`queued` · `sent` · `acknowledged` · `executed` · `failed` · `timeout`

---

## 3. Organisational Hierarchy

### `facilities`

The top-level entity. Represents a home, zoo, sanctuary, aquarium, farm, research lab, vet clinic, or rescue.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | — |
| `name` | TEXT | NOT NULL | Display name |
| `facility_type` | TEXT | NOT NULL | `home`, `zoo`, `sanctuary`, `aquarium`, `farm`, `research_lab`, `vet_clinic`, `rescue` |
| `address` | JSONB | — | Structured address |
| `gps_lat` | NUMERIC(9,6) | — | Latitude |
| `gps_lon` | NUMERIC(9,6) | — | Longitude |
| `timezone` | TEXT | NOT NULL, default `UTC` | IANA timezone string |
| `owner_user_id` | UUID | FK → `users.id` | Facility owner |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

### `zones`

Subdivisions within a facility. Self-referencing `parent_zone_id` allows arbitrary nesting (building → wing → room).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` CASCADE | Parent facility |
| `parent_zone_id` | UUID | FK → `zones.id` | Enables nesting |
| `name` | TEXT | NOT NULL | — |
| `zone_type` | TEXT | — | `building`, `wing`, `room`, `outdoor_paddock`, `underwater_tunnel`, `greenhouse` |
| `area_m2` | NUMERIC(12,2) | — | Floor area |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

---

## 4. Enclosure Taxonomy

### `enclosure_types`

A canonical catalogue of every enclosure archetype. Individual enclosure instances reference a type from this table. Each type is tagged with boolean habitat flags and a typical scale.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-increment integer |
| `category` | TEXT | NOT NULL | Grouping label (see catalogue below) |
| `name` | TEXT | NOT NULL, UNIQUE | Machine-readable name |
| `description` | TEXT | — | Human-readable summary |
| `typical_scale` | `enclosure_scale` | NOT NULL | Expected size class |
| `is_aquatic` | BOOLEAN | NOT NULL, default FALSE | Fully aquatic |
| `is_semi_aquatic` | BOOLEAN | NOT NULL, default FALSE | Land + water mix |
| `is_terrestrial` | BOOLEAN | NOT NULL, default TRUE | Has land area |
| `is_arboreal` | BOOLEAN | NOT NULL, default FALSE | Climbing / canopy |
| `is_aerial` | BOOLEAN | NOT NULL, default FALSE | Flight space |
| `is_subterranean` | BOOLEAN | NOT NULL, default FALSE | Burrowing / underground |
| `climate_controlled` | BOOLEAN | NOT NULL, default FALSE | HVAC / active climate |
| `outdoor` | BOOLEAN | NOT NULL, default FALSE | Exposed to weather |

### Complete Enclosure Catalogue

#### Aquatic — Freshwater

| Name | Scale | Description |
|---|---|---|
| `nano_freshwater_tank` | nano | Desktop planted tank or betta cube (< 10 gal) |
| `standard_freshwater_aquarium` | micro | Typical home freshwater tank 10–75 gal |
| `large_freshwater_aquarium` | small | 75–300 gal show tank or monster-fish setup |
| `freshwater_pond` | medium | Outdoor koi / goldfish pond |
| `freshwater_stream_table` | small | Hillstream / riffle simulation with current pumps |
| `freshwater_exhibit_tank` | large | Public-aquarium freshwater gallery (300+ gal) |
| `amazon_flooded_forest_exhibit` | large | Seasonal flood simulation with emergent trees |

#### Aquatic — Marine / Saltwater

| Name | Scale | Description |
|---|---|---|
| `nano_reef_tank` | nano | Pico / nano reef under 30 gal |
| `standard_reef_aquarium` | micro | Home reef 30–150 gal |
| `large_reef_aquarium` | small | 150–500 gal SPS / mixed reef |
| `fish_only_marine_tank` | micro | FOWLR (fish only with live rock) |
| `predator_marine_tank` | small | Shark / eel / lion-fish display |
| `jellyfish_kreisel` | micro | Circular-flow kreisel for jellyfish |
| `cephalopod_tank` | small | Escape-proof octopus / cuttlefish enclosure |
| `seahorse_tank` | micro | Low-flow tall tank for syngnathids |
| `coral_frag_propagation_rack` | small | Multi-tray coral grow-out system |
| `touch_pool` | small | Shallow open-top interactive pool |
| `open_ocean_exhibit` | campus | Multi-million-gallon pelagic tank (tuna, sharks, rays) |
| `kelp_forest_exhibit` | large | Tall column tank with surge simulation |
| `tidal_pool_exhibit` | medium | Tide-cycling shallow pool exhibit |

#### Aquatic — Brackish

| Name | Scale | Description |
|---|---|---|
| `brackish_aquarium` | micro | Mangrove / mudskipper / archer-fish tank |
| `mangrove_lagoon_exhibit` | large | Zoo-scale mangrove with tidal cycling |

#### Semi-Aquatic / Paludarium

| Name | Scale | Description |
|---|---|---|
| `paludarium` | micro | Half land / half water vivarium |
| `riparium` | micro | Emerged riverbank planting with waterline |
| `turtle_basking_tank` | small | Aquatic area + dry basking dock + UVB |
| `crocodilian_enclosure` | large | Deep pool + land + basking + heavy security |
| `hippo_pool_exhibit` | large | Underwater viewing + mud wallow + land area |
| `penguin_exhibit` | large | Chilled pool + rocky haul-out + snow machine |
| `otter_habitat` | medium | Stream channel + slides + den boxes |
| `beaver_lodge_exhibit` | medium | Flowing water + dam structure + lodge viewing |
| `amphibian_shoreline` | small | Simulated pond edge for newts, salamanders |
| `flamingo_lagoon` | medium | Shallow wading lagoon with nesting islands |
| `seal_sea_lion_pool` | large | Saltwater pool with haul-out + show stage |

#### Terrestrial — Tropical

| Name | Scale | Description |
|---|---|---|
| `tropical_vivarium` | micro | High-humidity planted tank for dart frogs, geckos |
| `bioactive_terrarium` | micro | Self-cleaning ecosystem with CUC |
| `large_tropical_vivarium` | small | Walk-in or floor-to-ceiling arboreal display |
| `rainforest_dome` | large | Zoo biome dome with canopy walkway |
| `cloud_forest_exhibit` | large | Cool foggy highland habitat |

#### Terrestrial — Arid / Desert

| Name | Scale | Description |
|---|---|---|
| `arid_terrarium` | micro | Low-humidity tank for leopard geckos, uros, etc. |
| `large_desert_terrarium` | small | Sand substrate, hot basking, deep-heat projector |
| `desert_exhibit` | large | Zoo-scale desert biome with burrowing areas |
| `outdoor_tortoise_pen` | medium | Walled garden with hides, burrows, UVB access |

#### Terrestrial — Temperate

| Name | Scale | Description |
|---|---|---|
| `temperate_woodland_vivarium` | micro | Moderate humidity/temp for fire salamanders, etc. |
| `temperate_grassland_exhibit` | large | Open paddock for prairie species, burrowing owls |

#### Fossorial / Subterranean

| Name | Scale | Description |
|---|---|---|
| `ant_formicarium` | nano | Ant farm with nest chambers + outworld |
| `burrowing_display` | micro | Cross-section terrarium for mole rats, tarantulas |
| `underground_exhibit` | medium | Zoo walk-through tunnel for nocturnal burrowers |

#### Arboreal / Canopy

| Name | Scale | Description |
|---|---|---|
| `tall_arboreal_enclosure` | small | Vertical mesh/glass for chameleons, tree pythons |
| `free_range_chameleon_room` | medium | Whole-room chameleon setup with live plants |
| `primate_climbing_exhibit` | large | Multi-storey with ropes, platforms, enrichment |
| `sloth_canopy_exhibit` | large | High canopy with slow-traverse rigging |
| `koala_eucalyptus_exhibit` | medium | Branching structure with browse feeding stations |

#### Aviary / Flight

| Name | Scale | Description |
|---|---|---|
| `indoor_bird_cage` | nano | Single-bird or pair cage for parrots, finches |
| `flight_cage` | micro | Room-sized mesh enclosure for flight exercise |
| `walk_in_aviary` | medium | Outdoor planted aviary visitors can enter |
| `free_flight_aviary` | large | Zoo dome / netted canyon for mixed-species flight |
| `raptor_mews` | small | Weathering yard + indoor mews for falconry birds |
| `penguin_aviary` | large | Chilled air + pool + artificial snow |
| `bat_cave_exhibit` | medium | Inverted-cycle dark exhibit with flight space |
| `hummingbird_house` | medium | Tropical greenhouse with feeders and flowers |

#### Invertebrate Specific

| Name | Scale | Description |
|---|---|---|
| `tarantula_enclosure` | nano | Small acrylic box or critter keeper |
| `scorpion_enclosure` | nano | Dry substrate, hide, heat mat |
| `isopod_colony_bin` | nano | Shoebox tub with leaf litter and bark |
| `millipede_terrarium` | nano | Deep substrate column for giant millipedes |
| `mantis_enclosure` | nano | Tall mesh cup or small vivarium |
| `butterfly_house` | medium | Greenhouse with host plants and emergence cages |
| `bee_observation_hive` | nano | Glass-walled hive with outdoor access tube |
| `hermit_crab_crabitat` | micro | Humid tank with saltwater pool and climbing decor |
| `giant_snail_terrarium` | nano | Humid tub with calcium and greens |
| `leaf_cutter_ant_exhibit` | medium | Multi-chamber fungus garden with foraging trails |

#### Reptile Specific

| Name | Scale | Description |
|---|---|---|
| `snake_rack_system` | nano | Tub rack with belly heat for breeding collections |
| `monitor_lizard_enclosure` | small | Large multi-zone for water monitors, tegus |
| `iguana_room` | medium | Dedicated room-scale setup with basking shelves |
| `komodo_dragon_exhibit` | large | Heavy security, heated ground, wallow, sun access |
| `sea_turtle_rehabilitation_tank` | large | Round shallow hospital pool with gentle flow |
| `alligator_snapping_turtle_pool` | small | Deep murky-water setup with minimal land |
| `egg_incubator` | nano | Precision temp/humidity chamber for egg clutches |

#### Amphibian Specific

| Name | Scale | Description |
|---|---|---|
| `dart_frog_vivarium` | nano | Tropical bioactive with drip wall, bromeliads |
| `axolotl_tank` | micro | Cold freshwater, no land, low flow |
| `pac_man_frog_tub` | nano | Shallow moist substrate sit-and-wait setup |
| `salamander_stream_vivarium` | micro | Cool flowing water with mossy banks |

#### Small Mammal

| Name | Scale | Description |
|---|---|---|
| `rodent_cage` | nano | Wire-bar or bin cage for hamsters, gerbils, mice |
| `guinea_pig_c_and_c_cage` | micro | Coroplast + grid modular pen |
| `rabbit_hutch` | micro | Hutch + run with dig-proof floor |
| `chinchilla_tower` | micro | Multi-storey cool-temp cage with ledges |
| `ferret_nation_cage` | micro | Multi-level ferret housing |
| `sugar_glider_aviary` | small | Tall cage with pouches, branches, enrichment |
| `hedgehog_vivarium` | nano | Warm substrate tank with wheel and hides |
| `prairie_dog_exhibit` | medium | Deep-dig outdoor pen with burrow viewing |
| `nocturnal_small_mammal_house` | medium | Red-lit walk-through for bats, lorises, aye-ayes |

#### Large Mammal — Zoo

| Name | Scale | Description |
|---|---|---|
| `elephant_habitat` | campus | Multi-acre paddock, pool, mud wallow, barn |
| `great_ape_habitat` | large | Indoor/outdoor with climbing, nesting, viewing |
| `big_cat_exhibit` | large | Moated paddock with pool, climbing, heated dens |
| `bear_exhibit` | large | Varied terrain, pool, den, foraging enrichment |
| `giraffe_barn_and_yard` | large | Tall barn + paddock with elevated feeding stations |
| `rhino_paddock` | large | Mud wallow, reinforced barrier, heated barn |
| `marine_mammal_stadium` | large | Performance pool + medical pool + haul-out |
| `polar_bear_exhibit` | large | Deep chilled pool + artificial snow + den |
| `bat_roost_barn` | medium | Barn-scale free-flight for large fruit bats |

#### Open-Range / Safari

| Name | Scale | Description |
|---|---|---|
| `drive_through_safari_paddock` | landscape | Vehicle-traversable multi-species savanna |
| `walk_through_safari_trail` | campus | Guided walking trail among free-ranging herbivores |
| `night_safari_zone` | campus | Dim-lit tram route for nocturnal viewing |
| `african_plains_exhibit` | campus | Mixed species: zebra, giraffe, antelope, ostrich |
| `asian_grasslands_exhibit` | campus | Rhino, deer, crane mixed paddock |
| `australian_walkabout` | medium | Kangaroo, wallaby, emu free-range area |

#### Aquaculture / Mariculture

| Name | Scale | Description |
|---|---|---|
| `raceway` | large | Long flowing channel for trout, salmon grow-out |
| `recirculating_aquaculture_system` | medium | RAS with biofilter, drum filter, UV, O₂ injection |
| `shrimp_biofloc_tank` | medium | High-density biofloc shrimp grow-out |
| `sea_pen` | campus | Net pen in open water for finfish |
| `oyster_rack` | medium | Tidal rack system for bivalve culture |

#### Specialised / Other

| Name | Scale | Description |
|---|---|---|
| `quarantine_isolation_unit` | small | Negative-pressure biosecure room |
| `veterinary_recovery_ward` | small | Climate-controlled post-op cages |
| `nursery_brooder` | nano | Heated ICU box for neonates or hatchlings |
| `cryogenic_aquatic_transport` | nano | Insulated bag-in-box with O₂ tablet for shipping |
| `research_terrarium` | micro | Standardised lab enclosure with full telemetry |
| `mobile_exhibit_trailer` | medium | Road-legal trailer housing for outreach programs |
| `underwater_observation_tunnel` | large | Acrylic walk-through tunnel inside large tank |
| `immersive_nocturnal_house` | large | Reversed photoperiod walk-through building |

---

## 5. Enclosure Instances

### `enclosures`

Physical enclosure records that reference the type catalogue.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | Parent facility |
| `zone_id` | UUID | FK → `zones.id` | Which zone it's in |
| `enclosure_type_id` | INT | NOT NULL, FK → `enclosure_types.id` | Archetype reference |
| `name` | TEXT | NOT NULL | Display name |
| `label_code` | TEXT | — | Asset tag, e.g. `AQ-FR-012` |
| `scale` | `enclosure_scale` | NOT NULL | Actual size class |
| `volume_litres` | NUMERIC(14,2) | — | Water volume if applicable |
| `area_m2` | NUMERIC(12,2) | — | Floor / footprint area |
| `length_m` | NUMERIC(8,2) | — | — |
| `width_m` | NUMERIC(8,2) | — | — |
| `height_m` | NUMERIC(8,2) | — | — |
| `commissioned_at` | DATE | — | When it went live |
| `decommissioned_at` | DATE | — | When it was retired |
| `notes` | TEXT | — | — |
| `metadata` | JSONB | default `{}` | Flexible per-enclosure data |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(facility_id)`, `(enclosure_type_id)`

### `enclosure_zones`

Sub-regions within an enclosure (basking shelf, deep end, canopy level, nesting area, etc.).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `enclosure_id` | UUID | NOT NULL, FK → `enclosures.id` CASCADE | — |
| `name` | TEXT | NOT NULL | `deep_end`, `basking_shelf`, `land_area`, `canopy_level` |
| `zone_purpose` | TEXT | — | `thermal_gradient_hot`, `thermal_gradient_cool`, `feeding`, `nesting`, `quarantine_sub` |
| `area_m2` | NUMERIC(10,2) | — | — |
| `volume_litres` | NUMERIC(14,2) | — | — |
| `metadata` | JSONB | default `{}` | — |

---

## 6. Species & Stocking

### `species`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `common_name` | TEXT | NOT NULL | — |
| `scientific_name` | TEXT | — | Binomial name |
| `taxonomy` | JSONB | — | `{kingdom, phylum, class, order, family, genus}` |
| `iucn_status` | TEXT | — | Conservation status |
| `cites_appendix` | TEXT | — | Trade regulation appendix |
| `care_profile` | JSONB | default `{}` | Ideal temp, humidity, pH, diet, social needs, etc. |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

### `animals`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `species_id` | UUID | NOT NULL, FK → `species.id` | — |
| `name` | TEXT | — | Individual name |
| `identifier` | TEXT | — | Microchip, band, PIT tag |
| `sex` | TEXT | — | — |
| `date_of_birth` | DATE | — | — |
| `acquisition_date` | DATE | — | — |
| `status` | TEXT | default `active` | `active`, `deceased`, `transferred`, `released` |
| `metadata` | JSONB | default `{}` | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

### `enclosure_animals`

Many-to-many with temporal tracking for which animals reside in which enclosure.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `enclosure_id` | UUID | NOT NULL, FK → `enclosures.id` | — |
| `animal_id` | UUID | NOT NULL, FK → `animals.id` | — |
| `introduced_at` | TIMESTAMPTZ | NOT NULL, default `now()` | When the animal was placed |
| `removed_at` | TIMESTAMPTZ | — | When the animal left |
| `removal_reason` | TEXT | — | `transfer`, `death`, `breeding_loan`, `release` |

---

## 7. Devices

### `devices`

Unified table for all hardware — sensors, actuators, controllers, gateways, cameras, alarms.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `enclosure_id` | UUID | FK → `enclosures.id` | Which enclosure (nullable for facility-level devices) |
| `enclosure_zone_id` | UUID | FK → `enclosure_zones.id` | Sub-zone within enclosure |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | Parent facility |
| `category` | `device_category` | NOT NULL | — |
| `sensor_type` | `sensor_type` | — | Populated when `category = 'sensor'` |
| `actuator_type` | `actuator_type` | — | Populated when `category = 'actuator'` |
| `manufacturer` | TEXT | — | — |
| `model` | TEXT | — | — |
| `serial_number` | TEXT | — | — |
| `firmware_version` | TEXT | — | — |
| `protocol` | TEXT | — | `mqtt`, `modbus_rtu`, `modbus_tcp`, `bacnet`, `zigbee`, `zwave`, `ble`, `wifi`, `canbus`, `analog_4_20ma`, `sdi12`, `onewire` |
| `bus_address` | TEXT | — | Protocol-specific address |
| `ip_address` | INET | — | — |
| `mac_address` | MACADDR | — | — |
| `commissioned_at` | DATE | — | — |
| `last_calibrated_at` | TIMESTAMPTZ | — | — |
| `calibration_due_at` | TIMESTAMPTZ | — | — |
| `is_active` | BOOLEAN | NOT NULL, default TRUE | — |
| `metadata` | JSONB | default `{}` | Unit of measure, range, precision, wattage, flow rate, etc. |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(enclosure_id)`, `(category)`

### `device_relationships`

Models parent/child wiring between devices: a controller "owns" the sensors and actuators it drives.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `parent_device_id` | UUID | NOT NULL, FK → `devices.id` | Controller / gateway |
| `child_device_id` | UUID | NOT NULL, FK → `devices.id` | Sensor / actuator |
| `relationship` | TEXT | NOT NULL | `controls`, `monitors`, `powers`, `gateway_for` |

**Primary Key:** `(parent_device_id, child_device_id)`

---

## 8. Telemetry — Sensor Readings

### `sensor_readings`

High-frequency time-series table. Designed as a TimescaleDB hypertable candidate.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `time` | TIMESTAMPTZ | NOT NULL | Reading timestamp |
| `device_id` | UUID | NOT NULL, FK → `devices.id` | Source sensor |
| `value` | NUMERIC(16,6) | NOT NULL | Measurement value |
| `unit` | TEXT | — | Unit of measure |
| `status` | `reading_status` | NOT NULL, default `nominal` | — |
| `quality` | SMALLINT | default 100 | 0–100 signal quality / confidence |
| `metadata` | JSONB | — | — |

**Index:** `(device_id, time DESC)`

> **TimescaleDB:** `SELECT create_hypertable('sensor_readings', 'time');`

---

## 9. Actuator Commands & State Log

### `actuator_commands`

Full command lifecycle tracking from issuance through execution or failure.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `device_id` | UUID | NOT NULL, FK → `devices.id` | Target actuator |
| `command` | TEXT | NOT NULL | `set_position`, `turn_on`, `turn_off`, `set_speed`, `set_temperature`, `dose_ml`, `set_intensity`, `open`, `close` |
| `parameters` | JSONB | NOT NULL, default `{}` | Command arguments |
| `issued_by` | TEXT | — | `schedule`, `rule_engine`, `user:<uuid>`, `api` |
| `status` | `command_status` | NOT NULL, default `queued` | — |
| `issued_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `acknowledged_at` | TIMESTAMPTZ | — | Device confirmed receipt |
| `executed_at` | TIMESTAMPTZ | — | Command completed |
| `error_message` | TEXT | — | Failure detail |

### `actuator_state_log`

Continuous state snapshots. Also a TimescaleDB hypertable candidate.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `time` | TIMESTAMPTZ | NOT NULL | — |
| `device_id` | UUID | NOT NULL, FK → `devices.id` | — |
| `state` | JSONB | NOT NULL | e.g. `{"position_pct": 45, "flow_lpm": 12.3, "on": true}` |
| `reported_by` | TEXT | default `device` | `device`, `inferred`, `manual` |

**Index:** `(device_id, time DESC)`

---

## 10. Automation Rules & Schedules

### `setpoint_profiles`

Define ideal environmental ranges per species + enclosure type, optionally varying by time of day and season.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `name` | TEXT | NOT NULL | — |
| `species_id` | UUID | FK → `species.id` | — |
| `enclosure_type_id` | INT | FK → `enclosure_types.id` | — |
| `parameter` | TEXT | NOT NULL | Matches `sensor_type` values |
| `target_value` | NUMERIC(10,4) | — | Ideal setpoint |
| `min_value` | NUMERIC(10,4) | — | Lower bound |
| `max_value` | NUMERIC(10,4) | — | Upper bound |
| `unit` | TEXT | — | — |
| `time_of_day_start` | TIME | — | Nullable = 24 h |
| `time_of_day_end` | TIME | — | — |
| `season` | TEXT | — | `summer`, `winter`, `wet`, `dry`, or NULL |
| `notes` | TEXT | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

### `schedules`

Cron-driven events: lights on/off, feeding, misting cycles, tide simulations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `enclosure_id` | UUID | NOT NULL, FK → `enclosures.id` | — |
| `name` | TEXT | NOT NULL | — |
| `cron_expression` | TEXT | NOT NULL | e.g. `0 7 * * *` = 7 AM daily |
| `action` | JSONB | NOT NULL | `[{device_id, command, parameters}, ...]` |
| `is_active` | BOOLEAN | NOT NULL, default TRUE | — |
| `priority` | INT | default 50 | Higher = wins on conflict |
| `valid_from` | DATE | — | Schedule start date |
| `valid_to` | DATE | — | Schedule end date |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

### `automation_rules`

Reactive rules: when a sensor condition is met, fire actuator commands.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `enclosure_id` | UUID | FK → `enclosures.id` | NULL = facility-wide |
| `name` | TEXT | NOT NULL | — |
| `description` | TEXT | — | — |
| `is_active` | BOOLEAN | NOT NULL, default TRUE | — |
| `priority` | INT | default 50 | — |
| `condition` | JSONB | NOT NULL | DSL: `{"all":[{"sensor":"<uuid>","op":">","value":28}, ...]}` |
| `debounce_seconds` | INT | default 60 | Ignore re-trigger within this window |
| `cooldown_seconds` | INT | default 300 | Minimum gap between firings |
| `actions` | JSONB | NOT NULL | `[{device_id, command, parameters}, ...]` |
| `on_clear_actions` | JSONB | — | Commands to run when condition clears |
| `last_triggered_at` | TIMESTAMPTZ | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

---

## 11. Alerts & Notifications

### `alerts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `enclosure_id` | UUID | FK → `enclosures.id` | — |
| `device_id` | UUID | FK → `devices.id` | — |
| `rule_id` | UUID | FK → `automation_rules.id` | Which rule triggered this |
| `severity` | `alert_severity` | NOT NULL | — |
| `title` | TEXT | NOT NULL | — |
| `message` | TEXT | — | — |
| `reading_value` | NUMERIC(16,6) | — | Actual reading that caused the alert |
| `threshold_value` | NUMERIC(16,6) | — | The threshold that was breached |
| `acknowledged_by` | UUID | FK → `users.id` | — |
| `acknowledged_at` | TIMESTAMPTZ | — | — |
| `resolved_at` | TIMESTAMPTZ | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Index:** `(facility_id, resolved_at) WHERE resolved_at IS NULL` — fast lookup of open alerts.

---

## 12. Plumbing & Electrical Topology

Models how water, air, refrigerant, and power physically flow between equipment.

### `plumbing_circuits`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `name` | TEXT | NOT NULL | e.g. `main_reef_loop`, `quarantine_drain`, `fog_line_3` |
| `medium` | TEXT | NOT NULL | `freshwater`, `saltwater`, `air`, `refrigerant`, `electrical` |
| `is_closed_loop` | BOOLEAN | default FALSE | — |
| `notes` | TEXT | — | — |

### `plumbing_segments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `circuit_id` | UUID | NOT NULL, FK → `plumbing_circuits.id` | — |
| `from_device_id` | UUID | FK → `devices.id` | — |
| `to_device_id` | UUID | FK → `devices.id` | — |
| `from_enclosure_id` | UUID | FK → `enclosures.id` | — |
| `to_enclosure_id` | UUID | FK → `enclosures.id` | — |
| `pipe_diameter_mm` | NUMERIC(6,1) | — | — |
| `length_m` | NUMERIC(8,2) | — | — |
| `material` | TEXT | — | — |
| `sequence_order` | INT | NOT NULL, default 0 | Position in the circuit |

---

## 13. Maintenance & Calibration

### `maintenance_tasks`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `enclosure_id` | UUID | FK → `enclosures.id` | — |
| `device_id` | UUID | FK → `devices.id` | — |
| `title` | TEXT | NOT NULL | — |
| `description` | TEXT | — | — |
| `due_at` | TIMESTAMPTZ | — | — |
| `recurrence_cron` | TEXT | — | Recurring tasks |
| `completed_at` | TIMESTAMPTZ | — | — |
| `completed_by` | UUID | FK → `users.id` | — |
| `notes` | TEXT | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

### `calibration_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `device_id` | UUID | NOT NULL, FK → `devices.id` | — |
| `calibrated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `calibrated_by` | UUID | FK → `users.id` | — |
| `reference_standard` | TEXT | — | e.g. `7.00 pH buffer`, `1413 µS/cm standard` |
| `pre_cal_offset` | NUMERIC(10,4) | — | Drift before calibration |
| `post_cal_offset` | NUMERIC(10,4) | — | Residual after calibration |
| `passed` | BOOLEAN | NOT NULL | — |
| `notes` | TEXT | — | — |

---

## 14. Users & Caretakers

### `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `email` | TEXT | NOT NULL, UNIQUE | — |
| `display_name` | TEXT | NOT NULL | — |
| `phone` | TEXT | — | — |
| `avatar_url` | TEXT | — | — |
| `auth_provider` | TEXT | — | `email`, `google`, `apple`, `sso` |
| `auth_provider_id` | TEXT | — | External auth identifier |
| `is_active` | BOOLEAN | NOT NULL, default TRUE | — |
| `last_login_at` | TIMESTAMPTZ | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

### `user_profiles`

Extended professional and emergency contact info for caretakers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | UUID | PK, FK → `users.id` CASCADE | — |
| `title` | TEXT | — | `DVM`, `CVT`, `Curator`, `Head Keeper` |
| `organisation` | TEXT | — | — |
| `license_number` | TEXT | — | Vet license, wildlife rehab permit, etc. |
| `emergency_phone` | TEXT | — | — |
| `bio` | TEXT | — | — |
| `certifications` | JSONB | default `[]` | `[{name, issuer, expires_at}]` |
| `notification_prefs` | JSONB | default `{}` | `{email: true, push: true, sms: false, quiet_hours: {start, end}}` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

---

## 15. Invitations

### `invitations`

Token-based invite flow. An owner or admin sends an invitation to an email address; the invitee clicks a link containing the secure token to accept.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` CASCADE | — |
| `invited_by` | UUID | NOT NULL, FK → `users.id` | Who sent the invite |
| `invitee_email` | TEXT | NOT NULL | — |
| `invitee_user_id` | UUID | FK → `users.id` | Set once they accept and have an account |
| `role` | `access_role` | NOT NULL, default `keeper` | — |
| `status` | `invitation_status` | NOT NULL, default `pending` | — |
| `personal_message` | TEXT | — | e.g. "Hey, I added you to help with the reef tanks" |
| `token` | TEXT | NOT NULL, UNIQUE | Secure random token for the invite link |
| `expires_at` | TIMESTAMPTZ | NOT NULL, default `now() + 14 days` | — |
| `accepted_at` | TIMESTAMPTZ | — | — |
| `revoked_at` | TIMESTAMPTZ | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(invitee_email) WHERE status = 'pending'`, `(token) WHERE status = 'pending'`, `(facility_id)`

---

## 16. Access Grants — Scoped Permissions

### `access_grants`

Each row grants a user a role scoped to a facility, zone, or enclosure. A user can hold multiple grants (e.g. keeper on Enclosure A, viewer on Zone B).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `user_id` | UUID | NOT NULL, FK → `users.id` CASCADE | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` CASCADE | — |
| `scope_type` | `access_scope_type` | NOT NULL | — |
| `scope_id` | UUID | NOT NULL | References `facilities.id`, `zones.id`, or `enclosures.id` depending on `scope_type` |
| `role` | `access_role` | NOT NULL | — |
| `granted_by` | UUID | NOT NULL, FK → `users.id` | — |
| `invitation_id` | UUID | FK → `invitations.id` | Links to the invitation that created this grant |
| `is_active` | BOOLEAN | NOT NULL, default TRUE | — |
| `valid_from` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `valid_until` | TIMESTAMPTZ | — | NULL = no expiry |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Unique:** `(user_id, facility_id, scope_type, scope_id)`  
**Indexes:** `(user_id) WHERE is_active`, `(facility_id) WHERE is_active`, `(scope_type, scope_id) WHERE is_active`

### `role_permissions`

Maps each role to its default set of permissions. `facility_id = NULL` rows are global defaults shipped with the app. Facility owners can insert facility-specific rows to customise.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | FK → `facilities.id` | NULL = global default |
| `role` | `access_role` | NOT NULL | — |
| `permission` | `permission` | NOT NULL | — |

**Unique:** `(facility_id, role, permission)`

#### Default Role → Permission Matrix

| Permission | owner | admin | vet | keeper | tech | volunteer | viewer |
|---|---|---|---|---|---|---|---|
| `view_telemetry` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `view_animals` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| `view_devices` | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `view_alerts` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `acknowledge_alerts` | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| `command_actuators` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `manage_schedules` | ✓ | ✓ | — | ✓ | — | — | — |
| `manage_rules` | ✓ | ✓ | — | — | — | — | — |
| `manage_devices` | ✓ | ✓ | — | — | ✓ | — | — |
| `manage_animals` | ✓ | ✓ | ✓ | ✓ | — | — | — |
| `manage_enclosures` | ✓ | ✓ | — | — | — | — | — |
| `manage_species` | ✓ | ✓ | — | — | — | — | — |
| `manage_plumbing` | ✓ | ✓ | — | — | ✓ | — | — |
| `perform_maintenance` | ✓ | ✓ | — | — | ✓ | — | — |
| `calibrate_devices` | ✓ | ✓ | — | — | ✓ | — | — |
| `invite_users` | ✓ | ✓ | — | — | — | — | — |
| `manage_users` | ✓ | ✓ | — | — | — | — | — |
| `manage_facility` | ✓ | — | — | — | — | — | — |
| `export_data` | ✓ | ✓ | ✓ | — | — | — | — |
| `view_audit_log` | ✓ | ✓ | — | — | — | — | — |

### `access_grant_overrides`

Per-grant surgical adjustments. Allows adding a permission not in the role's defaults, or denying one that is.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `access_grant_id` | UUID | NOT NULL, FK → `access_grants.id` CASCADE | — |
| `permission` | `permission` | NOT NULL | — |
| `effect` | TEXT | NOT NULL, CHECK `IN ('allow','deny')` | — |
| `reason` | TEXT | — | Audit trail, e.g. "Temporary pump access during filter replacement" |
| `granted_by` | UUID | NOT NULL, FK → `users.id` | — |
| `valid_from` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `valid_until` | TIMESTAMPTZ | — | NULL = permanent |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Unique:** `(access_grant_id, permission)`

---

## 17. Access Activity Log

### `access_activity_log`

Dedicated audit trail for every invitation and access grant change, separate from the general audit log for easy "who has access to what and why" queries.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `actor_user_id` | UUID | FK → `users.id` | Who performed the action |
| `target_user_id` | UUID | FK → `users.id` | Who was affected |
| `invitation_id` | UUID | FK → `invitations.id` | — |
| `access_grant_id` | UUID | FK → `access_grants.id` | — |
| `action` | TEXT | NOT NULL | `invited`, `accepted`, `declined`, `revoked`, `grant_created`, `grant_updated`, `grant_deactivated`, `override_added`, `override_removed` |
| `details` | JSONB | — | Snapshot of what changed |
| `performed_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(facility_id, performed_at DESC)`, `(target_user_id, performed_at DESC)`

---

## 18. Effective Permissions (View)

### `v_effective_permissions`

A convenience view that resolves the full chain — grant → role defaults → overrides → expiry — into a flat, query-ready list of what each user can actually do at each scope.

| Column | Source |
|---|---|
| `user_id` | `access_grants.user_id` |
| `facility_id` | `access_grants.facility_id` |
| `scope_type` | `access_grants.scope_type` |
| `scope_id` | `access_grants.scope_id` |
| `role` | `access_grants.role` |
| `permission` | Resolved from `role_permissions` + `access_grant_overrides` |

**Resolution logic:**

1. Join active, non-expired `access_grants` with `role_permissions` to get the base permission set.
2. Left-join `access_grant_overrides` to check for `deny` overrides (removes the permission) or `allow` overrides not in the base set (adds it).
3. Union in any override-only `allow` permissions that don't exist in the role defaults.
4. Emit only rows where the final `effect = 'allow'`.

This view is designed to be queried by the application's authorization middleware:

```sql
-- "Can user X do 'command_actuators' on enclosure Y?"
SELECT 1
FROM v_effective_permissions
WHERE user_id = :user_id
  AND permission = 'command_actuators'
  AND (
      (scope_type = 'enclosure' AND scope_id = :enclosure_id)
   OR (scope_type = 'zone'      AND scope_id = :enclosure_zone_id)
   OR (scope_type = 'facility'  AND scope_id = :facility_id)
  )
LIMIT 1;
```

---

## 19. Audit Log

### `audit_log`

General-purpose change log for all entities.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGSERIAL | PK | — |
| `entity_type` | TEXT | NOT NULL | `enclosure`, `device`, `animal`, `rule`, `schedule`, `user`, `invitation`, `access_grant` |
| `entity_id` | UUID | NOT NULL | — |
| `action` | TEXT | NOT NULL | `create`, `update`, `delete`, `command`, `alert`, `invite`, `grant`, `revoke` |
| `changed_by` | UUID | FK → `users.id` | — |
| `changed_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `diff` | JSONB | — | Before/after snapshot |

**Index:** `(entity_type, entity_id, changed_at DESC)`
