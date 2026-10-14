-- Seed data for the MVP demo. All educational content below is ORIGINAL
-- summary text written for this app (no copied question banks or protected
-- content). Program details are illustrative approximations — the UI tells
-- users to verify with each program and the COA directory.

-- Fixed UUIDs for demo users so the rest of the seed can reference them.
-- Password for all three: password123 (bcrypt via pgcrypto).
INSERT INTO users (id, email, password_hash, display_name, role, school, grad_year, bio) VALUES
  ('00000000-0000-4000-8000-000000000001', 'demo.prospective@example.com', crypt('password123', gen_salt('bf')),
   'Jordan Lee', 'prospective', NULL, NULL, 'ICU nurse, 3 years CVICU. Applying for the 2027 cycle.'),
  ('00000000-0000-4000-8000-000000000002', 'demo.srna@example.com', crypt('password123', gen_salt('bf')),
   'John Smith', 'srna', 'Example University Nurse Anesthesia Program', 2027, 'Second-year SRNA. Pharm and airway are my weak spots.'),
  ('00000000-0000-4000-8000-000000000003', 'demo.crna@example.com', crypt('password123', gen_salt('bf')),
   'Marcus Chen, CRNA', 'crna', NULL, 2019, 'Practicing CRNA, independent practice. Happy to mentor.');

-- ---------------------------------------------------------------------------
-- Programs (illustrative — verify everything with the program + COA directory)
INSERT INTO programs (name, city, state, degree, length_months, deadline, tuition, website, source_url, notes) VALUES
  ('Duke University Nurse Anesthesia Program', 'Durham', 'NC', 'DNP', 36, '2026-08-01', 'See program website', 'https://nursing.duke.edu', 'https://www.coacrna.org', 'Illustrative entry — verify deadline, degree, and tuition with the program.'),
  ('Virginia Commonwealth University Nurse Anesthesia', 'Richmond', 'VA', 'DNAP', 36, '2026-07-15', 'See program website', 'https://www.vcu.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('Kaiser Permanente School of Anesthesia', 'Pasadena', 'CA', 'DNP', 36, '2026-06-30', 'See program website', 'https://kpsahp.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('Columbia University Nurse Anesthesia Program', 'New York', 'NY', 'DNP', 36, '2026-09-01', 'See program website', 'https://www.nursing.columbia.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('Texas Christian University Nurse Anesthesia', 'Fort Worth', 'TX', 'DNP', 36, '2026-05-01', 'See program website', 'https://www.tcu.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('Wake Forest University School of Medicine Nurse Anesthesia', 'Winston-Salem', 'NC', 'DNP', 36, '2026-07-01', 'See program website', 'https://school.wakehealth.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('Mayo Clinic School of Health Sciences Nurse Anesthesia', 'Rochester', 'MN', 'DNP', 36, '2026-08-15', 'See program website', 'https://college.mayo.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('Georgetown University Nurse Anesthesia Program', 'Washington', 'DC', 'DNP', 36, '2026-06-01', 'See program website', 'https://nhs.georgetown.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('UT Health Houston Nurse Anesthesia Program', 'Houston', 'TX', 'DNP', 36, '2026-09-15', 'See program website', 'https://www.uth.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.'),
  ('University of Pittsburgh Nurse Anesthesia Program', 'Pittsburgh', 'PA', 'DNP', 36, '2026-08-31', 'See program website', 'https://www.shrs.pitt.edu', 'https://www.coacrna.org', 'Illustrative entry — verify with the program.');

-- ---------------------------------------------------------------------------
-- Curated resource directory (links out; we do not republish their content)
INSERT INTO resources (title, url, source, category, description, revision_date) VALUES
  ('DailyMed — Official FDA Drug Labeling', 'https://dailymed.nlm.nih.gov', 'NLM DailyMed', 'Drug Reference',
   'Official repository of FDA-approved medication labeling. Search any drug for indications, dosing, contraindications, and warnings straight from the label.', NULL),
  ('OpenAnesthesia', 'https://www.openanesthesia.org', 'OpenAnesthesia', 'Clinical Education',
   'Anesthesia education wiki covering pharmacology, physiology, techniques, and keywords. Link out for topic deep-dives.', NULL),
  ('AANA Clinical Practice Resources', 'https://www.aana.com/practice/clinical-practice-resources/', 'AANA', 'Professional',
   'Professional practice resources from the American Association of Nurse Anesthesiology. Some content requires membership.', NULL),
  ('AANA Continuing Education', 'https://www.aana.com/education/', 'AANA', 'Professional',
   'Continuing education opportunities, CPC program info, and professional development.', NULL),
  ('NBCRNA SEE Program', 'https://www.nbcrna.com', 'NBCRNA', 'Certification & Exams',
   'Official Self-Evaluation Examination information and preparation guidance from the certifying body.', NULL),
  ('NBCRNA NCE Exam Information', 'https://www.nbcrna.com', 'NBCRNA', 'Certification & Exams',
   'National Certification Examination outline, eligibility, and registration. Use official outlines to guide study.', NULL),
  ('COA CRNA School Search', 'https://www.coacrna.org', 'COA', 'Programs & Admissions',
   'Official directory of accredited nurse anesthesia programs with admissions fields. Verify all program details here.', NULL),
  ('ASA Practice Guidelines', 'https://www.asahq.org/standards-and-practice-parameters', 'ASA', 'Guidelines',
   'Standards and practice parameters from the American Society of Anesthesiologists.', NULL),
  ('NYSORA', 'https://www.nysora.com', 'NYSORA', 'Clinical Education',
   'Regional anesthesia and acute pain education: techniques, ultrasound guidance, and anatomy.', NULL),
  ('BJA Education', 'https://www.bjaed.org', 'BJA', 'Clinical Education',
   'Peer-reviewed continuing education articles from the British Journal of Anaesthesia.', NULL),
  ('StatPearls — Anesthesiology', 'https://www.ncbi.nlm.nih.gov/books/', 'NCBI Bookshelf', 'Clinical Education',
   'Free peer-reviewed clinical review articles via NCBI Bookshelf. Useful for quick topic refreshers.', NULL),
  ('ACLS Guidelines (AHA)', 'https://cpr.heart.org', 'AHA', 'Guidelines',
   'Official AHA resuscitation guidelines and ACLS course information.', NULL),
  ('FDA Drug Safety Communications', 'https://www.fda.gov/drugs/drug-safety-and-availability', 'FDA', 'Drug Reference',
   'Post-market drug safety alerts, recalls, and label changes.', NULL),
  ('Anesthesia & Analgesia (Journal)', 'https://journals.lww.com/anesthesia-analgesia/', 'A&A', 'Journals',
   'Official journal of the IARS. Original research and reviews in anesthesiology.', NULL),
  ('CRNA School Admissions Overview', 'https://www.aana.com/about-us/become-a-crna/', 'AANA', 'Programs & Admissions',
   'How to become a CRNA: education requirements, certification path, and FAQs.', NULL),
  ('Shadowing & Observation Guidance', 'https://www.aana.com', 'AANA', 'Programs & Admissions',
   'Guidance on arranging anesthesia shadowing experiences before applying.', NULL),
  ('PubMed — Anesthesiology Search', 'https://pubmed.ncbi.nlm.nih.gov', 'NLM', 'Journals',
   'Primary literature search. Filter for free full text; appraise evidence quality before relying on abstracts.', NULL),
  ('Difficult Airway Society Guidelines', 'https://das.uk.com', 'DAS', 'Guidelines',
   'UK Difficult Airway Society guidelines — unanticipated difficult intubation algorithms and updates.', NULL),
  ('OpenEvidence — Anesthesia Topics', 'https://www.openevidence.com', 'OpenEvidence', 'Clinical Education',
   'Evidence summaries with citations. Always click through to primary sources.', NULL),
  ('CRNA Career & Salary Information (BLS)', 'https://www.bls.gov/ooh/healthcare/nurse-anesthetists.htm', 'BLS', 'Career',
   'Bureau of Labor Statistics occupational outlook for nurse anesthetists: pay, growth, work settings.', NULL),
  ('State Boards of Nursing Directory', 'https://www.ncsbn.org', 'NCSBN', 'Career',
   'Licensure requirements vary by state — check the NCSBN member board directory.', NULL),
  ('Anesthesia Patient Safety Foundation', 'https://www.apsf.org', 'APSF', 'Guidelines',
   'Patient safety resources, newsletters, and monitoring standards.', NULL),
  ('Society for Obstetric Anesthesia (SOAP)', 'https://soap.org', 'SOAP', 'Professional',
   'Subspecialty society for obstetric anesthesia: guidelines and education.', NULL),
  ('Society for Pediatric Anesthesia', 'https://www.pedsanesthesia.org', 'SPA', 'Professional',
   'Subspecialty society for pediatric anesthesia: education and guidelines.', NULL);

-- ---------------------------------------------------------------------------
-- Original flashcard decks (educational summaries written for this app)
INSERT INTO decks (id, title, description) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Anesthesia Pharmacology Basics',
   'Original educational summaries of commonly taught anesthesia drugs. Educational review only — always verify against the official label and institutional protocol.'),
  ('10000000-0000-4000-8000-000000000002', 'Airway & Monitoring Essentials',
   'Original educational summaries of foundational airway and monitoring concepts for early SRNA study.');

INSERT INTO cards (deck_id, front, back, position) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Propofol — class and primary use?', 'Sedative-hypnotic (GABA-A agonist). Most common IV induction agent. Also used for sedation and TIVA. Notable: hypotension on induction, pain on injection, propofol infusion syndrome with prolonged high-dose infusion.', 1),
  ('10000000-0000-4000-8000-000000000001', 'Succinylcholine — what kind of neuromuscular blocker, and key risks?', 'Depolarizing NMB (acetylcholine agonist). Fastest onset of the classic NMBs; short duration via pseudocholinesterase. Key risks: hyperkalemia (esp. burns, denervation, prolonged immobility), malignant hyperthermia trigger, bradycardia with repeat doses.', 2),
  ('10000000-0000-4000-8000-000000000001', 'Rocuronium — class, reversal?', 'Non-depolarizing aminosteroid NMB. Reversed by neostigmine (with glycopyrrolate) or directly encapsulated by sugammadex — sugammadex can reverse even deep rocuronium block.', 3),
  ('10000000-0000-4000-8000-000000000001', 'Fentanyl — class and clinical pearls?', 'Potent synthetic opioid (mu agonist), roughly 100x morphine potency. Rapid onset, short context-sensitive half-time with small doses. Watch for respiratory depression and chest-wall rigidity with rapid high-dose IV push.', 4),
  ('10000000-0000-4000-8000-000000000001', 'Midazolam — class and main effects?', 'Benzodiazepine (GABA-A potentiation). Anxiolysis, anterograde amnesia, anticonvulsant. Synergistic respiratory depression with opioids. Reversed by flumazenil (rarely used).', 5),
  ('10000000-0000-4000-8000-000000000001', 'Ketamine — mechanism and why it is unique?', 'NMDA-receptor antagonist producing dissociative anesthesia. Provides analgesia, preserves airway reflexes and respiratory drive better than most agents, sympathomimetic (supports blood pressure). Emergence phenomena possible.', 6),
  ('10000000-0000-4000-8000-000000000001', 'Sevoflurane — what defines it among volatile agents?', 'Volatile halogenated ether. Non-pungent → agent of choice for inhalational induction (esp. pediatrics). Dose-dependent vasodilation and respiratory depression. MAC ~2% in adults (varies with age).', 7),
  ('10000000-0000-4000-8000-000000000001', 'Nitrous oxide — key properties and cautions?', 'Inhaled anesthetic adjunct; weak anesthetic (high MAC) but strong analgesic. Diffuses into air-filled spaces (avoid in bowel obstruction, pneumothorax, middle-ear surgery). Inhibits methionine synthase with prolonged exposure.', 8),
  ('10000000-0000-4000-8000-000000000001', 'Lidocaine — class and systemic toxicity concern?', 'Amide local anesthetic. Also IV for arrhythmias historically and as adjunct. Local anesthetic systemic toxicity (LAST): CNS excitation → seizures → cardiac collapse. Lipid emulsion 20% is the rescue therapy.', 9),
  ('10000000-0000-4000-8000-000000000001', 'Epinephrine — receptors and anesthesia uses?', 'Endogenous catecholamine; alpha and beta agonist. Used for anaphylaxis (first-line), cardiac arrest, and added to local anesthetics to prolong block and limit absorption.', 10),
  ('10000000-0000-4000-8000-000000000001', 'Ondansetron — class and use?', '5-HT3 antagonist antiemetic. Mainstay for PONV prophylaxis and treatment. QT prolongation caution — avoid stacking multiple QT-prolonging drugs.', 11),
  ('10000000-0000-4000-8000-000000000001', 'Neostigmine — what does it reverse and what must be co-administered?', 'Acetylcholinesterase inhibitor → increases ACh at the NMJ, reversing non-depolarizing block. Muscarinic effects (bradycardia, secretions) require co-administration of glycopyrrolate.', 12);

INSERT INTO cards (deck_id, front, back, position) VALUES
  ('10000000-0000-4000-8000-000000000002', 'Mallampati classification — what does it assess?', 'Visual assessment of oropharyngeal structures (I full view → IV only hard palate) used as one component of airway evaluation. Higher classes correlate with difficult laryngoscopy but never rule it in or out alone.', 1),
  ('10000000-0000-4000-8000-000000000002', 'ASA Physical Status classification — what does I vs IV mean?', 'ASA I: healthy patient. ASA II: mild systemic disease. ASA III: severe systemic disease (functional limitation). ASA IV: severe disease that is a constant threat to life. "E" suffix = emergency.', 2),
  ('10000000-0000-4000-8000-000000000002', 'MAC — definition?', 'Minimum Alveolar Concentration: alveolar concentration of a volatile anesthetic preventing movement in 50% of patients in response to surgical stimulus. Decreases with age, opioids, hypothermia; increases with chronic alcohol use, hyperthermia.', 3),
  ('10000000-0000-4000-8000-000000000002', 'Macintosh vs Miller blades — difference?', 'Macintosh (curved): tip placed in the vallecula, indirectly lifting the epiglottis. Miller (straight): tip lifts the epiglottis directly. Choice is patient- and provider-dependent.', 4),
  ('10000000-0000-4000-8000-000000000002', 'Rule of thumb for ETT depth in adults?', 'Commonly taught: ~20–22 cm at the teeth for women, ~22–24 cm for men. Always confirm with capnography, auscultation, and chest rise — depth marks are only a starting point.', 5),
  ('10000000-0000-4000-8000-000000000002', 'Capnography — what does the waveform confirm?', 'Continuous end-tidal CO2 waveform is the gold-standard confirmation of endotracheal intubation and ongoing ventilation. Sudden loss suggests disconnection/extubation; rising baseline suggests rebreathing; up-sloping plateau suggests obstruction.', 6),
  ('10000000-0000-4000-8000-000000000002', 'Preoxygenation — goal and standard approach?', 'Denitrogenate the lungs (replace nitrogen with oxygen) to extend the safe apnea window. Typically 3 minutes of 100% O2 via tight-fitting mask, or 8 vital-capacity breaths in time-pressured situations.', 7),
  ('10000000-0000-4000-8000-000000000002', 'Rapid sequence induction (RSI) — core concept?', 'Technique to minimize aspiration risk: preoxygenate, cricoid pressure (controversial, per local practice), rapid IV induction + fast-acting NMB (classically succinylcholine), no bag-mask ventilation, intubate promptly.', 8),
  ('10000000-0000-4000-8000-000000000002', 'Difficult airway cart — philosophy?', 'Standardized, immediately available backup equipment (video laryngoscope, supraglottic airways, bougie, surgical airway kit). Know your institution''s difficult airway algorithm BEFORE you need it.', 9),
  ('10000000-0000-4000-8000-000000000002', 'Standard fasting (NPO) guidance before elective anesthesia?', 'Commonly cited ASA guidance: clear liquids 2h, breast milk 4h, light meal 6h, fried/fatty meal 8h. Always follow current institutional policy.', 10);

-- ---------------------------------------------------------------------------
-- Original practice quiz (educational; not reproduced exam items)
INSERT INTO quizzes (id, title, description) VALUES
  ('20000000-0000-4000-8000-000000000001', 'SRNA Fundamentals Mini-Quiz',
   'Original practice questions covering foundational concepts. Educational only — not representative of any certification exam.');

INSERT INTO quiz_questions (quiz_id, prompt, options, correct_index, explanation, position) VALUES
  ('20000000-0000-4000-8000-000000000001', 'Which neuromuscular blocker can be directly reversed by sugammadex?',
   '["Succinylcholine", "Rocuronium", "Cisatracurium", "Pancuronium only after neostigmine"]', 1,
   'Sugammadex is a modified gamma-cyclodextrin that encapsulates aminosteroid NMBs — rocuronium most avidly, vecuronium to a lesser degree. It does not reverse benzylisoquinoliniums like cisatracurium or depolarizing blockers like succinylcholine.', 1),
  ('20000000-0000-4000-8000-000000000001', 'The gold-standard confirmation of endotracheal tube placement is:',
   '["Auscultation of bilateral breath sounds", "Chest rise with ventilation", "Continuous capnography waveform", "Pulse oximetry reading above 95%"]', 2,
   'Continuous waveform capnography confirming persistent exhaled CO2 is the gold standard. Auscultation and chest rise can mislead (esophageal intubation can produce misleading sounds), and SpO2 desaturates late.', 2),
  ('20000000-0000-4000-8000-000000000001', 'Succinylcholine is most dangerous in a patient with:',
   '["A history of smoking", "A major burn injury 3 weeks ago", "Mild seasonal allergies", "Well-controlled hypertension"]', 1,
   'Upregulation of extrajunctional acetylcholine receptors after burns, denervation, or prolonged immobility can cause massive potassium release and fatal hyperkalemia with succinylcholine.', 3),
  ('20000000-0000-4000-8000-000000000001', 'MAC of a volatile anesthetic is BEST described as the concentration that:',
   '["Produces amnesia in 95% of patients", "Prevents movement in 50% of patients in response to surgical stimulus", "Causes cardiovascular collapse in animal models", "Provides adequate analgesia for minor procedures"]', 1,
   'MAC is defined by movement response to a standard surgical stimulus in 50% of subjects. Note that MAC reflects immobility, not amnesia or analgesia.', 4),
  ('20000000-0000-4000-8000-000000000001', 'Which induction agent is associated with pain on injection and dose-dependent hypotension?',
   '["Ketamine", "Etomidate", "Propofol", "Midazolam"]', 2,
   'Propofol commonly causes pain on injection and vasodilation-mediated hypotension. Etomidate is hemodynamically neutral but suppresses adrenal steroid synthesis; ketamine typically supports blood pressure.', 5),
  ('20000000-0000-4000-8000-000000000001', 'Local anesthetic systemic toxicity (LAST) is treated first-line with:',
   '["IV calcium chloride", "20% lipid emulsion infusion", "High-dose vasopressin", "Procainamide infusion"]', 1,
   '20% lipid emulsion is the cornerstone of LAST rescue alongside standard resuscitation and seizure management. Avoid vasopressin, calcium channel blockers, and beta blockers per ASRA guidance.', 6),
  ('20000000-0000-4000-8000-000000000001', 'Nitrous oxide should be avoided in which situation?',
   '["Laparoscopic surgery", "Bowel obstruction", "Outpatient dental procedures", "Pediatric ear tube placement"]', 1,
   'Nitrous oxide diffuses into air-filled body cavities faster than nitrogen leaves, expanding gas volumes — dangerous in bowel obstruction, pneumothorax, and middle-ear surgery.', 7),
  ('20000000-0000-4000-8000-000000000001', 'An ASA III physical status describes a patient with:',
   '["No systemic disease", "Mild systemic disease", "Severe systemic disease with functional limitation", "A moribund condition"]', 2,
   'ASA I = healthy, II = mild systemic disease, III = severe systemic disease with substantive functional limitation, IV = constant threat to life, V = moribund.', 8);

-- ---------------------------------------------------------------------------
-- Calculators (metadata + governance; computation is client-side)
INSERT INTO calculators (slug, name, description, formula, source, version, reviewed_by, review_date) VALUES
  ('ibw', 'Ideal Body Weight (Devine)',
   'Estimates ideal body weight from height and sex using the Devine formula. Commonly used as a reference weight in pharmacology teaching.',
   'Men: IBW(kg) = 50 + 2.3 × (height in inches − 60). Women: IBW(kg) = 45.5 + 2.3 × (height in inches − 60).',
   'Devine BJ. Gentamicin therapy. Drug Intell Clin Pharm. 1974;8:650–655.', '1.0.0', 'M. Chen, CRNA', '2026-10-01'),
  ('dosing-weight', 'Dosing (Adjusted) Body Weight',
   'Adjusted body weight for obese patients, a common teaching convention for hydrophilic drug dosing discussions. If actual weight ≤ 1.3 × IBW, actual weight is used.',
   'If ABW ≤ 1.3 × IBW → ABW. Otherwise: Dosing weight = IBW + 0.4 × (ABW − IBW).',
   'Standard pharmacokinetic teaching convention (correction factor 0.4). Verify against institutional protocol.', '1.0.0', 'M. Chen, CRNA', '2026-10-01'),
  ('bsa', 'Body Surface Area (Mosteller)',
   'Estimates body surface area from height and weight. Used in teaching contexts for indexed dosing discussions.',
   'BSA(m²) = √( height(cm) × weight(kg) / 3600 )',
   'Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317:1098.', '1.0.0', 'M. Chen, CRNA', '2026-10-01');

-- ---------------------------------------------------------------------------
-- Community: groups, memberships, messages
INSERT INTO groups (id, name, description, kind, category, created_by) VALUES
  ('30000000-0000-4000-8000-000000000001', '2027 Applicants', 'Peer support for everyone applying in the 2027 cycle — timelines, interviews, and commiseration.', 'public', 'application-cycle', '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', 'Pharm Study Group', 'Weekly pharmacology study sessions. We pick a drug class each week and quiz each other.', 'public', 'study', '00000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000003', 'CRNA Mentors', 'Practicing CRNAs offering shadowing advice, interview prep, and career guidance.', 'invite', 'mentorship', '00000000-0000-4000-8000-000000000003');

INSERT INTO group_members (group_id, user_id, role) VALUES
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'admin'),
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'member'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'admin'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'member'),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'admin');

INSERT INTO messages (group_id, user_id, body, pinned, created_at) VALUES
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Welcome! Introduce yourself with your ICU background and target schools.', true, now() - interval '2 days'),
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '3 years CVICU here. Targeting Duke and VCU. Anyone else applying to NC programs?', false, now() - interval '2 days'),
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'CRNA here — happy to answer interview questions. Biggest tip: know your ICU drugs cold.', false, now() - interval '1 day'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'This week: induction agents. Bring your hardest propofol vs etomidate questions.', true, now() - interval '1 day'),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Joining as an applicant to get a head start. Is the hemodynamics comparison a good first topic?', false, now() - interval '12 hours'),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'Mentorship requests: post your background and what you are looking for. This group is invite-only.', true, now() - interval '3 days');

-- ---------------------------------------------------------------------------
-- Discussion board
INSERT INTO posts (id, user_id, category, title, body, is_anonymous, created_at) VALUES
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'admissions',
   'GPA 3.4 with 2 years CVICU — how competitive am I really?',
   'Looking for honest feedback. Science GPA is stronger than cumulative, CCRN done, GRE scheduled. What made the difference for those who got in with similar stats?', false, now() - interval '3 days'),
  ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'admissions',
   'Interview invite timelines for this cycle?',
   'Submitted mid-September to three programs. When did invites start landing for you all? Trying to plan PTO.', true, now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'study',
   'How I structure pharm study around clinical days',
   'Long clinical days kill my study motivation. What finally worked: 20 minutes of flashcards on the commute, one drug class per week, and teaching it back to my study group. What works for you?', false, now() - interval '1 day'),
  ('40000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'study',
   'Best way to learn the anesthesia machine check?',
   'Our program expects a fluent machine check by week 3. Any mnemonics or structured approaches that helped you?', true, now() - interval '20 hours'),
  ('40000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003', 'practice',
   'First solo cases — how did you handle the nerves?',
   'New CRNA, first month practicing independently. The knowledge is there but the adrenaline before solo inductions is real. Does it fade?', false, now() - interval '15 hours'),
  ('40000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000003', 'networking',
   'Study group forming — pharmacology, weekly',
   'The Pharm Study Group is open to new members. We meet weekly and work through one drug class at a time. All levels welcome — applicants included.', false, now() - interval '8 hours');

INSERT INTO comments (post_id, user_id, parent_id, body, helpful_count, created_at) VALUES
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', NULL,
   'Stats get you the interview; your ICU stories get you the seat. Be ready to discuss your sickest patient and exactly what you did. CCRN + strong science GPA is a solid foundation.', 4, now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', NULL,
   'Agree with above. Also: apply broadly your first cycle. I had similar stats and got interviews at 4 of 8 programs.', 2, now() - interval '2 days'),
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   (SELECT id FROM comments WHERE post_id = '40000000-0000-4000-8000-000000000001' ORDER BY created_at LIMIT 1),
   'This is exactly what I needed to hear. Working on my patient stories document now.', 1, now() - interval '1 day'),
  ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', NULL,
   'From my cycle: early submitters heard back in 4–8 weeks. Some programs review monthly, others wait until the deadline. Check each program''s portal weekly.', 3, now() - interval '1 day'),
  ('40000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', NULL,
   'The commute flashcard trick is underrated. I do the same with airway algorithms.', 2, now() - interval '12 hours'),
  ('40000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', NULL,
   'Current SRNA watching this thread — thank you for posting. It helps to know the nerves are normal.', 1, now() - interval '10 hours'),
  ('40000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000003', NULL,
   'It fades. What helped me: a personal pre-induction checklist for the first 6 months, and debriefing one case per week with a colleague. The vigilance stays, the adrenaline quiets.', 5, now() - interval '9 hours');

-- ---------------------------------------------------------------------------
-- Demo user state: tracker, bookmarks, events
INSERT INTO applications (user_id, program_id, status, deadline, notes) VALUES
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM programs WHERE name LIKE 'Duke%'), 'preparing', '2026-08-01', 'Need one more recommendation letter. Personal statement draft due to mentor by Nov 1.'),
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM programs WHERE name LIKE 'Virginia Commonwealth%'), 'researching', '2026-07-15', 'Strong ICU preference noted on site. Verify GRE requirement.'),
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM programs WHERE name LIKE 'Wake Forest%'), 'researching', '2026-07-01', NULL);

INSERT INTO bookmarks (user_id, resource_id) VALUES
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM resources WHERE title LIKE 'DailyMed%')),
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM resources WHERE title LIKE 'COA CRNA School Search%')),
  ('00000000-0000-4000-8000-000000000002', (SELECT id FROM resources WHERE title LIKE 'OpenAnesthesia%'));

INSERT INTO resource_views (user_id, resource_id, viewed_at) VALUES
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM resources WHERE title LIKE 'DailyMed%'), now() - interval '2 hours'),
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM resources WHERE title LIKE 'COA CRNA School Search%'), now() - interval '1 hour'),
  ('00000000-0000-4000-8000-000000000001', (SELECT id FROM resources WHERE title LIKE 'NBCRNA SEE%'), now() - interval '30 minutes');

INSERT INTO deck_saves (user_id, deck_id) VALUES
  ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002');

INSERT INTO quiz_attempts (user_id, quiz_id, score, total) VALUES
  ('00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 7, 8);

INSERT INTO events (user_id, group_id, title, category, starts_at, ends_at, notes) VALUES
  ('00000000-0000-4000-8000-000000000002', NULL, 'Clinical rotation — Main OR', 'clinical', now() + interval '1 day', now() + interval '1 day 8 hours', 'Bring airway algorithms sheet.'),
  ('00000000-0000-4000-8000-000000000002', NULL, 'Pharmacology exam', 'exam', now() + interval '4 days', now() + interval '4 days 2 hours', 'Induction agents + NMBs.'),
  ('00000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Pharm study group session', 'study', now() + interval '2 days', now() + interval '2 days 2 hours', 'Topic: induction agents.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'Duke info session (virtual)', 'interview', now() + interval '5 days', now() + interval '5 days 1 hour', 'Link in email. Prepare 3 questions.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'VCU application deadline', 'deadline', '2026-07-15', NULL, 'Submit via program portal.'),
  ('00000000-0000-4000-8000-000000000001', NULL, 'ICU shift', 'shift', now() + interval '1 day', now() + interval '1 day 12 hours', NULL);
