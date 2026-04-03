# Knowledge Graph Schema

## Overview

This knowledge graph models the differential diagnosis process using a structured, book-grounded approach.

It is designed around three layers:

- **Clinical Presentation (entry point)**
- **Categories + Features (reasoning layer)**
- **Diagnosis (output layer)**

### Nodes:

Source
ClinicalPresentation
Category
Diagnosis
Feature

### Relationships:

(:Source)-[:HAS_EXCERPT]->(:Source)
(:Source)-[:DOCUMENTS]->(:ClinicalPresentation)
(:ClinicalPresentation)-[:HAS_CATEGORY]->(:Category)
(:Category)-[:INCLUDES_DIAGNOSIS]->(:Diagnosis)
(:ClinicalPresentation)-[:HAS_FEATURE]->(:Feature)
(:Feature)-[:SUGGESTS]->(:Diagnosis)

---

## Node Types

### 1. `:Source`

Represents:
- the full book
- or a specific section (excerpt)

#### Attributes

- `key: string` (UNIQUE)
- `title: string`
- `source_type: string` → `"book"` | `"excerpt"`
- `edition: string`
- `page_start: integer` *(optional, excerpts only)*
- `page_end: integer` *(optional, excerpts only)*

#### Examples

- `source:pocketbook_ddx_5e_extract`
- `source:pocketbook_ddx_5e_abdominal_pain`

---

### 2. `:ClinicalPresentation`

Represents:
- a top-level clinical complaint (entry point)

#### Attributes

- `key: string` (UNIQUE)
- `name: string` *(exact book wording)*
- `normalized_name: string` *(lowercase for matching)*

#### Examples

- `cp:abdominal_pain`
- `cp:chest_pain`
- `cp:dyspnoea`

---

### 3. `:Category`

Represents:
- diagnostic groupings within a clinical presentation

#### Attributes

- `key: string` (UNIQUE)
- `name: string` *(exact book wording)*
- `normalized_name: string`

#### Notes

- Categories are **scoped to a ClinicalPresentation**
- Same name can exist in different contexts

#### Examples

- `cat:abdominal_pain_gynaecological`
- `cat:backache_gynaecological`
- `cat:chest_pain_cardiovascular`

---

### 4. `:Feature`

Represents:
- clinical clues extracted from descriptive text

#### Attributes

- `key: string` (UNIQUE)
- `name: string` *(exact sentence or phrase from book)*
- `normalized_name: string`
- `feature_type: string`

#### Feature Types

- `history`
- `past_history`
- `pain`
- `associated_symptom`
- `precipitating_factor`
- `relieving_factor`
- `character`
- `site`
- `onset`
- `age`
- `trauma`
- `associated_factor`

#### Examples

- `feature:abdominal_pain_previous_surgery`
- `feature:chest_pain_tight_and_crushing`
- `feature:dyspnoea_wheezing`

---

### 5. `:Diagnosis`

Represents:
- final differential diagnoses
- shared across all clinical presentations

#### Attributes

- `key: string` (UNIQUE, GLOBAL)
- `name: string` *(exact book wording)*
- `normalized_name: string`

#### Notes

- Diagnoses are **globally shared nodes**
- Same diagnosis reused across multiple presentations

#### Examples

- `diagnosis:appendicitis`
- `diagnosis:myocardial_infarction`
- `diagnosis:ectopic_pregnancy`

