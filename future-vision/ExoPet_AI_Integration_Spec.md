# ExoPet — AI Integration Specification

> **Version:** 1.0  
> **Last updated:** March 10, 2026  
> **Companion to:** ExoPet Unified Habitat Automation Schema Specification v1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Schema Additions](#2-schema-additions)
3. [Visual Diagnostics](#3-visual-diagnostics)
4. [Behavioral Monitoring](#4-behavioral-monitoring)
5. [Keeper & Vet Communication Intelligence](#5-keeper--vet-communication-intelligence)
6. [Predictive Anomaly Detection](#6-predictive-anomaly-detection)
7. [Species Care Intelligence](#7-species-care-intelligence)
8. [Natural Language Control Interface](#8-natural-language-control-interface)
9. [Enclosure Auditing via Image Analysis](#9-enclosure-auditing-via-image-analysis)
10. [Water Chemistry Forecasting](#10-water-chemistry-forecasting)
11. [Infrastructure & Model Operations](#11-infrastructure--model-operations)
12. [Safety, Ethics & Governance](#12-safety-ethics--governance)

---

## 1. Overview

This specification defines the AI capabilities layered on top of ExoPet's core habitat automation schema. Every feature follows a single guiding principle: **AI suggests, humans confirm.** No AI output autonomously alters animal welfare conditions without a qualified human in the loop. The system creates draft observations, recommended actions, and predictive alerts — keepers, technicians, and veterinarians review, approve, and act on them.

### Design Goals

- Reduce animal mortality caused by missed environmental anomalies and late disease detection.
- Compress the feedback loop between observation, diagnosis, and intervention.
- Scale keeper expertise — let one person monitor more enclosures without sacrificing attention quality.
- Capture institutional knowledge so it survives staff turnover.
- Work across all tiers, from a hobbyist's single reef tank to a campus-scale zoological facility.

### Relationship to Core Schema

All AI features interface with the existing schema through well-defined touchpoints. AI never writes directly to control tables (`actuator_commands`, `schedules`, `automation_rules`). Instead, AI outputs flow into new staging tables (`ai_assessments`, `ai_command_proposals`) that require human approval before becoming live records. The `audit_log` captures the full chain: AI detected → human confirmed → action taken.

---

## 2. Schema Additions

### New Enumerations

#### `ai_feature`

Identifies which AI subsystem produced an output.

| Value | Description |
|---|---|
| `visual_diagnosis` | On-demand or automated animal health image analysis |
| `behavior_monitor` | Continuous behavioral anomaly detection from video |
| `note_summarizer` | Shift handoff briefs and care note summarization |
| `note_extractor` | Structured data extraction from free-text observations |
| `anomaly_detector` | Telemetry anomaly detection on sensor time-series |
| `predictive_maintenance` | Equipment degradation and failure forecasting |
| `care_advisor` | Species care profile recommendations and gap analysis |
| `breeding_analyst` | Breeding outcome correlation and seasonal cycle optimization |
| `nlc` | Natural language control — intent parsing and command generation |
| `enclosure_auditor` | Image-based enclosure condition assessment |
| `chemistry_forecaster` | Water chemistry trend projection and intervention scheduling |

#### `assessment_status`

Lifecycle of an AI output.

| Value | Description |
|---|---|
| `pending_review` | AI has produced an output awaiting human review |
| `confirmed` | A qualified user has accepted the assessment |
| `rejected` | A qualified user has dismissed the assessment as incorrect |
| `auto_expired` | Assessment aged out without review (configurable TTL) |
| `superseded` | A newer assessment on the same subject replaced this one |

#### `proposal_status`

Lifecycle of an AI-generated command proposal.

| Value | Description |
|---|---|
| `proposed` | AI has suggested an action but no human has acted |
| `approved` | A user approved the action — command has been issued |
| `modified` | A user altered the AI's suggestion before approving |
| `rejected` | A user declined the proposed action |
| `auto_expired` | Proposal aged out without action |

---

### New Tables

#### `care_notes`

Free-text observations entered by keepers, vets, and volunteers.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `enclosure_id` | UUID | FK → `enclosures.id` | Nullable for facility-wide notes |
| `animal_id` | UUID | FK → `animals.id` | Nullable for enclosure-level notes |
| `author_id` | UUID | NOT NULL, FK → `users.id` | Who wrote the note |
| `note_type` | TEXT | NOT NULL | `observation`, `feeding`, `medical`, `enrichment`, `maintenance`, `behavior`, `general` |
| `body` | TEXT | NOT NULL | Raw free-text entry |
| `attachments` | JSONB | default `[]` | `[{url, mime_type, thumbnail_url}]` — photos, videos, voice memos |
| `ai_extracted` | JSONB | — | Structured data the AI parsed from `body` (see §5) |
| `ai_extraction_model` | TEXT | — | Model version that performed extraction |
| `shift_date` | DATE | NOT NULL | The operational day this note belongs to |
| `tags` | TEXT[] | default `{}` | User-applied or AI-suggested tags |
| `is_flagged` | BOOLEAN | NOT NULL, default FALSE | Urgent flag for vet/curator attention |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(enclosure_id, shift_date DESC)`, `(animal_id, created_at DESC)`, `(facility_id, shift_date DESC, note_type)`

---

#### `ai_assessments`

Central record for every AI inference — visual diagnoses, anomaly detections, care recommendations, enclosure audits, chemistry forecasts.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `enclosure_id` | UUID | FK → `enclosures.id` | — |
| `animal_id` | UUID | FK → `animals.id` | — |
| `device_id` | UUID | FK → `devices.id` | Source sensor/camera if applicable |
| `feature` | `ai_feature` | NOT NULL | Which AI subsystem produced this |
| `status` | `assessment_status` | NOT NULL, default `pending_review` | — |
| `severity` | `alert_severity` | — | Nullable; set when assessment warrants an alert |
| `title` | TEXT | NOT NULL | Human-readable summary headline |
| `detail` | JSONB | NOT NULL | Feature-specific structured output (see per-feature sections) |
| `confidence` | NUMERIC(5,4) | — | 0.0000–1.0000 overall confidence score |
| `model_id` | TEXT | NOT NULL | Model identifier + version string |
| `model_input_ref` | TEXT | — | URI/path to the input data (image, time window, note ID) |
| `alert_id` | UUID | FK → `alerts.id` | If this assessment generated a core-schema alert |
| `maintenance_task_id` | UUID | FK → `maintenance_tasks.id` | If this generated a maintenance task |
| `reviewed_by` | UUID | FK → `users.id` | — |
| `reviewed_at` | TIMESTAMPTZ | — | — |
| `reviewer_notes` | TEXT | — | Why the reviewer confirmed/rejected |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(facility_id, feature, created_at DESC)`, `(enclosure_id, feature, status)`, `(animal_id, feature, created_at DESC)`

---

#### `ai_command_proposals`

Staging table for commands the AI wants to issue. Commands only reach `actuator_commands` after human approval.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `assessment_id` | UUID | FK → `ai_assessments.id` | The assessment that triggered this proposal |
| `device_id` | UUID | NOT NULL, FK → `devices.id` | Target actuator |
| `proposed_command` | TEXT | NOT NULL | Same vocabulary as `actuator_commands.command` |
| `proposed_parameters` | JSONB | NOT NULL, default `{}` | — |
| `rationale` | TEXT | — | AI's explanation of why this action is recommended |
| `status` | `proposal_status` | NOT NULL, default `proposed` | — |
| `approved_by` | UUID | FK → `users.id` | — |
| `approved_at` | TIMESTAMPTZ | — | — |
| `actual_command_id` | UUID | FK → `actuator_commands.id` | The real command created upon approval |
| `modified_parameters` | JSONB | — | If the user altered the AI's suggestion |
| `expires_at` | TIMESTAMPTZ | — | Auto-expire if not acted upon |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(status, created_at DESC) WHERE status = 'proposed'`

---

#### `ai_conversations`

Persists natural language control interactions for audit and learning.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `user_id` | UUID | NOT NULL, FK → `users.id` | Who issued the command |
| `session_id` | UUID | NOT NULL | Groups multi-turn exchanges |
| `role` | TEXT | NOT NULL | `user` or `assistant` |
| `content` | TEXT | NOT NULL | Raw message text |
| `parsed_intent` | JSONB | — | Structured intent extraction (for `user` messages) |
| `resolved_entities` | JSONB | — | `{enclosure_id, device_ids[], animal_id, schedule_id}` |
| `proposals_generated` | UUID[] | — | References to `ai_command_proposals.id` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(session_id, created_at ASC)`, `(user_id, created_at DESC)`

---

#### `shift_handoff_briefs`

AI-generated summaries delivered to keepers at the start of their shift.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `facility_id` | UUID | NOT NULL, FK → `facilities.id` | — |
| `recipient_id` | UUID | NOT NULL, FK → `users.id` | The keeper receiving this brief |
| `shift_date` | DATE | NOT NULL | — |
| `scope_type` | `access_scope_type` | NOT NULL | What scope this brief covers |
| `scope_id` | UUID | NOT NULL | — |
| `summary` | TEXT | NOT NULL | The generated narrative brief |
| `sections` | JSONB | NOT NULL | Structured breakdown (see §5) |
| `source_note_ids` | UUID[] | — | `care_notes` that fed the summary |
| `source_alert_ids` | UUID[] | — | `alerts` that fed the summary |
| `source_assessment_ids` | UUID[] | — | `ai_assessments` that fed the summary |
| `model_id` | TEXT | NOT NULL | — |
| `read_at` | TIMESTAMPTZ | — | When the recipient opened it |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(recipient_id, shift_date DESC)`, `(facility_id, shift_date DESC)`

---

#### `behavior_baselines`

Stores the learned "normal" behavioral signature for each enclosure + camera pair.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `enclosure_id` | UUID | NOT NULL, FK → `enclosures.id` | — |
| `device_id` | UUID | NOT NULL, FK → `devices.id` | Source camera |
| `model_id` | TEXT | NOT NULL | Behavior model version |
| `baseline_data` | JSONB | NOT NULL | Encoded activity signatures per time-of-day bucket |
| `training_start` | TIMESTAMPTZ | NOT NULL | Beginning of training window |
| `training_end` | TIMESTAMPTZ | NOT NULL | End of training window |
| `sample_count` | INT | NOT NULL | Number of frames/clips used |
| `is_active` | BOOLEAN | NOT NULL, default TRUE | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Unique:** `(enclosure_id, device_id) WHERE is_active = TRUE`

---

#### `chemistry_forecasts`

Predicted future water chemistry values and recommended interventions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | — |
| `enclosure_id` | UUID | NOT NULL, FK → `enclosures.id` | — |
| `parameter` | TEXT | NOT NULL | Matches `sensor_type`: `nitrate`, `ph`, `alkalinity`, etc. |
| `current_value` | NUMERIC(10,4) | NOT NULL | Value at time of forecast |
| `forecast_values` | JSONB | NOT NULL | `[{hours_ahead, predicted_value, confidence_low, confidence_high}]` |
| `threshold_breach_at` | TIMESTAMPTZ | — | Predicted time the value will exit safe range |
| `recommended_action` | TEXT | — | e.g. "20% water change by Thursday" |
| `assessment_id` | UUID | FK → `ai_assessments.id` | Link to parent assessment |
| `model_id` | TEXT | NOT NULL | — |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | — |

**Indexes:** `(enclosure_id, parameter, created_at DESC)`

---

## 3. Visual Diagnostics

### 3.1 Purpose

Enable keepers, hobbyists, and veterinarians to photograph an animal and receive an AI-powered health assessment within seconds. The system identifies visual indicators of disease, injury, or stress and provides differential diagnoses with confidence scores and recommended next steps.

### 3.2 Supported Modalities

| Modality | Input | Trigger | Latency Target |
|---|---|---|---|
| On-demand snap | Photo uploaded via mobile app | User taps "Health Check" | < 5 seconds |
| Scheduled capture | Camera in `devices` table on a timer | `schedules` cron fires a capture command | < 30 seconds |
| Continuous screening | Video stream sampled at configurable FPS | Frame-level inference on edge device | Near-real-time |

### 3.3 Output Schema

The `ai_assessments.detail` JSONB for `feature = 'visual_diagnosis'`:

```json
{
  "image_ref": "s3://exopet-media/facility-uuid/20260310/img_001.jpg",
  "species_detected": {
    "common_name": "Axolotl",
    "scientific_name": "Ambystoma mexicanum",
    "confidence": 0.97
  },
  "body_condition_score": 3,
  "findings": [
    {
      "condition": "Fungal infection",
      "location": "left gill filaments",
      "visual_markers": ["white cotton-like patches", "reduced gill fimbriation"],
      "confidence": 0.84,
      "severity": "moderate",
      "differential": [
        {"condition": "Columnaris", "confidence": 0.09},
        {"condition": "Saprolegnia", "confidence": 0.05}
      ]
    }
  ],
  "recommended_actions": [
    "Perform salt bath (2 tsp/L for 10 min) and monitor 24h",
    "Check water parameters — ammonia and temperature",
    "If no improvement in 48h, consult veterinarian for methylene blue treatment"
  ],
  "urgency": "within_24h",
  "annotated_image_ref": "s3://exopet-media/facility-uuid/20260310/img_001_annotated.jpg"
}
```

### 3.4 Model Architecture

The recommended approach is a two-stage pipeline. Stage one is a species identification classifier that determines what animal is in the frame, which selects the appropriate stage-two model — a species-group-specific condition detector. This avoids the combinatorial explosion of training one model for every disease across every species. Species groups with sufficient training data include: freshwater fish (general), reef fish, axolotls, snakes, geckos/lizards, chelonians (turtles/tortoises), dart frogs, and corals.

For on-device inference (Tier 1–2 hardware), models should target ONNX Runtime or TensorFlow Lite. For cloud inference (Tier 3–5), a hosted vision model with fine-tuned LoRA adapters per species group.

### 3.5 Training Data Strategy

Training data will come from three sources: publicly available veterinary image datasets, a user-contributed image program where hobbyists submit labeled photos (with consent and anonymization), and partnered veterinary clinics that contribute diagnosed case photos. All images require at minimum: species, diagnosis (confirmed by a vet or experienced keeper), date, and image quality score. A target of 500–1,000 labeled images per condition per species group is the minimum for reliable classification.

### 3.6 Confidence Thresholds and Escalation

| Confidence | Behavior |
|---|---|
| ≥ 0.85 | Show diagnosis with recommended action |
| 0.50–0.84 | Show diagnosis as "possible" with a prompt to confirm visually |
| < 0.50 | Display "inconclusive" and recommend manual inspection or re-photograph |

Any finding with `severity = 'critical'` or higher (e.g. prolapse, open wound, severe emaciation) triggers an immediate push notification to all users with `veterinarian` or `keeper` role on that enclosure, regardless of confidence.

---

## 4. Behavioral Monitoring

### 4.1 Purpose

Detect abnormal animal behavior through continuous or periodic video analysis, establishing per-enclosure baselines and flagging deviations that may indicate illness, stress, or environmental problems.

### 4.2 Behavioral Signals by Taxon

| Taxon | Normal Signals | Anomalous Signals |
|---|---|---|
| Fish | Schooling patterns, feeding response, normal swim speed, territory holding | Bottom-sitting, surface gasping, clamped fins, flashing/scratching, isolation from school |
| Reptiles | Basking cycle, thermoregulation shuttling, feeding strikes, tongue-flicking | Prolonged hiding, failure to bask, mouth gaping (not basking), star-gazing |
| Amphibians | Activity during species-appropriate hours, feeding response | Lethargy, floating abnormally, failure to retreat to hide |
| Birds | Preening, vocalizing, flight patterns, foraging | Feather plucking, sitting fluffed on perch, cessation of vocalization |
| Mammals (small) | Wheel running, burrowing, foraging, social grooming | Excessive bar-biting, circling, over-grooming, aggression spikes |
| Mammals (large/zoo) | Patrol routes, social interaction, feeding engagement | Stereotypic pacing, self-directed behaviors, appetite loss, isolation |
| Invertebrates | Web-building, molting cycle, foraging activity | Collapsed web, premature/delayed molt, refusal to feed |

### 4.3 Baseline Learning

When a camera is commissioned in an enclosure, the system enters a **learning phase** (configurable, default 14 days). During this period, the model ingests frame samples and builds a `behavior_baselines` record encoding normal activity levels bucketed by hour-of-day and day-of-week. The baseline is species-aware — it knows that a nocturnal gecko showing no movement at noon is normal, while a diurnal iguana showing no movement at noon is not.

After the learning phase, the model switches to **monitoring mode**. Deviations beyond a configurable sensitivity threshold generate an `ai_assessments` record with `feature = 'behavior_monitor'`.

### 4.4 Output Schema

The `ai_assessments.detail` JSONB for `feature = 'behavior_monitor'`:

```json
{
  "observation_window": {
    "start": "2026-03-10T06:00:00Z",
    "end": "2026-03-10T12:00:00Z"
  },
  "baseline_comparison": {
    "expected_activity_level": 0.72,
    "observed_activity_level": 0.11,
    "deviation_sigma": 3.8
  },
  "anomalies": [
    {
      "type": "prolonged_inactivity",
      "description": "Subject has remained stationary at bottom-left of enclosure for 5h 42m",
      "location_in_frame": {"x_pct": 15, "y_pct": 85},
      "started_at": "2026-03-10T06:18:00Z",
      "clip_ref": "s3://exopet-media/clips/enc-uuid/20260310_0618_anomaly.mp4"
    }
  ],
  "environmental_correlation": {
    "temperature_at_onset": 18.2,
    "temperature_baseline": 24.5,
    "note": "Temperature dropped 6.3°C coinciding with onset — possible heater failure"
  },
  "suggested_check": "Verify heater function in zone 'basking_shelf'; inspect animal for lethargy or respiratory distress"
}
```

### 4.5 Edge vs. Cloud Processing

For Tier 1–2 (home/hobbyist), lightweight motion-heatmap models run on the Pi or edge gateway. These don't identify specific behaviors but detect gross activity level changes. For Tier 3–5 (zoo scale), dedicated edge AI appliances (NVIDIA Jetson Orin, Intel NUC with OpenVINO, or Coral TPU modules) run richer pose-estimation and activity-classification models per camera. Processed metadata (not raw video) is sent northbound to the ExoPet backend for cross-enclosure correlation.

---

## 5. Keeper & Vet Communication Intelligence

### 5.1 Shift Handoff Briefs

At a configurable time before each shift begins, the system generates a personalized briefing for each keeper. The brief is scoped to exactly the enclosures and zones the keeper has access to via `v_effective_permissions`.

#### Sections of a Shift Brief

The `shift_handoff_briefs.sections` JSONB:

```json
{
  "alerts_summary": {
    "critical": 0,
    "warning": 2,
    "info": 5,
    "highlights": [
      "pH alarm in Reef Tank 3 at 02:14 — auto-dosed buffer, now stable at 8.1",
      "Motion sensor in Komodo exhibit tripped at 23:40 — reviewed by night security, no issue"
    ]
  },
  "care_notes_digest": [
    {
      "author": "Dr. Rivera",
      "time": "2026-03-09T16:30:00Z",
      "enclosure": "Otter Habitat",
      "summary": "Rosie showing improved appetite post-antibiotic course. Continue monitoring stools. Ok to resume enrichment schedule."
    }
  ],
  "feeding_status": [
    {"enclosure": "Penguin Exhibit", "status": "completed", "notes": "All birds fed, Luna took extra herring"},
    {"enclosure": "Dart Frog Vivarium C", "status": "due", "notes": "Fruit flies due at 09:00"}
  ],
  "equipment_status": [
    {"enclosure": "Coral Propagation Rack", "device": "Dosing Pump #2", "issue": "Flow rate down 18% vs. baseline — maintenance task created"}
  ],
  "ai_assessments_pending": [
    {"id": "uuid", "feature": "visual_diagnosis", "title": "Possible fin rot on Betta in Tank 7", "confidence": 0.71}
  ],
  "weather_advisory": "High of 97°F today — outdoor enclosures may need supplemental misting"
}
```

### 5.2 Structured Extraction from Natural Language

When a keeper enters a free-text care note, the system runs it through an LLM to extract structured data into the `care_notes.ai_extracted` field.

#### Input Example

> "Mango (green tree python) refused her rat today, noticed a slight wheeze when she moved, bumped basking spot temp 2 degrees. Also topped off water dish."

#### Extracted Output

```json
{
  "animal_refs": [
    {"name": "Mango", "species_hint": "green tree python", "resolved_animal_id": "uuid-or-null"}
  ],
  "events": [
    {
      "type": "feeding",
      "detail": {"offered": "rat", "accepted": false},
      "concern_level": "mild"
    },
    {
      "type": "health_observation",
      "detail": {"symptom": "wheeze", "location": "respiratory", "trigger": "movement"},
      "concern_level": "moderate"
    },
    {
      "type": "environment_adjustment",
      "detail": {"parameter": "basking_temperature", "change": "+2°C"},
      "cross_reference": "Check actuator_commands for temp change on basking zone device"
    },
    {
      "type": "husbandry",
      "detail": {"action": "water_dish_refill"}
    }
  ],
  "suggested_tags": ["feeding_refusal", "respiratory", "temperature_adjustment"],
  "follow_up_recommended": true,
  "follow_up_reason": "Respiratory symptom combined with feeding refusal may indicate early respiratory infection"
}
```

The system cross-references the extracted temperature adjustment against the `actuator_commands` log to validate that the change actually happened. Discrepancies are flagged: "Note says basking temp was increased, but no actuator command was found — was this a manual adjustment?"

### 5.3 Veterinary Report Generation

When a vet requests a medical summary for an animal, the AI compiles a timeline from `care_notes`, `ai_assessments` (visual diagnoses), `sensor_readings` (enclosure environment during the animal's residency), `enclosure_animals` (housing history), and any related `alerts`. The output is a structured clinical summary suitable for referral to a specialist or for regulatory reporting.

---

## 6. Predictive Anomaly Detection

### 6.1 Purpose

Detect deviations in sensor telemetry that threshold-based rules miss — slow drifts, pattern shifts, and multi-sensor correlations that indicate emerging problems before they become critical.

### 6.2 Detection Modes

#### 6.2.1 Univariate Anomaly

A single sensor's readings deviate from its own historical pattern. The model learns the daily rhythm (e.g. temperature rises in the afternoon from ambient heat, pH dips after feeding) and flags breaks from this pattern. This catches scenarios where a value is technically within the `setpoint_profiles` min/max range but is abnormal for that time of day.

#### 6.2.2 Multivariate Correlation

Multiple sensors in the same enclosure or on the same `plumbing_circuit` shift together in ways that indicate a systemic issue. If three enclosures sharing a chiller loop all show simultaneous temperature rises, the problem is in the shared infrastructure, not any individual tank. The AI uses the `plumbing_segments` topology to reason about this.

#### 6.2.3 Equipment Degradation

Gradual changes in device behavior that predict failure. A pump's flow rate slowly declining over weeks, a pH probe's readings becoming noisier (increasing variance without environmental cause), or a heater taking longer to reach setpoint. These generate `maintenance_tasks` proactively.

### 6.3 Output Schema

The `ai_assessments.detail` JSONB for `feature = 'anomaly_detector'`:

```json
{
  "detection_type": "multivariate_correlation",
  "time_window": {
    "start": "2026-03-10T02:00:00Z",
    "end": "2026-03-10T04:00:00Z"
  },
  "affected_sensors": [
    {"device_id": "uuid-1", "parameter": "water_temperature", "enclosure": "Shark Tank A", "drift": "+1.8°C"},
    {"device_id": "uuid-2", "parameter": "water_temperature", "enclosure": "Ray Pool", "drift": "+1.6°C"},
    {"device_id": "uuid-3", "parameter": "water_temperature", "enclosure": "Touch Pool", "drift": "+1.4°C"}
  ],
  "shared_infrastructure": {
    "circuit_id": "uuid-chiller-loop-1",
    "circuit_name": "Main Marine Chiller Loop",
    "probable_cause": "Chiller output temperature rising — possible compressor degradation or condenser fouling"
  },
  "risk_assessment": "At current drift rate, Shark Tank A will exceed species max (26°C) in approximately 6 hours",
  "recommended_actions": [
    "Inspect chiller compressor and condenser coils",
    "Check chiller coolant levels",
    "Prepare backup chiller for switchover if primary fails"
  ]
}
```

### 6.4 For Equipment Degradation (`feature = 'predictive_maintenance'`)

```json
{
  "device_id": "uuid-ph-probe",
  "device_description": "pH Probe — Reef Tank 3",
  "degradation_type": "signal_noise_increase",
  "metric": {
    "name": "reading_variance_30min",
    "current": 0.18,
    "baseline": 0.03,
    "trend": "increasing over 14 days"
  },
  "estimated_failure_window": "7–14 days",
  "last_calibration": "2026-02-15T10:00:00Z",
  "recommended_action": "Recalibrate probe; if noise persists, replace electrode",
  "generated_maintenance_task_id": "uuid-task"
}
```

---

## 7. Species Care Intelligence

### 7.1 Purpose

Provide dynamic, context-aware husbandry guidance by cross-referencing published care standards against actual enclosure conditions, and by mining historical data for breeding and health outcome correlations.

### 7.2 Care Gap Analysis

When a new species is added to an enclosure, or on a configurable periodic audit, the AI compares the active `setpoint_profiles` and actual `sensor_readings` against the `species.care_profile` and any ingested external care references (AZA husbandry manuals, veterinary literature, trusted hobbyist care sheets).

#### Output Example

```json
{
  "species": "Dendrobates tinctorius",
  "enclosure": "Dart Frog Vivarium C",
  "gaps": [
    {
      "parameter": "humidity",
      "current_setpoint": {"min": 55, "max": 65},
      "recommended_range": {"min": 80, "max": 100},
      "source": "AZA Dendrobatid Husbandry Manual, 2022 ed.",
      "severity": "high",
      "suggestion": "Increase misting frequency or add fogger. Would you like me to create a new setpoint profile and misting schedule?"
    },
    {
      "parameter": "uv_index",
      "current_reading": 0.0,
      "recommended_range": {"min": 1.0, "max": 2.0},
      "source": "Ferguson Zone classification: Zone 1",
      "severity": "moderate",
      "suggestion": "Install low-output UVB source (e.g. 5.0 compact fluorescent at 12+ inches)"
    }
  ],
  "compliant_parameters": ["temperature", "photoperiod", "water_quality"],
  "overall_score": 0.62,
  "score_breakdown": "4/6 parameters within recommended range"
}
```

### 7.3 Breeding Outcome Correlation

For facilities managing breeding programs, the AI analyzes the relationship between environmental conditions and breeding outcomes over time. Data sources include `enclosure_animals` (introduction dates, pair composition), `sensor_readings` (environmental conditions during courtship/egg-laying windows), `schedules` (photoperiod and seasonal cycling history), and `care_notes` (keeper observations of courtship behavior, egg-laying, hatching).

#### Output Example

```json
{
  "species": "Varanus macraei",
  "analysis_window": "2023-01-01 to 2026-03-10",
  "total_breeding_attempts": 8,
  "successful_clutches": 3,
  "correlations": [
    {
      "factor": "pre-breeding cooling period",
      "finding": "All 3 successful clutches were preceded by a 3–4 week period where nighttime temps dropped below 22°C",
      "failed_attempts_condition": "5 of 5 failed attempts had no cooling period",
      "confidence": 0.89,
      "recommendation": "Schedule a 3-week nighttime cooling cycle (18–22°C) starting in September"
    },
    {
      "factor": "photoperiod",
      "finding": "Successful clutches correlated with photoperiod reduction to 10h light before cooling",
      "confidence": 0.72,
      "recommendation": "Adjust light schedule to 10h/14h before initiating cooling"
    }
  ],
  "proposed_schedule": {
    "description": "Automated seasonal breeding cycle for V. macraei",
    "steps": [
      {"month": "August", "action": "Reduce photoperiod to 10h light"},
      {"month": "September", "action": "Begin nighttime cooling to 20°C"},
      {"month": "October", "action": "End cooling, restore temps, increase feeding"},
      {"month": "November", "action": "Monitor for courtship behavior, provide nesting substrate"}
    ]
  }
}
```

---

## 8. Natural Language Control Interface

### 8.1 Purpose

Allow keepers and operators to issue commands and query system state using conversational language instead of navigating through device menus. The interface resolves natural references ("the dart frog room," "Mango's enclosure") to specific schema entities and translates intent into structured `ai_command_proposals`.

### 8.2 Intent Categories

| Intent | Example Utterance | Resolved Action |
|---|---|---|
| `device_control` | "Dim the lights in the dart frog room to 20%" | `ai_command_proposals` → `set_intensity` on light devices |
| `schedule_trigger` | "Start the evening misting cycle in vivarium C" | Trigger named schedule |
| `query_status` | "What's the pH in tank 7 right now?" | Query latest `sensor_readings` |
| `query_history` | "Show me the temperature trend in the shark tank this week" | Query time-series, return chart |
| `multi_step_procedure` | "Prepare quarantine tank 3 for a new marine arrival" | Multiple proposals: fill, set salinity, set temp, enable UV, create task |
| `care_inquiry` | "What should the humidity be for my crested gecko?" | Query `species.care_profile` + external knowledge |
| `alert_triage` | "What's going on with the alarms in building 2?" | Query open `alerts` in zone |

### 8.3 Authorization Enforcement

Before generating any `ai_command_proposals`, the NLC checks `v_effective_permissions` for the requesting user. If the user lacks `command_actuators` on the resolved enclosure, the system explains: "You have viewer access to that enclosure. I can show you the current status but can't issue commands. Would you like me to notify someone with keeper access?"

### 8.4 Confirmation Flow

All device-affecting commands require explicit confirmation:

```
Keeper: "Turn off the UV sterilizer in quarantine 2"

ExoPet: I'll send this command:
  → Device: UV Sterilizer (QT-UV-002) in Quarantine Tank 2
  → Command: turn_off
  
  ⚠️ Note: This tank currently houses animals in active treatment.
  Disabling UV sterilization may affect water quality.
  
  [Confirm]  [Cancel]  [Ask vet first]
```

The "Ask vet first" option creates a `care_notes` entry flagged for veterinarian review with the proposed action embedded.

### 8.5 Compound Commands

For multi-step procedures, the system presents all proposed actions as a reviewable checklist:

```
Keeper: "Prepare quarantine tank 3 for a new marine arrival matching reef tank 1"

ExoPet: Here's the preparation plan for Quarantine Tank 3:

  1. ✓ Verified tank is empty (no animals in enclosure_animals)
  2. → Start fill pump (QT3-PUMP-001) — target 200L
  3. → Set salinity target to 35.2 ppt (matching Reef Tank 1 current reading)
  4. → Set temperature to 25.8°C (matching Reef Tank 1 current reading)
  5. → Enable UV sterilizer (QT3-UV-001)
  6. → Enable protein skimmer (QT3-SKIM-001)
  7. → Schedule water quality test in 24 hours (maintenance task)
  
  [Approve all]  [Edit steps]  [Cancel]
```

---

## 9. Enclosure Auditing via Image Analysis

### 9.1 Purpose

Automate periodic visual inspection of enclosure conditions — substrate depth, plant health, water clarity, cleanliness, enrichment presence, and safety compliance — using photos taken by keepers during routine rounds or by fixed cameras.

### 9.2 Audit Checklist (Species-Group Dependent)

| Check | Applicable Enclosure Types | Scoring |
|---|---|---|
| Substrate depth adequate | Terrestrial, semi-aquatic | Pass / Marginal / Fail |
| Live plants health | Tropical vivariums, planted tanks | Healthy / Declining / Dead |
| Water clarity | All aquatic | Clear / Hazy / Opaque |
| Algae level | Aquatic, semi-aquatic | None / Normal / Excessive |
| Fecal accumulation | Terrestrial, aviary | Clean / Moderate / Needs cleaning |
| Enrichment items present | All (species-dependent list) | Present / Missing / Damaged |
| Basking spot positioning | Reptile, amphibian | Correct zone / Misaligned |
| Structural damage | All | None / Minor / Safety concern |
| Escape risk indicators | Arboreal, cephalopod, primate | None / Potential / Active risk |

### 9.3 Output Schema

The `ai_assessments.detail` JSONB for `feature = 'enclosure_auditor'`:

```json
{
  "image_ref": "s3://exopet-media/audits/enc-uuid/20260310.jpg",
  "checklist_results": [
    {"check": "water_clarity", "score": "hazy", "confidence": 0.88, "note": "Visible particulate matter; may indicate overfeeding or filter issue"},
    {"check": "algae_level", "score": "excessive", "confidence": 0.91, "note": "Green film on back glass and rocks"},
    {"check": "enrichment_present", "score": "present", "confidence": 0.95, "items_detected": ["cave hide", "driftwood", "live plants"]},
    {"check": "structural_damage", "score": "none", "confidence": 0.97}
  ],
  "overall_score": "needs_attention",
  "priority_actions": [
    "Investigate water clarity — check filter flow rate and recent feeding amounts",
    "Schedule algae cleaning or reduce photoperiod by 1h"
  ]
}
```

### 9.4 Trend Tracking

Sequential audit images for the same enclosure are compared over time. The system detects gradual degradation (plants slowly dying, substrate compacting, algae encroaching) that individual snapshots might not flag but multi-week trends reveal. This generates trend reports viewable by curators and facility managers.

---

## 10. Water Chemistry Forecasting

### 10.1 Purpose

Predict future water chemistry values based on current trends, bioload, feeding schedule, and filtration capacity. Shift keepers from reactive water changes to proactive, scheduled interventions.

### 10.2 Input Features

The forecasting model ingests the following per enclosure:

| Feature | Source |
|---|---|
| Historical chemistry readings | `sensor_readings` (nitrate, nitrite, ammonia, pH, alkalinity, calcium, phosphate) |
| Bioload | `enclosure_animals` count + `species.care_profile` (size, metabolic rate) |
| Feeding events | `care_notes` with `note_type = 'feeding'` or `schedules` with feeder commands |
| Water change history | `care_notes` with `note_type = 'maintenance'` mentioning water changes |
| Filtration capacity | `devices` metadata (filter type, media age, flow rate) for relevant devices |
| Dosing history | `actuator_commands` for `dosing_pump` devices |
| Temperature | `sensor_readings` (metabolic rate and bacterial activity are temperature-dependent) |

### 10.3 Output Schema

The `chemistry_forecasts` table as defined in §2. Visual output in the app shows a time-series chart with the historical trend line, the forecast cone (with confidence bands), and horizontal lines marking the safe range from `setpoint_profiles`. The predicted threshold breach time is highlighted with a marker and the recommended intervention is displayed below the chart.

### 10.4 Example Narrative Output

> "Nitrate is currently at 22 ppm and rising at ~4 ppm/day based on current bioload and feeding schedule. At this rate, it will reach your 40 ppm threshold by Friday evening. A 25% water change by Thursday would reset to ~16 ppm and buy approximately 6 more days. Alternatively, increasing your nitrate reactor dosing pump from 2.0 mL/min to 2.8 mL/min would stabilize nitrate at current levels."

### 10.5 Calibration and Drift Handling

If the model's predictions consistently overshoot or undershoot actual readings (tracked by comparing `chemistry_forecasts.forecast_values` against subsequent `sensor_readings`), the system flags the model as drifting and triggers recalibration. Common causes include bioload changes (animal added or removed), filter media replacement, or seasonal temperature shifts.

---

## 11. Infrastructure & Model Operations

### 11.1 Model Registry

All AI models used by ExoPet are tracked in a model registry (external to the Postgres schema — e.g. MLflow, Weights & Biases, or a custom registry). The `model_id` field present on all AI output tables references this registry and encodes the model name, version, and training run ID.

### 11.2 Tiered Compute Architecture

| Tier | Inference Location | Hardware | Use Cases |
|---|---|---|---|
| 1. Home | On-device (Pi/edge) | CPU, Coral USB TPU | Lightweight anomaly detection, activity level monitoring |
| 2. Small facility | Edge gateway | Jetson Nano/Orin, Intel NUC | Visual diagnosis, behavior monitoring |
| 3. Zoo exhibit | Local edge server | GPU server in building MDF | Real-time multi-camera behavior analysis, NLC |
| 4–5. Campus/Safari | Hybrid edge + cloud | Edge for latency-sensitive; cloud for batch/training | All features; cloud handles training, retraining, and heavy batch jobs |

### 11.3 Latency Requirements

| Feature | Latency Target | Justification |
|---|---|---|
| Visual diagnosis (on-demand) | < 5 seconds | User is waiting, looking at their phone |
| Behavioral anomaly | < 5 minutes | Not time-critical; batched inference is fine |
| Telemetry anomaly | < 60 seconds | Needs to catch fast-moving events (heater stuck on) |
| Shift handoff brief | Generated 30 min before shift | Batch job, no real-time constraint |
| NLC command parsing | < 3 seconds | Conversational responsiveness |
| Chemistry forecast | Hourly batch refresh | Slow-moving trends, no real-time need |
| Enclosure audit | < 30 seconds per image | Keeper submits during rounds, reviews batch results after |

### 11.4 Feedback Loop and Active Learning

Every `ai_assessments` record that gets `confirmed` or `rejected` by a human becomes a labeled training example. This creates a continuous feedback loop. Facilities with high assessment volumes (zoos) become the primary source of training signal, which improves model accuracy for smaller hobbyist deployments. A quarterly retraining cadence is the target, with emergency retraining if assessment rejection rates exceed 30% in any feature category.

### 11.5 Data Privacy and Anonymization

Training data contributed by one facility must be anonymized before being used to improve models for others. Specifically: facility names, keeper names, GPS coordinates, and any identifiable details in care notes are stripped. Animal names are replaced with anonymized IDs. Images are checked for incidental human faces and blurred if found.

---

## 12. Safety, Ethics & Governance

### 12.1 The AI Suggests, Humans Confirm Principle

This principle is not a guideline — it is an architectural constraint. There is no code path where an AI output directly modifies an animal's environment without a human approval step. The enforcement mechanism is structural: AI writes to `ai_assessments` and `ai_command_proposals`, never to `actuator_commands` or `schedules` directly. The only bridge is the approval workflow, which requires a user with appropriate permissions.

**Exception — safety kill-switches:** Traditional automation rules in the core schema (non-AI) can and should act autonomously for immediate safety. A heater exceeding 35°C should be shut off by the `automation_rules` engine instantly, without waiting for AI or human review. The AI layer is additive intelligence, not a replacement for deterministic safety logic.

### 12.2 Liability and Disclaimers

All AI outputs in the user interface carry clear framing:

- Visual diagnoses: "This is an AI-assisted assessment, not a veterinary diagnosis. Consult a qualified veterinarian for treatment decisions."
- Care recommendations: "Based on published care guidelines and historical data. Individual animal needs may vary."
- Command proposals: "Review all proposed actions before confirming. You are responsible for commands issued under your account."

### 12.3 Regulatory Considerations

For AZA-accredited facilities, all AI-generated health assessments that are `confirmed` by a vet become part of the official medical record and must meet record-keeping requirements under the Animal Welfare Act. The `ai_assessments` table's `reviewed_by`, `reviewed_at`, and `reviewer_notes` fields provide the required chain of responsibility.

For CITES-listed species, any AI-generated breeding recommendations should be cross-referenced with Species Survival Plan (SSP) coordinators. The system should flag when a breeding recommendation might conflict with genetic management goals.

### 12.4 Model Transparency

Each AI output links to its `model_id` and `model_input_ref`, enabling full reproducibility. If a vet questions a diagnosis, they can retrieve the exact image, the exact model version, and understand the pipeline that produced the output. No black boxes.

### 12.5 Failure Modes and Graceful Degradation

| Failure | Behavior |
|---|---|
| AI inference service is down | All core automation (PLC, rules engine, schedules) continues unaffected. AI features show "temporarily unavailable" in the UI. No alerts are missed — threshold-based alerts are independent. |
| Model produces nonsensical output | Confidence score will typically be low, keeping it below display threshold. If confidence is falsely high, human review catches it before action. |
| Camera feed lost | Behavioral monitoring pauses for that enclosure. System generates an `alert` for the camera device going offline. |
| Training data poisoned | Quarterly model audits compare performance against a held-out validation set. Sudden accuracy drops trigger investigation before redeployed models reach production. |
| Network partition (edge loses cloud) | Edge devices continue local inference with cached models. Results queue locally and sync when connectivity is restored. |

### 12.6 Ethical Commitments

- **No feature will increase animal stress.** Camera placements and lighting required for AI vision must be evaluated for their impact on the animals. Infrared cameras are preferred for nocturnal species.
- **AI will never recommend euthanasia.** End-of-life decisions are exclusively human, made by qualified veterinarians.
- **AI bias monitoring.** Model performance is tracked per species group. If a model performs poorly for underrepresented species (e.g. fewer training images for rare species), this is flagged and those species are deprioritized for AI features until accuracy improves rather than served unreliable results.
- **Open data contributions.** ExoPet commits to publishing anonymized aggregate datasets that advance veterinary AI research, with facility consent.
