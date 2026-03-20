/* ===================================================================
   glossary.js  –  Pathway Analyzer Glossary
   Comprehensive abbreviation / acronym reference for zoning pathway
   analysis across Denver, Colorado Springs (COS), and El Paso County
   (EPC), Colorado.
   =================================================================== */

const GLOSSARY = {

  /* ---- Facility / Use Classifications ---- */
  "RC":    { term: "Residential Care",
             def: "Denver zoning use category for facilities providing residential care services, including assisted living, nursing homes, and community corrections. Regulated under DZC Article 11.",
             jur: "denver" },

  "GLR":   { term: "Group Living Residential",
             def: "Colorado Springs use classification for residential facilities where unrelated individuals live together with shared services, supervision, or care. Governed by UDC Article 7.",
             jur: "cos" },

  "HSE":   { term: "Human Services Establishment",
             def: "Colorado Springs use classification covering facilities that provide human services such as counseling, treatment, or rehabilitation on an outpatient or drop-in basis.",
             jur: "cos" },

  "GH":    { term: "Group Home",
             def: "El Paso County use classification for a dwelling shared by unrelated individuals who live together as a functional family, often with on-site supervision or support services.",
             jur: "epc" },

  /* ---- Zone District Abbreviations (Denver) ---- */
  "SU (zone)": { term: "Single-Unit (Zone District)",
                 def: "Denver zone-district prefix indicating a single-unit residential area (e.g., SU-A, SU-B). Permits one primary dwelling unit per lot.",
                 jur: "denver" },

  "TU":    { term: "Two-Unit (Zone District)",
             def: "Denver zone-district prefix indicating a two-unit residential area (e.g., TU-A, TU-B). Permits up to two primary dwelling units per lot.",
             jur: "denver" },

  "RH":    { term: "Row House (Zone District)",
             def: "Denver zone-district prefix for row-house residential areas allowing attached single-unit dwellings in a row configuration.",
             jur: "denver" },

  "MU":    { term: "Mixed-Use (Zone District)",
             def: "Denver zone-district prefix for areas allowing a blend of residential and commercial uses, typically along corridors and in urban centers.",
             jur: "denver" },

  /* ---- Permit / Approval Types ---- */
  "SU (permit)": { term: "Special Use (Permit)",
                   def: "El Paso County approval process for land uses that are not permitted by right but may be authorized in a zone district subject to conditions imposed by the Board of County Commissioners.",
                   jur: "epc" },

  "CUP":   { term: "Conditional Use Permit",
              def: "A discretionary approval allowing a use not otherwise permitted by right in a given zone district, subject to conditions designed to mitigate impacts. Used in Colorado Springs (UDC) and referenced in general zoning practice.",
              jur: "cos" },

  "ZPCIM": { term: "Zoning Permit with Community Information Meeting",
             def: "Denver permit process requiring a neighborhood information meeting before a zoning permit is issued. Designed to inform nearby residents and gather input without a formal public hearing.",
             jur: "denver" },

  "ZRAP":  { term: "Zoning Review with Administrative Process",
             def: "Denver administrative review process for certain zoning approvals that do not require a full public hearing but involve staff-level review against established criteria.",
             jur: "denver" },

  "SDP":   { term: "Site Development Plan",
             def: "A detailed plan submitted for review showing the layout, grading, utilities, access, landscaping, and other physical characteristics of a proposed development.",
             jur: "all" },

  /* ---- Policy & Enforcement ---- */
  "SP-05": { term: "SP-05 Enforcement Policy",
             def: "El Paso County enforcement policy governing group living and residential care uses, addressing compliance, complaints, and operational standards.",
             jur: "epc" },

  "NP":    { term: "Not Permitted",
             def: "Table value indicating that a particular use is not allowed in the specified zone district under any permit or approval pathway.",
             jur: "all" },

  /* ---- Federal & State Law ---- */
  "FHA":   { term: "Fair Housing Act",
             def: "Federal law (Title VIII of the Civil Rights Act of 1968) prohibiting discrimination in housing based on race, color, national origin, religion, sex, familial status, and disability.",
             jur: "all" },

  "FHAA":  { term: "Fair Housing Amendments Act",
             def: "1988 amendments to the Fair Housing Act that added disability and familial status as protected classes and established reasonable-accommodation requirements for persons with disabilities.",
             jur: "all" },

  "C.R.S.": { term: "Colorado Revised Statutes",
              def: "The codified body of statutory law for the State of Colorado. Key sections for this application include Title 25 (health), Title 25.5 (behavioral health), Title 27 (behavioral health administration), and Title 30 (county powers).",
              jur: "all" },

  /* ---- State Agencies & Organizations ---- */
  "CDPHE": { term: "Colorado Department of Public Health and Environment",
             def: "State agency responsible for licensing assisted living residences, health facilities, and overseeing public-health standards that affect residential care facilities.",
             jur: "all" },

  "BHA":   { term: "Behavioral Health Administration",
             def: "Colorado state agency (within CDPHE / HCPF framework) that oversees behavioral health services, licensing, and program standards across the state.",
             jur: "all" },

  "CARR":  { term: "Colorado Association of Recovery Residences",
             def: "Statewide affiliate of the National Alliance for Recovery Residences (NARR) that certifies sober-living and recovery housing against quality standards.",
             jur: "all" },

  /* ---- Local Agencies & Bodies ---- */
  "PCD":   { term: "Planning and Community Development",
             def: "El Paso County department responsible for land-use planning, zoning administration, and development review.",
             jur: "epc" },

  "BoCC":  { term: "Board of County Commissioners",
             def: "El Paso County's elected governing body with authority over Special Use approvals, land-use regulations, and county policy.",
             jur: "epc" },

  /* ---- Zoning Codes ---- */
  "DZC":   { term: "Denver Zoning Code",
             def: "The City and County of Denver's comprehensive zoning ordinance adopted in 2010, organized into 13 articles covering zone districts, use regulations, and development standards.",
             jur: "denver" },

  "UDC":   { term: "Unified Development Code",
             def: "Colorado Springs' consolidated land-use code combining zoning, subdivision, and development standards into a single regulatory document.",
             jur: "cos" },

  "LDC":   { term: "Land Development Code",
             def: "El Paso County's regulatory code governing zoning, subdivision, and land-development standards in unincorporated areas.",
             jur: "epc" },

  /* ---- Overlay & Special Districts ---- */
  "CAD-O": { term: "Colorado Aviation District Overlay",
             def: "El Paso County overlay zone around military and civilian airfields that imposes height, noise, and land-use restrictions to protect aviation operations and public safety.",
             jur: "epc" },

  "NNA-O": { term: "Neighborhoods and Neighborhood Areas Overlay",
             def: "Colorado Springs overlay district that applies supplemental design, use, or dimensional standards to specific neighborhood areas.",
             jur: "cos" },

  "FBZ":   { term: "Form-Based Zone",
             def: "Colorado Springs zone-district type that regulates development primarily by building form (setbacks, height, frontage) rather than by separating land uses.",
             jur: "cos" },

  "PDZ":   { term: "Planned Development Zone",
             def: "Colorado Springs zone-district type allowing customized development standards through an approved development plan, in lieu of standard zone-district regulations.",
             jur: "cos" },

  "PUD":   { term: "Planned Unit Development",
             def: "El Paso County zoning designation that permits flexible site design and mixed uses under an approved master plan, often with negotiated development standards.",
             jur: "epc" },

  "APZ":   { term: "Accident Potential Zone",
             def: "Areas near military airfields (typically designated APZ I and APZ II) where the statistical probability of aircraft accidents is elevated, triggering land-use restrictions.",
             jur: "epc" },

  /* ---- Licensing & Facility Types ---- */
  "ALR":   { term: "Assisted Living Residence",
             def: "A CDPHE-licensed facility providing room, board, and personal-care services to residents who need assistance with activities of daily living but do not require continuous skilled nursing.",
             jur: "all" },

  "LTC":   { term: "Long-Term Care",
             def: "A broad category of health and personal-care services for individuals who need ongoing assistance over an extended period, including nursing facilities and assisted living.",
             jur: "all" },

  /* ---- Treatment & Clinical Terms ---- */
  "SUD":   { term: "Substance Use Disorder",
             def: "A clinical diagnosis (DSM-5) involving a problematic pattern of substance use leading to significant impairment or distress. Relevant to zoning because many residential care facilities serve individuals with SUDs.",
             jur: "all" },

  "MAT":   { term: "Medication-Assisted Treatment",
             def: "The use of FDA-approved medications (e.g., methadone, buprenorphine, naltrexone) in combination with counseling and behavioral therapies to treat substance use disorders.",
             jur: "all" },

  "IOP":   { term: "Intensive Outpatient Program",
             def: "A structured behavioral-health treatment program that provides several hours of therapy per week without requiring 24-hour residential placement.",
             jur: "all" },

  "DD":    { term: "Developmentally Disabled",
             def: "Refers to individuals with chronic conditions originating before adulthood that significantly limit major life activities; relevant to group-home and residential-care facility siting regulations.",
             jur: "all" },

  "IDD":   { term: "Intellectual/Developmental Disability",
             def: "A category encompassing intellectual disability and related developmental conditions. IDD group homes are often explicitly protected under fair-housing and state-licensing frameworks.",
             jur: "all" },

  "NGRI":  { term: "Not Guilty by Reason of Insanity",
             def: "A legal finding that a defendant lacked the mental capacity to form criminal intent. NGRI individuals may be placed in residential treatment facilities, which can trigger specific zoning considerations.",
             jur: "all" },

  /* ---- Technology & Infrastructure ---- */
  "ArcGIS": { term: "ArcGIS (Geographic Information System)",
              def: "Esri's geospatial platform used by Denver, Colorado Springs, and El Paso County to publish zoning maps, parcel data, and overlay boundaries. The Pathway Analyzer queries ArcGIS REST services for parcel lookups.",
              jur: "all" },

  "IBC":   { term: "International Building Code",
             def: "A model building code adopted (with local amendments) by Colorado jurisdictions. Occupancy classifications in the IBC (e.g., R-4 for assisted living) interact with zoning use categories.",
             jur: "all" },

  "OWTS":  { term: "Onsite Wastewater Treatment System",
             def: "A septic or other self-contained wastewater system used where municipal sewer is unavailable. OWTS capacity can limit the number of residents in a group-home or care facility, especially in El Paso County.",
             jur: "epc" },

  /* ---- Advocacy & Social Terms ---- */
  "NIMBY": { term: "Not In My Back Yard",
             def: "A colloquial term describing community opposition to the siting of certain land uses (such as group homes or treatment facilities) near existing residences, often in tension with fair-housing protections.",
             jur: "all" }
};
