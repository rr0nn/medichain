// =====================================================
// Includes 6 clinical presentations
// 1. Abdominal pain
// 2. Abdominal swellings
// 3. Backache
// 4. Chest pain
// 5. Headache
// 6. Dyspnoea
//
// Schema:
// (:Source)-[:HAS_EXCERPT]->(:Source)
// (:Source)-[:DOCUMENTS]->(:ClinicalPresentation)
// (:ClinicalPresentation)-[:HAS_CATEGORY]->(:Category)
// (:ClinicalPresentation)-[:HAS_FEATURE]->(:Feature)
// (:Category)-[:INCLUDES_DIAGNOSIS]->(:Diagnosis)
// (:Feature)-[:SUGGESTS]->(:Diagnosis)
//
// =====================================================


// =====================================================
// RESET
// =====================================================

DROP CONSTRAINT source_key IF EXISTS;
DROP CONSTRAINT cp_key IF EXISTS;
DROP CONSTRAINT category_key IF EXISTS;
DROP CONSTRAINT diagnosis_key IF EXISTS;
DROP CONSTRAINT feature_key IF EXISTS;

MATCH (n)
DETACH DELETE n;


// =====================================================
// CONSTRAINTS
// =====================================================

CREATE CONSTRAINT source_key IF NOT EXISTS
FOR (n:Source) REQUIRE n.key IS UNIQUE;

CREATE CONSTRAINT cp_key IF NOT EXISTS
FOR (n:ClinicalPresentation) REQUIRE n.key IS UNIQUE;

CREATE CONSTRAINT category_key IF NOT EXISTS
FOR (n:Category) REQUIRE n.key IS UNIQUE;

CREATE CONSTRAINT diagnosis_key IF NOT EXISTS
FOR (n:Diagnosis) REQUIRE n.key IS UNIQUE;

CREATE CONSTRAINT feature_key IF NOT EXISTS
FOR (n:Feature) REQUIRE n.key IS UNIQUE;


// =====================================================
// SOURCE BOOK
// =====================================================

MERGE (book:Source {key:"source:pocketbook_ddx_5e"})
SET book.title = "Pocketbook of Differential Diagnosis",
    book.source_type = "book",
    book.edition = "5";


// =====================================================
// EXCERPTS + CLINICAL PRESENTATIONS
// =====================================================

UNWIND [
  {
    excerpt_key: "source:pocketbook_ddx_5e_abdominal_pain",
    excerpt_title: "Abdominal pain",
    page_start: 2,
    page_end: 8,
    cp_key: "cp:abdominal_pain",
    cp_name: "Abdominal pain"
  },
  {
    excerpt_key: "source:pocketbook_ddx_5e_abdominal_swellings",
    excerpt_title: "Abdominal swellings",
    page_start: 9,
    page_end: 17,
    cp_key: "cp:abdominal_swellings",
    cp_name: "Abdominal swellings"
  },
  {
    excerpt_key: "source:pocketbook_ddx_5e_backache",
    excerpt_title: "Backache",
    page_start: 36,
    page_end: 43,
    cp_key: "cp:backache",
    cp_name: "Backache"
  },
  {
    excerpt_key: "source:pocketbook_ddx_5e_chest_pain",
    excerpt_title: "Chest pain",
    page_start: 51,
    page_end: 55,
    cp_key: "cp:chest_pain",
    cp_name: "Chest pain"
  },
  {
    excerpt_key: "source:pocketbook_ddx_5e_dyspnoea",
    excerpt_title: "Dyspnoea",
    page_start: 106,
    page_end: 111,
    cp_key: "cp:dyspnoea",
    cp_name: "Dyspnoea"
  },
  {
    excerpt_key: "source:pocketbook_ddx_5e_headache",
    excerpt_title: "Headache",
    page_start: 207,
    page_end: 211,
    cp_key: "cp:headache",
    cp_name: "Headache"
  }
] AS row
MERGE (ex:Source {key: row.excerpt_key})
SET ex.title = row.excerpt_title,
    ex.source_type = "excerpt",
    ex.page_start = row.page_start,
    ex.page_end = row.page_end,
    ex.edition = "5"
MERGE (cp:ClinicalPresentation {key: row.cp_key})
SET cp.name = row.cp_name,
    cp.normalized_name = toLower(row.cp_name)
MERGE (ex)-[:DOCUMENTS]->(cp);

MATCH (book:Source)
WHERE book.source_type = "book"
MATCH (ex:Source)
WHERE ex.source_type = "excerpt"
MERGE (book)-[:HAS_EXCERPT]->(ex);

// =====================================================
// CATEGORIES
// =====================================================

UNWIND [
  // Abdominal pain
  {key:"cat:abdominal_pain_gastroduodenal", cp:"cp:abdominal_pain", name:"Gastroduodenal"},
  {key:"cat:abdominal_pain_intestinal", cp:"cp:abdominal_pain", name:"Intestinal"},
  {key:"cat:abdominal_pain_hepatobiliary", cp:"cp:abdominal_pain", name:"Hepatobiliary"},
  {key:"cat:abdominal_pain_pancreatic", cp:"cp:abdominal_pain", name:"Pancreatic"},
  {key:"cat:abdominal_pain_splenic", cp:"cp:abdominal_pain", name:"Splenic"},
  {key:"cat:abdominal_pain_urinary_tract", cp:"cp:abdominal_pain", name:"Urinary tract"},
  {key:"cat:abdominal_pain_gynaecological", cp:"cp:abdominal_pain", name:"Gynaecological"},
  {key:"cat:abdominal_pain_vascular", cp:"cp:abdominal_pain", name:"Vascular"},
  {key:"cat:abdominal_pain_abdominal_wall", cp:"cp:abdominal_pain", name:"Abdominal wall"},
  {key:"cat:abdominal_pain_referred_pain", cp:"cp:abdominal_pain", name:"Referred pain"},
  {key:"cat:abdominal_pain_medical_causes", cp:"cp:abdominal_pain", name:"‘MEDICAL’ CAUSES"},

  // Abdominal swellings
  {key:"cat:abdominal_swellings_abdominal_wall", cp:"cp:abdominal_swellings", name:"Abdominal wall"},
  {key:"cat:abdominal_swellings_liver", cp:"cp:abdominal_swellings", name:"Liver"},
  {key:"cat:abdominal_swellings_gall_bladder", cp:"cp:abdominal_swellings", name:"Gall bladder"},
  {key:"cat:abdominal_swellings_stomach", cp:"cp:abdominal_swellings", name:"Stomach"},
  {key:"cat:abdominal_swellings_pancreas", cp:"cp:abdominal_swellings", name:"Pancreas"},
  {key:"cat:abdominal_swellings_kidney", cp:"cp:abdominal_swellings", name:"Kidney"},
  {key:"cat:abdominal_swellings_spleen", cp:"cp:abdominal_swellings", name:"Spleen"},
  {key:"cat:abdominal_swellings_colon", cp:"cp:abdominal_swellings", name:"Colon"},
  {key:"cat:abdominal_swellings_small_bowel", cp:"cp:abdominal_swellings", name:"Small bowel"},
  {key:"cat:abdominal_swellings_bladder", cp:"cp:abdominal_swellings", name:"Bladder"},
  {key:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", cp:"cp:abdominal_swellings", name:"Ovary/uterus/fallopian tube"},
  {key:"cat:abdominal_swellings_retroperitoneum", cp:"cp:abdominal_swellings", name:"Retroperitoneum"},
  {key:"cat:abdominal_swellings_omentum", cp:"cp:abdominal_swellings", name:"Omentum"},

  // Backache
  {key:"cat:backache_congenital", cp:"cp:backache", name:"CONGENITAL"},
  {key:"cat:backache_traumatic", cp:"cp:backache", name:"TRAUMATIC"},
  {key:"cat:backache_infective", cp:"cp:backache", name:"INFECTIVE"},
  {key:"cat:backache_inflammatory", cp:"cp:backache", name:"INFLAMMATORY"},
  {key:"cat:backache_neoplastic", cp:"cp:backache", name:"NEOPLASTIC"},
  {key:"cat:backache_degenerative", cp:"cp:backache", name:"DEGENERATIVE"},
  {key:"cat:backache_metabolic", cp:"cp:backache", name:"METABOLIC"},
  {key:"cat:backache_endocrine", cp:"cp:backache", name:"ENDOCRINE"},
  {key:"cat:backache_idiopathic", cp:"cp:backache", name:"IDIOPATHIC"},
  {key:"cat:backache_psychogenic", cp:"cp:backache", name:"PSYCHOGENIC"},
  {key:"cat:backache_visceral", cp:"cp:backache", name:"VISCERAL"},
  {key:"cat:backache_vascular", cp:"cp:backache", name:"VASCULAR"},
  {key:"cat:backache_renal", cp:"cp:backache", name:"RENAL"},
  {key:"cat:backache_gynaecological", cp:"cp:backache", name:"GYNAECOLOGICAL"},

  // Chest pain
  {key:"cat:chest_pain_cardiovascular", cp:"cp:chest_pain", name:"CARDIOVASCULAR"},
  {key:"cat:chest_pain_gastrointestinal", cp:"cp:chest_pain", name:"GASTROINTESTINAL"},
  {key:"cat:chest_pain_pulmonary", cp:"cp:chest_pain", name:"PULMONARY"},
  {key:"cat:chest_pain_musculoskeletal", cp:"cp:chest_pain", name:"MUSCULOSKELETAL"},
  {key:"cat:chest_pain_miscellaneous", cp:"cp:chest_pain", name:"MISCELLANEOUS"},

  // Dyspnoea
  {key:"cat:dyspnoea_sudden", cp:"cp:dyspnoea", name:"SUDDEN (SECONDS TO MINUTES)"},
  {key:"cat:dyspnoea_acute", cp:"cp:dyspnoea", name:"ACUTE (HOURS TO DAYS)"},
  {key:"cat:dyspnoea_chronic", cp:"cp:dyspnoea", name:"CHRONIC (MONTHS TO YEARS)"},

  // Headache
  {key:"cat:headache_acute_headache", cp:"cp:headache", name:"ACUTE HEADACHE"},
  {key:"cat:headache_chronic_or_recurrent_headache", cp:"cp:headache", name:"CHRONIC OR RECURRENT HEADACHE"}
] AS row
MERGE (c:Category {key: row.key})
SET c.name = row.name,
    c.normalized_name = toLower(row.name)
WITH row
MATCH (cp:ClinicalPresentation {key: row.cp})
MATCH (c:Category {key: row.key})
MERGE (cp)-[:HAS_CATEGORY]->(c);


// =====================================================
// DIAGNOSES
// Shared nodes across presentations
// Exact book wording preserved in .name
// =====================================================

UNWIND [
  {key:"diagnosis:gastritis", name:"Gastritis"},
  {key:"diagnosis:gastric_peptic_ulcer", name:"Gastric/peptic ulcer"},
  {key:"diagnosis:oesophageal_gastric_malignancy", name:"Oesophageal/gastric malignancy"},
  {key:"diagnosis:gastric_duodenal_perforation", name:"Gastric/duodenal perforation"},
  {key:"diagnosis:gastric_volvulus", name:"Gastric volvulus"},

  {key:"diagnosis:constipation", name:"Constipation"},
  {key:"diagnosis:appendicitis", name:"Appendicitis"},
  {key:"diagnosis:obstruction", name:"Obstruction"},
  {key:"diagnosis:diverticulitis", name:"Diverticulitis"},
  {key:"diagnosis:gastroenteritis", name:"Gastroenteritis"},
  {key:"diagnosis:tuberculosis", name:"TB"},
  {key:"diagnosis:strangulated_hernia", name:"Strangulated hernia"},
  {key:"diagnosis:inflammatory_bowel_disease", name:"Inflammatory bowel disease"},
  {key:"diagnosis:intussusception", name:"Intussusception"},
  {key:"diagnosis:volvulus", name:"Volvulus"},
  {key:"diagnosis:mesenteric_adenitis", name:"Mesenteric adenitis"},
  {key:"diagnosis:merkels_diverticular", name:"Merkel’s diverticular"},

  {key:"diagnosis:cholecystitis", name:"Cholecystitis"},
  {key:"diagnosis:biliary_colic", name:"Biliary colic"},
  {key:"diagnosis:cholangitis", name:"Cholangitis"},
  {key:"diagnosis:hepatitis", name:"Hepatitis"},

  {key:"diagnosis:pancreatitis", name:"Pancreatitis"},
  {key:"diagnosis:pancreatic_malignancy", name:"Malignancy"},
  {key:"diagnosis:pancreatic_pseudocyst", name:"Pancreatic pseudocyst"},

  {key:"diagnosis:splenic_infarction", name:"Infarction"},
  {key:"diagnosis:spontaneous_rupture", name:"Spontaneous rupture"},

  {key:"diagnosis:acute_retention_of_urine", name:"Acute retention of urine"},
  {key:"diagnosis:urinary_tract_infection_acute_pyelonephritis", name:"Urinary tract infection/acute pyelonephritis"},
  {key:"diagnosis:ureteric_colic", name:"Ureteric colic"},
  {key:"diagnosis:cystitis", name:"Cystitis"},
  {key:"diagnosis:hydronephrosis", name:"Hydronephrosis"},
  {key:"diagnosis:urinary_tumour", name:"Tumour"},
  {key:"diagnosis:pyonephrosis", name:"Pyonephrosis"},
  {key:"diagnosis:polycystic_kidney", name:"Polycystic kidney"},

  {key:"diagnosis:ectopic_pregnancy", name:"Ectopic pregnancy"},
  {key:"diagnosis:torsion_of_ovarian_cyst", name:"Torsion of ovarian cyst"},
  {key:"diagnosis:ovarian_cyst", name:"Ovarian cyst"},
  {key:"diagnosis:severe_dysmenorrhoea", name:"Severe dysmenorrhoea"},
  {key:"diagnosis:mittelschmerz", name:"Mittelschmerz"},
  {key:"diagnosis:endometriosis", name:"Endometriosis"},
  {key:"diagnosis:uterine_fibroid", name:"Uterine fibroid"},
  {key:"diagnosis:salpingitis", name:"Salpingitis"},

  {key:"diagnosis:abdominal_aortic_aneurysm", name:"Abdominal aortic aneurysm"},
  {key:"diagnosis:mesenteric_embolus", name:"Mesenteric embolus"},
  {key:"diagnosis:ischaemic_colitis", name:"Ischaemic colitis"},
  {key:"diagnosis:acute_aortic_dissection_type_b", name:"Acute aortic dissection (i.e. type B)"},
  {key:"diagnosis:mesenteric_angina_claudication", name:"Mesenteric angina (claudication)"},
  {key:"diagnosis:mesenteric_venous_thrombosis", name:"Mesenteric venous thrombosis"},

  {key:"diagnosis:cellulitis", name:"Cellulitis"},
  {key:"diagnosis:rectus_sheath_haematoma", name:"Rectus sheath haematoma"},

  {key:"diagnosis:myocardial_infarction", name:"Myocardial infarction"},
  {key:"diagnosis:lobar_pneumonia", name:"Lobar pneumonia"},
  {key:"diagnosis:testicular_torsion", name:"Testicular torsion"},
  {key:"diagnosis:pleurisy", name:"Pleurisy"},
  {key:"diagnosis:pericarditis", name:"Pericarditis"},
  {key:"diagnosis:herpes_zoster", name:"Herpes zoster"},
  {key:"diagnosis:thoracic_spine_disease_disc_tumour", name:"Thoracic spine disease, e.g. disc, tumour"},

  {key:"diagnosis:diabetic_ketoacidosis", name:"Diabetic ketoacidosis"},
  {key:"diagnosis:hypercalcaemia", name:"Hypercalcaemia"},
  {key:"diagnosis:uraemia", name:"Uraemia"},
  {key:"diagnosis:sickle_cell_disease", name:"Sickle cell disease"},
  {key:"diagnosis:addisons_disease", name:"Addison’s disease"},
  {key:"diagnosis:acute_intermittent_porphyria", name:"Acute intermittent porphyria"},
  {key:"diagnosis:henoch_schonlein_purpura", name:"Henoch–Schönlein purpura"},
  {key:"diagnosis:tabes_dorsalis", name:"Tabes dorsalis"},

  {key:"diagnosis:lipoma", name:"Lipoma"},
  {key:"diagnosis:abdominal_wall_hernia", name:"Hernia (i.e. paraumbilical, umbilical, spigelian hernia)"},
  {key:"diagnosis:metastatic_deposits_sister_joseph_mary_nodule", name:"Metastatic deposits (i.e. Sister Joseph Mary nodule)"},
  {key:"diagnosis:urachal_cyst_other", name:"Other (i.e. urachal cyst)"},
  {key:"diagnosis:hepatomegaly_cross_reference", name:"See hepatomegaly, p. 215."},

  {key:"diagnosis:carcinoma_of_head_of_pancreas_secondary_gall_bladder", name:"Secondary to carcinoma of the head of the pancreas"},
  {key:"diagnosis:mucocele", name:"Mucocele"},
  {key:"diagnosis:empyema", name:"Empyema"},
  {key:"diagnosis:gall_bladder_carcinoma", name:"Carcinoma"},
  {key:"diagnosis:stomach_carcinoma", name:"Carcinoma"},
  {key:"diagnosis:gastric_distension", name:"Gastric distension (acute dilatation, pyloric stenosis)"},
  {key:"diagnosis:acute_gastric_volvulus", name:"Acute gastric volvulus"},
  {key:"diagnosis:pancreas_carcinoma", name:"Carcinoma"},
  {key:"diagnosis:pseudocyst", name:"Pseudocyst"},
  {key:"diagnosis:solitary_cyst", name:"Solitary cyst"},
  {key:"diagnosis:kidney_carcinoma", name:"Carcinoma"},
  {key:"diagnosis:pyonephrosis_perinephric_abscess", name:"Pyonephrosis/perinephric abscess"},
  {key:"diagnosis:kidney_tuberculosis", name:"Tuberculosis (TB)"},
  {key:"diagnosis:wilms_tumour_nephroblastoma", name:"Wilms’ tumour (nephroblastoma)"},
  {key:"diagnosis:splenomegaly_cross_reference", name:"See splenomegaly, p. 393."},
  {key:"diagnosis:appendix_abscess", name:"Appendix abscess"},
  {key:"diagnosis:caecal_mass_carcinoma", name:"Carcinoma (i.e. caecal mass)"},
  {key:"diagnosis:faeces", name:"Faeces"},
  {key:"diagnosis:diverticular_mass", name:"Diverticular mass"},
  {key:"diagnosis:volvulus_caecal_sigmoid", name:"Volvulus (i.e. caecal, sigmoid)"},
  {key:"diagnosis:crohns_disease", name:"Crohn’s disease"},
  {key:"diagnosis:small_bowel_carcinoma", name:"Carcinoma"},
  {key:"diagnosis:mesenteric_cysts", name:"Mesenteric cysts"},
  {key:"diagnosis:lymphoma", name:"Lymphoma"},
  {key:"diagnosis:ileo_caecal_tuberculosis", name:"Ileo-caecal TB"},
  {key:"diagnosis:acute_retention", name:"Acute retention"},
  {key:"diagnosis:chronic_retention", name:"Chronic retention"},
  {key:"diagnosis:bladder_carcinoma", name:"Carcinoma"},
  {key:"diagnosis:ovarian_neoplasm", name:"Ovarian neoplasm"},
  {key:"diagnosis:pregnancy", name:"Pregnancy"},
  {key:"diagnosis:tubo_ovarian_abscess", name:"Tubo-ovarian abscess"},
  {key:"diagnosis:uterine_carcinoma", name:"Uterine carcinoma"},
  {key:"diagnosis:arterial_aneurysm_aortic_iliac", name:"Arterial aneurysm (i.e. aortic, iliac)"},
  {key:"diagnosis:retroperitoneal_lymphadenopathy", name:"Lymphadenopathy (lymphoma, secondaries from testicular carcinoma)"},
  {key:"diagnosis:iliac_bone_neoplasm", name:"Neoplasm of the iliac bone, e.g. osteogenic sarcoma, Ewing’s tumour"},
  {key:"diagnosis:omental_secondaries", name:"Omental secondaries, e.g. stomach and ovary"},

  {key:"diagnosis:kyphoscoliosis", name:"Kyphoscoliosis"},
  {key:"diagnosis:spina_bifida", name:"Spina bifida"},
  {key:"diagnosis:spondylolisthesis", name:"Spondylolisthesis"},
  {key:"diagnosis:vertebral_fractures", name:"Vertebral fractures"},
  {key:"diagnosis:ligamentous_injury", name:"Ligamentous injury"},
  {key:"diagnosis:joint_strain", name:"Joint strain"},
  {key:"diagnosis:muscle_tears", name:"Muscle tears"},
  {key:"diagnosis:osteomyelitis_acute_and_chronic", name:"Osteomyelitis – acute and chronic"},
  {key:"diagnosis:discitis", name:"Discitis"},
  {key:"diagnosis:ankylosing_spondylitis", name:"Ankylosing spondylitis (Fig. 6)"},
  {key:"diagnosis:rheumatology_disorders", name:"Rheumatology disorders"},
  {key:"diagnosis:metastases_multiple_myeloma", name:"Metastases – multiple myeloma"},
  {key:"diagnosis:primary_sarcomas", name:"Primary sarcomas"},
  {key:"diagnosis:osteoarthritis", name:"Osteoarthritis"},
  {key:"diagnosis:intervertebral_disc_lesions", name:"Intervertebral disc lesions"},
  {key:"diagnosis:osteoporosis_associated_vertebral_fractures", name:"Osteoporosis (associated vertebral fractures)"},
  {key:"diagnosis:osteomalacia", name:"Osteomalacia"},
  {key:"diagnosis:cushings_disease_osteoporosis", name:"Cushing’s disease (osteoporosis)"},
  {key:"diagnosis:pagets_disease", name:"Paget’s disease"},
  {key:"diagnosis:scheuermanns_disease", name:"Scheuermann’s disease"},
  {key:"diagnosis:psychosomatic_backache", name:"Psychosomatic backache"},
  {key:"diagnosis:penetrating_peptic_ulcer", name:"Penetrating peptic ulcer"},
  {key:"diagnosis:carcinoma_of_the_pancreas", name:"Carcinoma of the pancreas"},
  {key:"diagnosis:carcinoma_of_the_rectum", name:"Carcinoma of the rectum"},
  {key:"diagnosis:aortic_aneurysm", name:"Aortic aneurysm"},
  {key:"diagnosis:acute_aortic_dissection", name:"Acute aortic dissection"},
  {key:"diagnosis:renal_calculus", name:"Renal calculus"},
  {key:"diagnosis:carcinoma_of_the_kidney", name:"Carcinoma of the kidney"},
  {key:"diagnosis:renal_inflammatory_disease", name:"Inflammatory disease"},
  {key:"diagnosis:pelvic_inflammatory_disease", name:"Pelvic inflammatory disease"},
  {key:"diagnosis:uterine_tumours", name:"Uterine tumours"},

  {key:"diagnosis:angina", name:"Angina"},
  {key:"diagnosis:pericarditis_myocarditis", name:"Pericarditis/myocarditis"},
  {key:"diagnosis:gastro_oesophageal_reflux_disease", name:"Gastro-oesophageal reflux disease"},
  {key:"diagnosis:peptic_ulcer_disease", name:"Peptic ulcer disease"},
  {key:"diagnosis:oesophageal_spasm", name:"Oesophageal spasm"},
  {key:"diagnosis:pneumonia", name:"Pneumonia"},
  {key:"diagnosis:pneumothorax", name:"Pneumothorax"},
  {key:"diagnosis:pulmonary_embolism", name:"Pulmonary embolism"},
  {key:"diagnosis:chest_wall_trauma", name:"Chest wall trauma"},
  {key:"diagnosis:costochondritis", name:"Costochondritis"},
  {key:"diagnosis:secondary_tumours_of_the_rib", name:"Secondary tumours of the rib"},
  {key:"diagnosis:fibromyalgia", name:"Fibromyalgia"},
  {key:"diagnosis:depression", name:"Depression"},

  {key:"diagnosis:dyspnoea_pneumothorax", name:"Pneumothorax (Fig. 15)"},
  {key:"diagnosis:chest_trauma", name:"Chest trauma"},
  {key:"diagnosis:aspiration", name:"Aspiration"},
  {key:"diagnosis:pulmonary_oedema", name:"Pulmonary oedema"},
  {key:"diagnosis:anaphylaxis", name:"Anaphylaxis"},
  {key:"diagnosis:asthma", name:"Asthma"},
  {key:"diagnosis:respiratory_tract_infection", name:"Respiratory tract infection"},
  {key:"diagnosis:pleural_effusion", name:"Pleural effusion"},
  {key:"diagnosis:lung_tumours", name:"Lung tumours"},
  {key:"diagnosis:metabolic_acidosis", name:"Metabolic acidosis"},
  {key:"diagnosis:copd", name:"Chronic airflow limitation (COPD)"},
  {key:"diagnosis:anaemia", name:"Anaemia"},
  {key:"diagnosis:arrhythmia", name:"Arrhythmia"},
  {key:"diagnosis:valvular_heart_disease", name:"Valvular heart disease"},
  {key:"diagnosis:cardiac_failure", name:"Cardiac failure"},
  {key:"diagnosis:cystic_fibrosis", name:"Cystic fibrosis"},
  {key:"diagnosis:idiopathic_pulmonary_fibrosis", name:"Idiopathic pulmonary fibrosis"},
  {key:"diagnosis:chest_wall_deformities", name:"Chest wall deformities"},
  {key:"diagnosis:neuromuscular_disorders", name:"Neuromuscular disorders"},
  {key:"diagnosis:pulmonary_hypertension", name:"Pulmonary hypertension"},

  {key:"diagnosis:headache_trauma", name:"Trauma"},
  {key:"diagnosis:subarachnoid_haemorrhage", name:"Subarachnoid haemorrhage (Fig. 33)"},
  {key:"diagnosis:intracranial_haemorrhage_infarction", name:"Intracranial haemorrhage/infarction"},
  {key:"diagnosis:systemic_infection", name:"Systemic infection"},
  {key:"diagnosis:meningitis", name:"Meningitis"},
  {key:"diagnosis:acute_angle_closure_glaucoma", name:"Acute angle-closure glaucoma"},
  {key:"diagnosis:tension_headache", name:"Tension headache"},
  {key:"diagnosis:migraine", name:"Migraine (important to also consider in acute headache as may be first presentation)"},
  {key:"diagnosis:medication_overuse_headache", name:"Medication overuse headache"},
  {key:"diagnosis:cluster_headaches", name:"Cluster headaches"},
  {key:"diagnosis:drugs_substance_withdrawal_headache", name:"Drugs, e.g. glyceryl trinitrate, nifedipine, substance withdrawal (especially alcohol)"},
  {key:"diagnosis:cervical_spondylosis", name:"Cervical spondylosis"},
  {key:"diagnosis:psychological_anxiety_depression", name:"Psychological (including anxiety and depression)"},
  {key:"diagnosis:raised_intracranial_pressure", name:"Raised intracranial pressure  (other than IIH)"},
  {key:"diagnosis:tumour", name:"Tumour"},
  {key:"diagnosis:hydrocephalus", name:"Hydrocephalus"},
  {key:"diagnosis:cerebral_abscess", name:"Cerebral abscess"},
  {key:"diagnosis:idiopathic_intracranial_hypertension", name:"Idiopathic intracranial hypertension"},
  {key:"diagnosis:temporal_arteritis", name:"Temporal arteritis"},
  {key:"diagnosis:pre_eclampsia", name:"Pre-eclampsia"},
  {key:"diagnosis:pagets_disease_of_bone", name:"Paget’s disease of bone"},
  {key:"diagnosis:severe_hypertension", name:"Severe hypertension"},
  {key:"diagnosis:carbon_monoxide_poisoning", name:"Carbon monoxide poisoning"}
] AS row
MERGE (d:Diagnosis {key: row.key})
SET d.name = row.name,
    d.normalized_name = toLower(row.name);


// =====================================================
// CATEGORY -> DIAGNOSIS
// =====================================================

UNWIND [
  // Abdominal pain
  {cat:"cat:abdominal_pain_gastroduodenal", dx:"diagnosis:gastritis"},
  {cat:"cat:abdominal_pain_gastroduodenal", dx:"diagnosis:gastric_peptic_ulcer"},
  {cat:"cat:abdominal_pain_gastroduodenal", dx:"diagnosis:oesophageal_gastric_malignancy"},
  {cat:"cat:abdominal_pain_gastroduodenal", dx:"diagnosis:gastric_duodenal_perforation"},
  {cat:"cat:abdominal_pain_gastroduodenal", dx:"diagnosis:gastric_volvulus"},

  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:constipation"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:appendicitis"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:obstruction"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:diverticulitis"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:gastroenteritis"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:tuberculosis"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:strangulated_hernia"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:inflammatory_bowel_disease"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:intussusception"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:volvulus"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:mesenteric_adenitis"},
  {cat:"cat:abdominal_pain_intestinal", dx:"diagnosis:merkels_diverticular"},

  {cat:"cat:abdominal_pain_hepatobiliary", dx:"diagnosis:cholecystitis"},
  {cat:"cat:abdominal_pain_hepatobiliary", dx:"diagnosis:biliary_colic"},
  {cat:"cat:abdominal_pain_hepatobiliary", dx:"diagnosis:cholangitis"},
  {cat:"cat:abdominal_pain_hepatobiliary", dx:"diagnosis:hepatitis"},

  {cat:"cat:abdominal_pain_pancreatic", dx:"diagnosis:pancreatitis"},
  {cat:"cat:abdominal_pain_pancreatic", dx:"diagnosis:pancreatic_malignancy"},
  {cat:"cat:abdominal_pain_pancreatic", dx:"diagnosis:pancreatic_pseudocyst"},

  {cat:"cat:abdominal_pain_splenic", dx:"diagnosis:splenic_infarction"},
  {cat:"cat:abdominal_pain_splenic", dx:"diagnosis:spontaneous_rupture"},

  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:acute_retention_of_urine"},
  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:urinary_tract_infection_acute_pyelonephritis"},
  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:ureteric_colic"},
  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:cystitis"},
  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:hydronephrosis"},
  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:urinary_tumour"},
  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:pyonephrosis"},
  {cat:"cat:abdominal_pain_urinary_tract", dx:"diagnosis:polycystic_kidney"},

  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:ectopic_pregnancy"},
  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:torsion_of_ovarian_cyst"},
  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:ovarian_cyst"},
  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:severe_dysmenorrhoea"},
  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:mittelschmerz"},
  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:endometriosis"},
  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:uterine_fibroid"},
  {cat:"cat:abdominal_pain_gynaecological", dx:"diagnosis:salpingitis"},

  {cat:"cat:abdominal_pain_vascular", dx:"diagnosis:abdominal_aortic_aneurysm"},
  {cat:"cat:abdominal_pain_vascular", dx:"diagnosis:mesenteric_embolus"},
  {cat:"cat:abdominal_pain_vascular", dx:"diagnosis:ischaemic_colitis"},
  {cat:"cat:abdominal_pain_vascular", dx:"diagnosis:acute_aortic_dissection_type_b"},
  {cat:"cat:abdominal_pain_vascular", dx:"diagnosis:mesenteric_angina_claudication"},
  {cat:"cat:abdominal_pain_vascular", dx:"diagnosis:mesenteric_venous_thrombosis"},

  {cat:"cat:abdominal_pain_abdominal_wall", dx:"diagnosis:cellulitis"},
  {cat:"cat:abdominal_pain_abdominal_wall", dx:"diagnosis:strangulated_hernia"},
  {cat:"cat:abdominal_pain_abdominal_wall", dx:"diagnosis:rectus_sheath_haematoma"},

  {cat:"cat:abdominal_pain_referred_pain", dx:"diagnosis:myocardial_infarction"},
  {cat:"cat:abdominal_pain_referred_pain", dx:"diagnosis:lobar_pneumonia"},
  {cat:"cat:abdominal_pain_referred_pain", dx:"diagnosis:testicular_torsion"},
  {cat:"cat:abdominal_pain_referred_pain", dx:"diagnosis:pleurisy"},
  {cat:"cat:abdominal_pain_referred_pain", dx:"diagnosis:pericarditis"},
  {cat:"cat:abdominal_pain_referred_pain", dx:"diagnosis:herpes_zoster"},
  {cat:"cat:abdominal_pain_referred_pain", dx:"diagnosis:thoracic_spine_disease_disc_tumour"},

  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:diabetic_ketoacidosis"},
  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:hypercalcaemia"},
  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:uraemia"},
  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:sickle_cell_disease"},
  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:addisons_disease"},
  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:acute_intermittent_porphyria"},
  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:henoch_schonlein_purpura"},
  {cat:"cat:abdominal_pain_medical_causes", dx:"diagnosis:tabes_dorsalis"},

  // Abdominal swellings
  {cat:"cat:abdominal_swellings_abdominal_wall", dx:"diagnosis:lipoma"},
  {cat:"cat:abdominal_swellings_abdominal_wall", dx:"diagnosis:abdominal_wall_hernia"},
  {cat:"cat:abdominal_swellings_abdominal_wall", dx:"diagnosis:metastatic_deposits_sister_joseph_mary_nodule"},
  {cat:"cat:abdominal_swellings_abdominal_wall", dx:"diagnosis:urachal_cyst_other"},
  {cat:"cat:abdominal_swellings_liver", dx:"diagnosis:hepatomegaly_cross_reference"},
  {cat:"cat:abdominal_swellings_gall_bladder", dx:"diagnosis:carcinoma_of_head_of_pancreas_secondary_gall_bladder"},
  {cat:"cat:abdominal_swellings_gall_bladder", dx:"diagnosis:mucocele"},
  {cat:"cat:abdominal_swellings_gall_bladder", dx:"diagnosis:empyema"},
  {cat:"cat:abdominal_swellings_gall_bladder", dx:"diagnosis:gall_bladder_carcinoma"},
  {cat:"cat:abdominal_swellings_stomach", dx:"diagnosis:stomach_carcinoma"},
  {cat:"cat:abdominal_swellings_stomach", dx:"diagnosis:gastric_distension"},
  {cat:"cat:abdominal_swellings_stomach", dx:"diagnosis:acute_gastric_volvulus"},
  {cat:"cat:abdominal_swellings_pancreas", dx:"diagnosis:pancreas_carcinoma"},
  {cat:"cat:abdominal_swellings_pancreas", dx:"diagnosis:pseudocyst"},
  {cat:"cat:abdominal_swellings_kidney", dx:"diagnosis:hydronephrosis"},
  {cat:"cat:abdominal_swellings_kidney", dx:"diagnosis:solitary_cyst"},
  {cat:"cat:abdominal_swellings_kidney", dx:"diagnosis:kidney_carcinoma"},
  {cat:"cat:abdominal_swellings_kidney", dx:"diagnosis:polycystic_kidney"},
  {cat:"cat:abdominal_swellings_kidney", dx:"diagnosis:pyonephrosis_perinephric_abscess"},
  {cat:"cat:abdominal_swellings_kidney", dx:"diagnosis:kidney_tuberculosis"},
  {cat:"cat:abdominal_swellings_kidney", dx:"diagnosis:wilms_tumour_nephroblastoma"},
  {cat:"cat:abdominal_swellings_spleen", dx:"diagnosis:splenomegaly_cross_reference"},
  {cat:"cat:abdominal_swellings_colon", dx:"diagnosis:appendix_abscess"},
  {cat:"cat:abdominal_swellings_colon", dx:"diagnosis:caecal_mass_carcinoma"},
  {cat:"cat:abdominal_swellings_colon", dx:"diagnosis:faeces"},
  {cat:"cat:abdominal_swellings_colon", dx:"diagnosis:diverticular_mass"},
  {cat:"cat:abdominal_swellings_colon", dx:"diagnosis:volvulus_caecal_sigmoid"},
  {cat:"cat:abdominal_swellings_colon", dx:"diagnosis:intussusception"},
  {cat:"cat:abdominal_swellings_small_bowel", dx:"diagnosis:crohns_disease"},
  {cat:"cat:abdominal_swellings_small_bowel", dx:"diagnosis:small_bowel_carcinoma"},
  {cat:"cat:abdominal_swellings_small_bowel", dx:"diagnosis:mesenteric_cysts"},
  {cat:"cat:abdominal_swellings_small_bowel", dx:"diagnosis:lymphoma"},
  {cat:"cat:abdominal_swellings_small_bowel", dx:"diagnosis:ileo_caecal_tuberculosis"},
  {cat:"cat:abdominal_swellings_bladder", dx:"diagnosis:acute_retention"},
  {cat:"cat:abdominal_swellings_bladder", dx:"diagnosis:chronic_retention"},
  {cat:"cat:abdominal_swellings_bladder", dx:"diagnosis:bladder_carcinoma"},
  {cat:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", dx:"diagnosis:ovarian_cyst"},
  {cat:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", dx:"diagnosis:ovarian_neoplasm"},
  {cat:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", dx:"diagnosis:pregnancy"},
  {cat:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", dx:"diagnosis:ectopic_pregnancy"},
  {cat:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", dx:"diagnosis:tubo_ovarian_abscess"},
  {cat:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", dx:"diagnosis:uterine_fibroid"},
  {cat:"cat:abdominal_swellings_ovary_uterus_fallopian_tube", dx:"diagnosis:uterine_carcinoma"},
  {cat:"cat:abdominal_swellings_retroperitoneum", dx:"diagnosis:arterial_aneurysm_aortic_iliac"},
  {cat:"cat:abdominal_swellings_retroperitoneum", dx:"diagnosis:retroperitoneal_lymphadenopathy"},
  {cat:"cat:abdominal_swellings_retroperitoneum", dx:"diagnosis:iliac_bone_neoplasm"},
  {cat:"cat:abdominal_swellings_omentum", dx:"diagnosis:omental_secondaries"},

  // Backache
  {cat:"cat:backache_congenital", dx:"diagnosis:kyphoscoliosis"},
  {cat:"cat:backache_congenital", dx:"diagnosis:spina_bifida"},
  {cat:"cat:backache_congenital", dx:"diagnosis:spondylolisthesis"},
  {cat:"cat:backache_traumatic", dx:"diagnosis:vertebral_fractures"},
  {cat:"cat:backache_traumatic", dx:"diagnosis:ligamentous_injury"},
  {cat:"cat:backache_traumatic", dx:"diagnosis:joint_strain"},
  {cat:"cat:backache_traumatic", dx:"diagnosis:muscle_tears"},
  {cat:"cat:backache_infective", dx:"diagnosis:osteomyelitis_acute_and_chronic"},
  {cat:"cat:backache_infective", dx:"diagnosis:tuberculosis"},
  {cat:"cat:backache_infective", dx:"diagnosis:discitis"},
  {cat:"cat:backache_inflammatory", dx:"diagnosis:ankylosing_spondylitis"},
  {cat:"cat:backache_inflammatory", dx:"diagnosis:rheumatology_disorders"},
  {cat:"cat:backache_neoplastic", dx:"diagnosis:metastases_multiple_myeloma"},
  {cat:"cat:backache_neoplastic", dx:"diagnosis:primary_sarcomas"},
  {cat:"cat:backache_degenerative", dx:"diagnosis:osteoarthritis"},
  {cat:"cat:backache_degenerative", dx:"diagnosis:intervertebral_disc_lesions"},
  {cat:"cat:backache_metabolic", dx:"diagnosis:osteoporosis_associated_vertebral_fractures"},
  {cat:"cat:backache_metabolic", dx:"diagnosis:osteomalacia"},
  {cat:"cat:backache_endocrine", dx:"diagnosis:cushings_disease_osteoporosis"},
  {cat:"cat:backache_idiopathic", dx:"diagnosis:pagets_disease"},
  {cat:"cat:backache_idiopathic", dx:"diagnosis:scheuermanns_disease"},
  {cat:"cat:backache_psychogenic", dx:"diagnosis:psychosomatic_backache"},
  {cat:"cat:backache_visceral", dx:"diagnosis:penetrating_peptic_ulcer"},
  {cat:"cat:backache_visceral", dx:"diagnosis:carcinoma_of_the_pancreas"},
  {cat:"cat:backache_visceral", dx:"diagnosis:carcinoma_of_the_rectum"},
  {cat:"cat:backache_vascular", dx:"diagnosis:aortic_aneurysm"},
  {cat:"cat:backache_vascular", dx:"diagnosis:acute_aortic_dissection"},
  {cat:"cat:backache_renal", dx:"diagnosis:renal_calculus"},
  {cat:"cat:backache_renal", dx:"diagnosis:carcinoma_of_the_kidney"},
  {cat:"cat:backache_renal", dx:"diagnosis:renal_inflammatory_disease"},
  {cat:"cat:backache_gynaecological", dx:"diagnosis:pelvic_inflammatory_disease"},
  {cat:"cat:backache_gynaecological", dx:"diagnosis:endometriosis"},
  {cat:"cat:backache_gynaecological", dx:"diagnosis:uterine_tumours"},

  // Chest pain
  {cat:"cat:chest_pain_cardiovascular", dx:"diagnosis:angina"},
  {cat:"cat:chest_pain_cardiovascular", dx:"diagnosis:myocardial_infarction"},
  {cat:"cat:chest_pain_cardiovascular", dx:"diagnosis:pericarditis_myocarditis"},
  {cat:"cat:chest_pain_cardiovascular", dx:"diagnosis:acute_aortic_dissection"},
  {cat:"cat:chest_pain_gastrointestinal", dx:"diagnosis:gastro_oesophageal_reflux_disease"},
  {cat:"cat:chest_pain_gastrointestinal", dx:"diagnosis:peptic_ulcer_disease"},
  {cat:"cat:chest_pain_gastrointestinal", dx:"diagnosis:oesophageal_spasm"},
  {cat:"cat:chest_pain_pulmonary", dx:"diagnosis:pneumonia"},
  {cat:"cat:chest_pain_pulmonary", dx:"diagnosis:pneumothorax"},
  {cat:"cat:chest_pain_pulmonary", dx:"diagnosis:pulmonary_embolism"},
  {cat:"cat:chest_pain_musculoskeletal", dx:"diagnosis:chest_wall_trauma"},
  {cat:"cat:chest_pain_musculoskeletal", dx:"diagnosis:herpes_zoster"},
  {cat:"cat:chest_pain_musculoskeletal", dx:"diagnosis:costochondritis"},
  {cat:"cat:chest_pain_musculoskeletal", dx:"diagnosis:secondary_tumours_of_the_rib"},
  {cat:"cat:chest_pain_miscellaneous", dx:"diagnosis:fibromyalgia"},
  {cat:"cat:chest_pain_miscellaneous", dx:"diagnosis:depression"},

  // Dyspnoea
  {cat:"cat:dyspnoea_sudden", dx:"diagnosis:dyspnoea_pneumothorax"},
  {cat:"cat:dyspnoea_sudden", dx:"diagnosis:chest_trauma"},
  {cat:"cat:dyspnoea_sudden", dx:"diagnosis:aspiration"},
  {cat:"cat:dyspnoea_sudden", dx:"diagnosis:pulmonary_oedema"},
  {cat:"cat:dyspnoea_sudden", dx:"diagnosis:pulmonary_embolism"},
  {cat:"cat:dyspnoea_sudden", dx:"diagnosis:anaphylaxis"},
  {cat:"cat:dyspnoea_acute", dx:"diagnosis:asthma"},
  {cat:"cat:dyspnoea_acute", dx:"diagnosis:respiratory_tract_infection"},
  {cat:"cat:dyspnoea_acute", dx:"diagnosis:pleural_effusion"},
  {cat:"cat:dyspnoea_acute", dx:"diagnosis:lung_tumours"},
  {cat:"cat:dyspnoea_acute", dx:"diagnosis:metabolic_acidosis"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:copd"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:anaemia"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:arrhythmia"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:valvular_heart_disease"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:cardiac_failure"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:cystic_fibrosis"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:idiopathic_pulmonary_fibrosis"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:chest_wall_deformities"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:neuromuscular_disorders"},
  {cat:"cat:dyspnoea_chronic", dx:"diagnosis:pulmonary_hypertension"},

  // Headache
  {cat:"cat:headache_acute_headache", dx:"diagnosis:headache_trauma"},
  {cat:"cat:headache_acute_headache", dx:"diagnosis:subarachnoid_haemorrhage"},
  {cat:"cat:headache_acute_headache", dx:"diagnosis:intracranial_haemorrhage_infarction"},
  {cat:"cat:headache_acute_headache", dx:"diagnosis:systemic_infection"},
  {cat:"cat:headache_acute_headache", dx:"diagnosis:meningitis"},
  {cat:"cat:headache_acute_headache", dx:"diagnosis:acute_angle_closure_glaucoma"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:tension_headache"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:migraine"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:medication_overuse_headache"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:cluster_headaches"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:drugs_substance_withdrawal_headache"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:cervical_spondylosis"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:psychological_anxiety_depression"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:raised_intracranial_pressure"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:tumour"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:hydrocephalus"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:cerebral_abscess"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:idiopathic_intracranial_hypertension"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:temporal_arteritis"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:pre_eclampsia"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:pagets_disease_of_bone"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:severe_hypertension"},
  {cat:"cat:headache_chronic_or_recurrent_headache", dx:"diagnosis:carbon_monoxide_poisoning"}
] AS row
MATCH (c:Category {key: row.cat})
MATCH (d:Diagnosis {key: row.dx})
MERGE (c)-[:INCLUDES_DIAGNOSIS]->(d);


// =====================================================
// FEATURES
// =====================================================

UNWIND [
  // Abdominal pain
  {key:"feature:abdominal_pain_age", cp:"cp:abdominal_pain", type:"history", name:"Age (e.g. mesenteric adenitis in children, diverticular disease in the elderly)"},
  {key:"feature:abdominal_pain_previous_surgery", cp:"cp:abdominal_pain", type:"past_history", name:"Previous surgery, e.g. adhesions may cause intestinal obstruction."},
  {key:"feature:abdominal_pain_recent_trauma", cp:"cp:abdominal_pain", type:"past_history", name:"Recent trauma, e.g. delayed rupture of spleen."},
  {key:"feature:abdominal_pain_menstrual_history", cp:"cp:abdominal_pain", type:"past_history", name:"Menstrual history, e.g. ectopic pregnancy."},
  {key:"feature:abdominal_pain_ureteric_radiates_loin_to_groin", cp:"cp:abdominal_pain", type:"pain", name:"Pain associated with ureteric calculi typically radiates from loin to groin."},
  {key:"feature:abdominal_pain_appendicitis_migrates_umbilicus_to_rif", cp:"cp:abdominal_pain", type:"pain", name:"Pain associated with appendicitis typically migrates from the umbilicus to the right iliac fossa."},
  {key:"feature:abdominal_pain_absolute_constipation_abdominal_distention_faecalant_vomiting", cp:"cp:abdominal_pain", type:"associated_symptom", name:"Absolute constipation, abdominal distention, and faecalant vomiting is suggestive a bowel obstruction."},
  {key:"feature:abdominal_pain_rigors_sweats_temperatures", cp:"cp:abdominal_pain", type:"fever", name:"Any rigors, sweats and temperatures may suggest infection."},

  // Abdominal swellings
  {key:"feature:abdominal_swellings_known_history_of_gallstones", cp:"cp:abdominal_swellings", type:"past_history", name:"Known history of gallstones."},
  {key:"feature:abdominal_swellings_jaundice", cp:"cp:abdominal_swellings", type:"history", name:"Jaundice."},
  {key:"feature:abdominal_swellings_dark_urine", cp:"cp:abdominal_swellings", type:"history", name:"Dark urine."},
  {key:"feature:abdominal_swellings_pale_stools", cp:"cp:abdominal_swellings", type:"history", name:"Pale stools."},
  {key:"feature:abdominal_swellings_pruritus", cp:"cp:abdominal_swellings", type:"history", name:"Pruritus."},
  {key:"feature:abdominal_swellings_recent_weight_loss", cp:"cp:abdominal_swellings", type:"history", name:"Recent weight loss."},
  {key:"feature:abdominal_swellings_history_of_acute_pancreatitis", cp:"cp:abdominal_swellings", type:"past_history", name:"There may be a history of acute pancreatitis, which would suggest the development of a pseudocyst."},
  {key:"feature:abdominal_swellings_weight_loss_backache_jaundice", cp:"cp:abdominal_swellings", type:"history", name:"Weight loss, backache and jaundice will suggest carcinoma of the pancreas."},
  {key:"feature:abdominal_swellings_recent_onset_of_diabetes", cp:"cp:abdominal_swellings", type:"history", name:"Recent onset of diabetes may occur with carcinoma of the pancreas."},
  {key:"feature:abdominal_swellings_change_in_bowel_habit_weight_loss", cp:"cp:abdominal_swellings", type:"history", name:"A change in bowel habit and unintentional weight loss are suggestive of carcinoma."},
  {key:"feature:abdominal_swellings_known_history_of_diverticular_disease", cp:"cp:abdominal_swellings", type:"past_history", name:"Identify any known history of diverticular disease."},
  {key:"feature:abdominal_swellings_history_of_backache", cp:"cp:abdominal_swellings", type:"history", name:"A history of backache may suggest an aortic aneurysm or the patient may complain of a pulsatile epigastric swelling."},

  // Backache
  {key:"feature:backache_low_lumbar_backache_worse_on_standing", cp:"cp:backache", type:"history", name:"low lumbar backache, worse on standing"},
  {key:"feature:backache_clear_history_of_trauma", cp:"cp:backache", type:"past_history", name:"There will usually be a clear history of trauma."},
  {key:"feature:backache_history_of_tb", cp:"cp:backache", type:"past_history", name:"There may be a history of TB; the patient may have had night sweats or cough."},
  {key:"feature:backache_young_adult_males", cp:"cp:backache", type:"age", name:"Ankylosing spondylitis usually affects young adult males."},
  {key:"feature:backache_past_history_of_primary_tumour", cp:"cp:backache", type:"past_history", name:"There may be a past history of a primary tumour (e.g. bronchus, breast, thyroid, prostate or kidney)."},
  {key:"feature:backache_sudden_onset_sciatica", cp:"cp:backache", type:"history", name:"there is usually sudden onset of pain radiating down the back of the leg (sciatica)."},
  {key:"feature:backache_postmenopausal_women", cp:"cp:backache", type:"age", name:"Osteoporosis is commonest in postmenopausal women."},
  {key:"feature:backache_epigastric_pain_radiating_straight_through_to_back", cp:"cp:backache", type:"history", name:"the patient complains of epigastric pain radiating straight through to the back."},
  {key:"feature:backache_boring_pain", cp:"cp:backache", type:"history", name:"the patient will describe a boring pain in the back, which is unrelenting."},
  {key:"feature:backache_haematuria", cp:"cp:backache", type:"associated_symptom", name:"The patient may also complain of haematuria."},
  {key:"feature:backache_frequency_and_dysuria", cp:"cp:backache", type:"associated_symptom", name:"The patient may be feverish with rigors, and complain of frequency and dysuria."},
  {key:"feature:backache_dysmenorrhoea_menorrhagia_post_menopausal_bleeding", cp:"cp:backache", type:"associated_symptom", name:"The patient may also complain of dysmenorrhoea, menorrhagia or post-menopausal bleeding."},

  // Chest pain
  {key:"feature:chest_pain_tight_and_crushing", cp:"cp:chest_pain", type:"character", name:"The character of angina is tight and crushing."},
  {key:"feature:chest_pain_tearing_quality", cp:"cp:chest_pain", type:"character", name:"the pain from aortic dissection has a tearing quality."},
  {key:"feature:chest_pain_sharp_stabbing", cp:"cp:chest_pain", type:"character", name:"Pericarditis typically causes pain of a sharp, stabbing nature."},
  {key:"feature:chest_pain_burning", cp:"cp:chest_pain", type:"character", name:"Oesophageal reflux may be described as a burning pain."},
  {key:"feature:chest_pain_pain_radiates_to_back", cp:"cp:chest_pain", type:"location", name:"Pain from aortic dissection often radiates into the back and occasionally into the abdomen."},
  {key:"feature:chest_pain_precipitated_by_effort", cp:"cp:chest_pain", type:"precipitating_factor", name:"Stable angina may be precipitated by effort, a defining characteristic."},
  {key:"feature:chest_pain_related_to_meals_and_posture", cp:"cp:chest_pain", type:"precipitating_factor", name:"Oesophageal reflux is often related to meals and precipitated by changes in posture, such as bending or lying flat."},
  {key:"feature:chest_pain_pleuritic", cp:"cp:chest_pain", type:"precipitating_factor", name:"Pain originating from pericarditis and pulmonary origin is often pleuritic."},
  {key:"feature:chest_pain_relieved_by_antacids", cp:"cp:chest_pain", type:"relieving_factor", name:"Antacids will relieve the pain of oesophageal reflux but not angina."},
  {key:"feature:chest_pain_relieved_by_sitting_forwards", cp:"cp:chest_pain", type:"relieving_factor", name:"The pain associated with pericarditis may be relieved by sitting forwards and anti-inflammatory analgesics."},
  {key:"feature:chest_pain_blunt_or_stretching_injury", cp:"cp:chest_pain", type:"trauma", name:"A history of a blunt or stretching injury immediately suggests the underlying aetiology of chest wall tenderness."},

  // Dyspnoea
  {key:"feature:dyspnoea_trauma_causing_fractured_ribs_or_pneumothorax", cp:"cp:dyspnoea", type:"precipitating_factor", name:"trauma causing either fractured ribs or a pneumothorax"},
  {key:"feature:dyspnoea_aspiration_of_a_foreign_body", cp:"cp:dyspnoea", type:"precipitating_factor", name:"Aspiration of a foreign body may be determined from the history;"},
  {key:"feature:dyspnoea_recumbency", cp:"cp:dyspnoea", type:"precipitating_factor", name:"Dyspnoea on recumbency is caused by cardiac failure;"},
  {key:"feature:dyspnoea_paroxysmal_nocturnal_dyspnoea", cp:"cp:dyspnoea", type:"precipitating_factor", name:"patients may complain of waking up at night gasping for breath (paroxysmal nocturnal dyspnoea)."},
  {key:"feature:dyspnoea_particular_allergens", cp:"cp:dyspnoea", type:"precipitating_factor", name:"Dyspnoea associated with asthma may be associated with particular allergens, e.g. grass pollen, house dust mites."},
  {key:"feature:dyspnoea_history_of_severe_allergy", cp:"cp:dyspnoea", type:"past_history", name:"A history of severe allergy should lead to the consideration of anaphylaxis."},
  {key:"feature:dyspnoea_relief_by_sitting_upright", cp:"cp:dyspnoea", type:"relieving_factor", name:"Dyspnoea resulting from cardiac failure may be relieved by sitting upright,"},
  {key:"feature:dyspnoea_relief_by_beta_agonists", cp:"cp:dyspnoea", type:"relieving_factor", name:"when due to asthma, by beta agonists."},
  {key:"feature:dyspnoea_green_yellow_rusty_sputum", cp:"cp:dyspnoea", type:"associated_factor", name:"Cough productive of (green, yellow, rusty) sputum indicates the presence of a chest infection."},
  {key:"feature:dyspnoea_bloodstained_sputum", cp:"cp:dyspnoea", type:"associated_factor", name:"Bloodstained sputum may result from a chest infection (especially TB), pulmonary embolism or a tumour."},
  {key:"feature:dyspnoea_wheezing", cp:"cp:dyspnoea", type:"associated_factor", name:"Wheezing may result from asthma or aspiration of a foreign body"},

  // Headache
  {key:"feature:headache_sudden_onset_of_severe_pain", cp:"cp:headache", type:"onset", name:"Sudden onset of severe pain is usually due to a vascular cause, especially subarachnoid haemorrhage from a ruptured berry aneurysm."},
  {key:"feature:headache_preceded_by_aura", cp:"cp:headache", type:"onset", name:"The onset of headache may be preceded by an aura with migraine."},
  {key:"feature:headache_unilateral", cp:"cp:headache", type:"site", name:"Classically, headache from migraine is unilateral."},
  {key:"feature:headache_jaw_claudication", cp:"cp:headache", type:"site", name:"Temporal arteritis leads to more localised pain over the superficial temporal arteries that can be accompanied by jaw claudication."},
  {key:"feature:headache_retro_orbital_pain", cp:"cp:headache", type:"site", name:"retro-orbital pain with cluster headaches."},
  {key:"feature:headache_tight_band_like_sensation", cp:"cp:headache", type:"character", name:"Patients with tension headache often complain of a tight band-like sensation;"},
  {key:"feature:headache_bursting_quality", cp:"cp:headache", type:"character", name:"raised intracranial pressure, which is often reported to have a bursting quality."},
  {key:"feature:headache_throbbing_character", cp:"cp:headache", type:"character", name:"Migraine-related and temporal arteritis headaches have a throbbing character."},
  {key:"feature:headache_changes_in_posture_coughing_or_sneezing", cp:"cp:headache", type:"precipitating_factor", name:"Headache originating from raised intracranial pressure is precipitated by changes in posture, coughing or sneezing, and is often worse in the mornings."},
  {key:"feature:headache_photophobia", cp:"cp:headache", type:"precipitating_factor", name:"Photophobia may be experienced by patients suffering with migraine, meningitis or glaucoma."},
  {key:"feature:headache_cheese_red_wine_chocolate", cp:"cp:headache", type:"precipitating_factor", name:"Certain foods such as cheese, red wine and chocolate are known to precipitate migraine."},
  {key:"feature:headache_drug_history", cp:"cp:headache", type:"past_history", name:"A drug history may elucidate the relationship between the administration of drugs with headache as a side-effect, such as glyceryl trinitrate and nifedipine."},
  {key:"feature:headache_neck_stiffness_meningism", cp:"cp:headache", type:"associated_symptom", name:"Neck stiffness (meningism) is experienced with both meningitis and subarachnoid haemorrhages."},
  {key:"feature:headache_visual_disturbances_haloes", cp:"cp:headache", type:"associated_symptom", name:"Visual disturbances in the form of haloes occur with glaucoma."},
  {key:"feature:headache_flashing_lights", cp:"cp:headache", type:"associated_symptom", name:"Flashing lights and alternations in perception of size may be reported by patients suffering with migraine,"},
  {key:"feature:headache_nausea_and_vomiting", cp:"cp:headache", type:"associated_symptom", name:"this may be accompanied by photophobia, nausea and vomiting."},
  {key:"feature:headache_unilateral_visual_loss", cp:"cp:headache", type:"associated_symptom", name:"Unilateral visual loss may result as a complication of temporal arteritis,"}
] AS row
MERGE (f:Feature {key: row.key})
SET f.name = row.name,
    f.normalized_name = toLower(row.name),
    f.feature_type = row.type
WITH row
MATCH (cp:ClinicalPresentation {key: row.cp})
MATCH (f:Feature {key: row.key})
MERGE (cp)-[:HAS_FEATURE]->(f);


// =====================================================
// FEATURE -> DIAGNOSIS
// Conservative mappings only
// =====================================================

UNWIND [
  // Abdominal pain
  {feature:"feature:abdominal_pain_previous_surgery", diagnosis:"diagnosis:obstruction"},
  {feature:"feature:abdominal_pain_recent_trauma", diagnosis:"diagnosis:spontaneous_rupture"},
  {feature:"feature:abdominal_pain_menstrual_history", diagnosis:"diagnosis:ectopic_pregnancy"},
  {feature:"feature:abdominal_pain_ureteric_radiates_loin_to_groin", diagnosis:"diagnosis:ureteric_colic"},
  {feature:"feature:abdominal_pain_appendicitis_migrates_umbilicus_to_rif", diagnosis:"diagnosis:appendicitis"},
  {feature:"feature:abdominal_pain_absolute_constipation_abdominal_distention_faecalant_vomiting", diagnosis:"diagnosis:obstruction"},
  {feature:"feature:abdominal_pain_rigors_sweats_temperatures", diagnosis:"diagnosis:cholangitis"},
  {feature:"feature:abdominal_pain_rigors_sweats_temperatures", diagnosis:"diagnosis:urinary_tract_infection_acute_pyelonephritis"},

  // Abdominal swellings
  {feature:"feature:abdominal_swellings_known_history_of_gallstones", diagnosis:"diagnosis:mucocele"},
  {feature:"feature:abdominal_swellings_known_history_of_gallstones", diagnosis:"diagnosis:empyema"},
  {feature:"feature:abdominal_swellings_recent_weight_loss", diagnosis:"diagnosis:gall_bladder_carcinoma"},
  {feature:"feature:abdominal_swellings_recent_weight_loss", diagnosis:"diagnosis:pancreas_carcinoma"},
  {feature:"feature:abdominal_swellings_history_of_acute_pancreatitis", diagnosis:"diagnosis:pseudocyst"},
  {feature:"feature:abdominal_swellings_weight_loss_backache_jaundice", diagnosis:"diagnosis:pancreas_carcinoma"},
  {feature:"feature:abdominal_swellings_recent_onset_of_diabetes", diagnosis:"diagnosis:pancreas_carcinoma"},
  {feature:"feature:abdominal_swellings_change_in_bowel_habit_weight_loss", diagnosis:"diagnosis:caecal_mass_carcinoma"},
  {feature:"feature:abdominal_swellings_known_history_of_diverticular_disease", diagnosis:"diagnosis:diverticular_mass"},
  {feature:"feature:abdominal_swellings_history_of_backache", diagnosis:"diagnosis:arterial_aneurysm_aortic_iliac"},
  {feature:"feature:abdominal_swellings_history_of_backache", diagnosis:"diagnosis:retroperitoneal_lymphadenopathy"},

  // Backache
  {feature:"feature:backache_low_lumbar_backache_worse_on_standing", diagnosis:"diagnosis:spondylolisthesis"},
  {feature:"feature:backache_clear_history_of_trauma", diagnosis:"diagnosis:vertebral_fractures"},
  {feature:"feature:backache_history_of_tb", diagnosis:"diagnosis:tuberculosis"},
  {feature:"feature:backache_young_adult_males", diagnosis:"diagnosis:ankylosing_spondylitis"},
  {feature:"feature:backache_past_history_of_primary_tumour", diagnosis:"diagnosis:metastases_multiple_myeloma"},
  {feature:"feature:backache_sudden_onset_sciatica", diagnosis:"diagnosis:intervertebral_disc_lesions"},
  {feature:"feature:backache_postmenopausal_women", diagnosis:"diagnosis:osteoporosis_associated_vertebral_fractures"},
  {feature:"feature:backache_epigastric_pain_radiating_straight_through_to_back", diagnosis:"diagnosis:penetrating_peptic_ulcer"},
  {feature:"feature:backache_boring_pain", diagnosis:"diagnosis:carcinoma_of_the_pancreas"},
  {feature:"feature:backache_haematuria", diagnosis:"diagnosis:carcinoma_of_the_kidney"},
  {feature:"feature:backache_frequency_and_dysuria", diagnosis:"diagnosis:renal_inflammatory_disease"},
  {feature:"feature:backache_dysmenorrhoea_menorrhagia_post_menopausal_bleeding", diagnosis:"diagnosis:endometriosis"},
  {feature:"feature:backache_dysmenorrhoea_menorrhagia_post_menopausal_bleeding", diagnosis:"diagnosis:uterine_tumours"},

  // Chest pain
  {feature:"feature:chest_pain_tight_and_crushing", diagnosis:"diagnosis:angina"},
  {feature:"feature:chest_pain_tight_and_crushing", diagnosis:"diagnosis:myocardial_infarction"},
  {feature:"feature:chest_pain_tearing_quality", diagnosis:"diagnosis:acute_aortic_dissection"},
  {feature:"feature:chest_pain_sharp_stabbing", diagnosis:"diagnosis:pericarditis_myocarditis"},
  {feature:"feature:chest_pain_burning", diagnosis:"diagnosis:gastro_oesophageal_reflux_disease"},
  {feature:"feature:chest_pain_precipitated_by_effort", diagnosis:"diagnosis:angina"},
  {feature:"feature:chest_pain_related_to_meals_and_posture", diagnosis:"diagnosis:gastro_oesophageal_reflux_disease"},
  {feature:"feature:chest_pain_pleuritic", diagnosis:"diagnosis:pneumonia"},
  {feature:"feature:chest_pain_pleuritic", diagnosis:"diagnosis:pulmonary_embolism"},
  {feature:"feature:chest_pain_pleuritic", diagnosis:"diagnosis:pericarditis_myocarditis"},
  {feature:"feature:chest_pain_relieved_by_antacids", diagnosis:"diagnosis:gastro_oesophageal_reflux_disease"},
  {feature:"feature:chest_pain_relieved_by_sitting_forwards", diagnosis:"diagnosis:pericarditis_myocarditis"},
  {feature:"feature:chest_pain_blunt_or_stretching_injury", diagnosis:"diagnosis:chest_wall_trauma"},

  // Dyspnoea
  {feature:"feature:dyspnoea_trauma_causing_fractured_ribs_or_pneumothorax", diagnosis:"diagnosis:chest_trauma"},
  {feature:"feature:dyspnoea_trauma_causing_fractured_ribs_or_pneumothorax", diagnosis:"diagnosis:dyspnoea_pneumothorax"},
  {feature:"feature:dyspnoea_aspiration_of_a_foreign_body", diagnosis:"diagnosis:aspiration"},
  {feature:"feature:dyspnoea_recumbency", diagnosis:"diagnosis:cardiac_failure"},
  {feature:"feature:dyspnoea_paroxysmal_nocturnal_dyspnoea", diagnosis:"diagnosis:cardiac_failure"},
  {feature:"feature:dyspnoea_particular_allergens", diagnosis:"diagnosis:asthma"},
  {feature:"feature:dyspnoea_history_of_severe_allergy", diagnosis:"diagnosis:anaphylaxis"},
  {feature:"feature:dyspnoea_relief_by_sitting_upright", diagnosis:"diagnosis:cardiac_failure"},
  {feature:"feature:dyspnoea_relief_by_beta_agonists", diagnosis:"diagnosis:asthma"},
  {feature:"feature:dyspnoea_green_yellow_rusty_sputum", diagnosis:"diagnosis:respiratory_tract_infection"},
  {feature:"feature:dyspnoea_bloodstained_sputum", diagnosis:"diagnosis:pulmonary_embolism"},
  {feature:"feature:dyspnoea_bloodstained_sputum", diagnosis:"diagnosis:lung_tumours"},
  {feature:"feature:dyspnoea_wheezing", diagnosis:"diagnosis:asthma"},
  {feature:"feature:dyspnoea_wheezing", diagnosis:"diagnosis:aspiration"},

  // Headache
  {feature:"feature:headache_sudden_onset_of_severe_pain", diagnosis:"diagnosis:subarachnoid_haemorrhage"},
  {feature:"feature:headache_preceded_by_aura", diagnosis:"diagnosis:migraine"},
  {feature:"feature:headache_unilateral", diagnosis:"diagnosis:migraine"},
  {feature:"feature:headache_jaw_claudication", diagnosis:"diagnosis:temporal_arteritis"},
  {feature:"feature:headache_retro_orbital_pain", diagnosis:"diagnosis:cluster_headaches"},
  {feature:"feature:headache_tight_band_like_sensation", diagnosis:"diagnosis:tension_headache"},
  {feature:"feature:headache_bursting_quality", diagnosis:"diagnosis:raised_intracranial_pressure"},
  {feature:"feature:headache_throbbing_character", diagnosis:"diagnosis:migraine"},
  {feature:"feature:headache_throbbing_character", diagnosis:"diagnosis:temporal_arteritis"},
  {feature:"feature:headache_changes_in_posture_coughing_or_sneezing", diagnosis:"diagnosis:raised_intracranial_pressure"},
  {feature:"feature:headache_photophobia", diagnosis:"diagnosis:migraine"},
  {feature:"feature:headache_photophobia", diagnosis:"diagnosis:meningitis"},
  {feature:"feature:headache_photophobia", diagnosis:"diagnosis:acute_angle_closure_glaucoma"},
  {feature:"feature:headache_cheese_red_wine_chocolate", diagnosis:"diagnosis:migraine"},
  {feature:"feature:headache_drug_history", diagnosis:"diagnosis:drugs_substance_withdrawal_headache"},
  {feature:"feature:headache_neck_stiffness_meningism", diagnosis:"diagnosis:meningitis"},
  {feature:"feature:headache_neck_stiffness_meningism", diagnosis:"diagnosis:subarachnoid_haemorrhage"},
  {feature:"feature:headache_visual_disturbances_haloes", diagnosis:"diagnosis:acute_angle_closure_glaucoma"},
  {feature:"feature:headache_flashing_lights", diagnosis:"diagnosis:migraine"},
  {feature:"feature:headache_nausea_and_vomiting", diagnosis:"diagnosis:migraine"},
  {feature:"feature:headache_unilateral_visual_loss", diagnosis:"diagnosis:temporal_arteritis"}
] AS row
MATCH (f:Feature {key: row.feature})
MATCH (d:Diagnosis {key: row.diagnosis})
MERGE (f)-[:SUGGESTS]->(d);


// =====================================================
// OPTIONAL CHECKS
// =====================================================

// MATCH (cp:ClinicalPresentation)
// RETURN cp.key, cp.name
// ORDER BY cp.name;

// MATCH (d:Diagnosis)
// RETURN d.key, d.name
// ORDER BY d.name;

// MATCH (cp:ClinicalPresentation)-[:HAS_CATEGORY]->(c:Category)
// RETURN cp.name, count(c) AS categories
// ORDER BY cp.name;

// MATCH (cp:ClinicalPresentation)-[:HAS_FEATURE]->(f:Feature)
// RETURN cp.name, count(f) AS features
// ORDER BY cp.name;

// MATCH (c:Category)-[:INCLUDES_DIAGNOSIS]->(d:Diagnosis)
// RETURN c.name, count(d) AS diagnoses
// ORDER BY c.name;

// MATCH p = (:Source)-[:HAS_EXCERPT|DOCUMENTS*1..2]->(:ClinicalPresentation)-[:HAS_CATEGORY]->(:Category)-[:INCLUDES_DIAGNOSIS]->(:Diagnosis)
// RETURN p LIMIT 300;

// MATCH p = (:ClinicalPresentation)-[:HAS_FEATURE]->(:Feature)-[:SUGGESTS]->(:Diagnosis)
// RETURN p LIMIT 300;