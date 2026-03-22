/* ═══════════════════════════════════════════════════════════════════
   MANITOU SPRINGS RULE ENGINE
   Governing Code: LUDC Title 18 (Ord. No. 2322, Jan. 3, 2023; amended
                   through Ord. No. 2225, Oct. 21, 2025)
   Dependencies: config.js (MAN_UT, MAN_ZL, manIsRes, manIsComm,
                 manIsPublic, manTitle15Cap)
   ═══════════════════════════════════════════════════════════════════ */

function runManitouEngine(f){
  const z=f.zone;
  if(!z)return{error:"No zone district selected."};
  if(manIsPublic(z))return{error:z+" is a Public/Open Space zone district. No behavioral health, group living, or medical use types are permitted in OS, P, or PF zones under Table 18.04.2.5-1."};
  const ut=MAN_UT[z];if(!ut)return{error:"Zone '"+z+"' not found in Manitou Springs Use Table."};
  const allN=Object.values(ut).every(v=>v==="N");
  if(allN)return{error:"No target use types are permitted in "+z+"."};

  // ── Extract form values ──────────────────────────────────────
  const treat=f.manOnSiteTreatment;     // yes/no/unknown
  const pop=f.manPopulationType;         // disability/elderly/behavioral/general/unknown
  const overnight=f.manOvernightBeds;    // yes/no
  const medCare=f.manProvidesMedCare;    // yes/no/unknown
  const persCare=f.manProvidesPersonalCare; // yes/no/unknown
  const nursing=f.manFullTimeNursing;    // yes/no/unknown
  const preexist=f.manPreexistingUse;    // yes/no/unknown
  const monthsDisc=f.manMonthsDiscontinued;
  const expansion=f.manProposedExpansion; // yes/no
  const hazard=f.manNaturalHazard;       // yes/no/unknown
  const historic=f.manHistoricDistrict;  // yes/no/unknown
  const scope=f.manConstructionScope;    // none/minor/major
  const duSqft=f.manDwellingUnitSqft;
  const exRC=f.existingRC,mnt=f.maintained;

  const R=[],gS=[],gC=[];

  // ──── PASS 2: Global rules ────────────────────────────────────

  // G-13: Title 15 dwelling unit occupancy cap (auto-calculated from assessor sqft)
  const t15Cap=manTitle15Cap(duSqft);
  const t15Caveat=(duSqft&&duSqft>0)?{msg:"Title 15 § 15.08.120 limits this "+duSqft+" sf dwelling unit to approximately "+t15Cap+" persons. Applicability to group homes is interpretive (see Unknown #14). Square footage source: El Paso County Assessor (proxy for IBC gross floor area — verify for precision).",cite:"Title 15 § 15.08.120",blocking:false}
    :{msg:"Building square footage not available from assessor records — Title 15 § 15.08.120 occupancy cap cannot be calculated. This cap can constrain bed count below the zoning limit. Obtain actual gross floor area and apply the Title 15 graduated occupancy table.",cite:"Title 15 § 15.08.120",blocking:false};

  // G-10: Commercial zone noise standard
  if(z==="C"||z==="MUC")gC.push({msg:"Commercial zone — noise standard per Ord. No. 2817 applies.",cite:"§ 18.04.14.4(B)(2)",blocking:false});

  // G-11: MUC zone URA routing
  if(z==="MUC")gC.push({msg:"MUC zone — all applications routed through Urban Renewal Authority for review and Development Standard Incentive Award eligibility determination.",cite:"§ 18.02.3.3(C)(1)",blocking:false});

  // Historic district — procedural overlay (MCAC for exterior changes)
  if(historic==="yes")gC.push({msg:"Property is within the Historic District — Material Change of Appearance Certificate (MCAC) review required for any exterior modifications. This is a procedural requirement, not a use-eligibility gate.",cite:"Title 17, § 17.04.030",blocking:false});
  else if(historic==="unknown")gC.push({msg:"Historic District status unknown — verify whether property is within the Manitou Springs Historic District. MCAC review applies to exterior modifications.",cite:"Title 17, § 17.04.030",blocking:false,resolve:"Check City Historic District Map or contact Planning Dept."});

  // SP-03: Variance cannot authorize prohibited use (structural — applied per-pathway)
  // No codified reasonable accommodation procedure
  gC.push({msg:"Manitou Springs LUDC does not include a codified reasonable accommodation process. Federal and state fair housing protections (FHA, C.R.S. § 31-23-303) apply independently.",cite:"C.R.S. § 31-23-303",blocking:false});

  // No global hard stops in Manitou — proceed to pathways

  // ──── Workflow templates ─────────────────────────────────────
  const WF_P_NONE=[{t:"Confirm zoning compliance with Planning Department"},{t:"Obtain business license"},{t:"Begin operations"}];
  const WF_P_SITE=[{t:"Pre-application meeting (recommended)"},{t:"Submit Minor Site Plan ($160 res / $220 comm)"},{t:"Staff review (2–6 weeks)"},{t:"Obtain business license"},{t:"Begin operations"}];
  const WF_P_MNR=[{t:"Pre-application meeting"},{t:"Submit Minor Development Plan ($600–$700 + $950 deposit)"},{t:"Planning Commission hearing"},{t:"Obtain building permit"},{t:"Begin operations"}];
  const WF_P_MJR=[{t:"Pre-application meeting"},{t:"Submit Major Development Plan ($1,200–$1,450 + $1,000 deposit)"},{t:"Planning Commission hearing → recommendation"},{t:"City Council hearing → decision"},{t:"Obtain building permit"},{t:"Begin operations"}];
  const WF_CUP=[{t:"Pre-application meeting"},{t:"Submit Conditional Use Permit application ($1,090)"},{t:"Public notice: sign on property + mail to owners within 300 ft"},{t:"Planning Commission public hearing → recommendation"},{t:"City Council public hearing → decision"},{t:"Submit development plan if construction required"},{t:"Obtain building permit and business license"},{t:"Begin operations"}];
  const WF_NC=[{t:"Confirm legally established status with Planning Department"},{t:"File deemed-CUP documentation if applicable (§ 18.01.7.1(A)(1))"},{t:"Continue operations within existing scope"}];

  // ──── Development plan helper ────────────────────────────────
  function devPlanCav(pw){
    if(scope==="major"){
      pw.cav.push({msg:"Major construction scope — Major Development Plan (MJR) required. Fee: $1,200–$1,450 + $1,000 deposit. Planning Commission + City Council review.",cite:"§ 18.06.4.13",blocking:false});
    } else if(scope==="minor"){
      pw.cav.push({msg:"Minor construction scope — Minor Development Plan (MNR) required. Fee: $600–$700 + $950 deposit. Planning Commission review.",cite:"§ 18.06.4.12",blocking:false});
    } else if(scope==="none"){
      pw.cav.push({msg:"No construction — change of use within same use category is exempt from development plan requirement (§ 18.06.4.12(C)).",cite:"§ 18.06.4.12(C)",blocking:false});
    }
  }

  // ──── CUP-specific caveats ───────────────────────────────────
  function cupCavs(pw){
    // G-07: CUP expiration
    pw.cav.push({msg:"CUP expires 12 months from approval if no action taken (building permit, business license, or use commenced). One 6-month extension for good cause.",cite:"§ 18.06.4.4(F)(1)",blocking:false});
    // G-08: CUP discontinuance
    pw.cav.push({msg:"CUP expires if use discontinued for 12 continuous months. One 6-month extension if no major site changes.",cite:"§ 18.06.4.4(F)(2)",blocking:false});
    // G-12: Natural hazard
    if(hazard==="yes"){
      pw.stops.push({msg:"Conditional uses not allowed on properties subject to natural hazards unless adequate mitigation provided per § 18.03.10.",cite:"§ 18.06.4.4(C)(4)"});
    } else if(hazard==="unknown"){
      pw.cav.push({msg:"Natural hazard status unknown — CUP cannot be approved on hazard-prone property without adequate mitigation. Manitou Springs has significant flood, wildfire, and geological hazard exposure.",cite:"§ 18.06.4.4(C)(4)",blocking:true,resolve:"Check FEMA NFHL, CGS hazard maps, and WUI risk map."});
    }
  }

  // ──── Title 15 cap — constrain controlling max per pathway ───
  function t15Cav(pw){
    pw.cav.push(t15Caveat);
    // If Title 15 cap is calculable and positive, constrain the pathway's max bed count
    if(t15Cap!==null&&t15Cap>0&&pw.mg!==null&&pw.mg!==0){
      if(t15Cap<pw.mg){
        pw.mg=t15Cap;
        pw.cav.push({msg:"Title 15 cap ("+t15Cap+" persons for "+duSqft+" sf) is more restrictive than the zoning maximum. Controlling max bed count reduced to "+t15Cap+".",cite:"Title 15 § 15.08.120",blocking:false});
      }
    }
  }

  // ──── PASS 3: Pathway tester ─────────────────────────────────

  function tP(id,nm,th,utKey,maxOcc,fn){
    const perm=ut[utKey];
    if(perm==="N"){
      R.push({id,nm,th,v:"no",mg:null,stops:[{msg:"Not permitted in "+z,cite:"Table 18.04.2.5-1"}],cav:[],proc:"N/A",rat:"Use not listed in "+z+" zone district. Variance cannot authorize a prohibited use (§ 18.06.4.2(G)).",wf:[],rsk:{},rank:"Not viable"});
      return;
    }
    const pw={id,nm,th,v:"yes",mg:maxOcc,stops:[],cav:[...gC],proc:perm==="P"?"Permitted (P)":"Conditional Use (C)",rat:"",wf:[],rsk:{},rank:""};
    fn(pw,perm);
    if(pw.stops.length)pw.v="no";
    else if(pw.cav.some(c=>c.blocking))pw.v="conditional";
    R.push(pw);
  }

  // ──── 1. GROUP HOME, SMALL (≤ 8 persons) ────────────────────
  tP("GH-SM","Group Home, Small","≤ 8 persons; no on-site treatment; FHA-protected population","ghSmall",8,(pw,perm)=>{
    // G-01: No on-site medical/psychological treatment
    if(treat==="yes"){
      pw.stops.push({msg:"On-site medical or psychological treatment is provided — cannot classify as Group Home, Small. Physical assistance with daily living is permitted, but treatment is not.",cite:"§ 18.04.4.4(A)"});
      return;
    }
    if(treat==="unknown")pw.cav.push({msg:"Classification depends on whether on-site medical or psychological treatment is provided. If treatment is provided, Group Home Small is not available — reclassify to Group Home Large, LTC, or Medical Care Facility.",cite:"§ 18.04.4.4(A)",blocking:true,resolve:"Determine whether clinical treatment will be provided on-site."});

    // G-02: FHA-protected population
    if(pop==="general")pw.cav.push({msg:"Group Home classification requires FHA-protected population within C.R.S. § 31-23-303 scope (developmentally disabled, aged 60+, behavioral/mental health disorders). General population may not qualify.",cite:"Table 18.04.2.5-1, footnote 1",blocking:true,resolve:"Confirm population meets FHA-protected definition."});
    else if(pop==="unknown")pw.cav.push({msg:"Population type unknown — Group Home requires FHA-protected population per C.R.S. § 31-23-303.",cite:"Table 18.04.2.5-1, footnote 1",blocking:true,resolve:"Identify target population."});
    else pw.cav.push({msg:"BH/SUD population qualifies as FHA-protected under C.R.S. § 31-23-303 — persons with behavioral or mental health disorders are explicitly included.",cite:"C.R.S. § 31-23-303",blocking:false});

    // Title 15 cap
    t15Cav(pw);

    // By-right in all listed zones (no C status for GH-SM)
    pw.proc="Permitted (P) — by-right";
    pw.rat="Group Home, Small in "+z+". Permitted by-right in all residential and commercial/mixed-use zones. No CUP required. No spacing or separation rules.";
    devPlanCav(pw);
    pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_NONE];
    pw.rsk=scope==="major"?{nimby:"Low",escalation:"Low",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires Planning Commission + City Council hearings",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000 deposit (MJR)"}
      :scope==="minor"?{nimby:"Very low",escalation:"None",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires Planning Commission review",approval:"Low",fee:"$600–$700 + $950 deposit (MNR)"}
      :{nimby:"Very low",escalation:"None",timeline:"0 days (use) + business license",discretion:"None (by-right, no construction review)",approval:"Very low",fee:"$0 (use only)"};
    pw.rank=scope==="major"?"Moderate":scope==="minor"?"Good":"Easiest";

    // Parking note
    pw.cav.push({msg:"Parking: 2 spaces per dwelling unit (Table 18.03.8.3-1). 'Per dwelling unit' interpretation for group homes is ambiguous — likely means 2 spaces per group home building.",cite:"Table 18.03.8.3-1",blocking:false});
  });

  // ──── 2. GROUP HOME, LARGE (> 8 persons) ────────────────────
  tP("GH-LG","Group Home, Large","> 8 persons; includes secure residential treatment centers","ghLarge",999,(pw,perm)=>{
    // G-02: FHA-protected population
    if(pop==="general")pw.cav.push({msg:"Group Home classification requires FHA-protected population per C.R.S. § 31-23-303. General population may not qualify.",cite:"Table 18.04.2.5-1, footnote 1",blocking:true,resolve:"Confirm population meets FHA-protected definition."});
    else if(pop==="unknown")pw.cav.push({msg:"Population type unknown — Group Home requires FHA-protected population per C.R.S. § 31-23-303.",cite:"Table 18.04.2.5-1, footnote 1",blocking:true,resolve:"Identify target population."});
    else pw.cav.push({msg:"BH/SUD population qualifies as FHA-protected under C.R.S. § 31-23-303.",cite:"C.R.S. § 31-23-303",blocking:false});

    // Classification note: GH-LG includes treatment
    pw.cav.push({msg:"Group Home Large definition includes 'secure residential treatment center' (§ 18.04.4.3(A)(1)). On-site treatment is permitted under this classification.",cite:"§ 18.04.4.3",blocking:false});

    // Unknown #1: GH-LG vs Medical Care Facility boundary
    if(medCare==="yes")pw.cav.push({msg:"Facility provides medical care — boundary between Group Home Large and Medical Care Facility is interpretive. If medical/surgical/nursing services are the primary function, Medical Care Facility (§ 18.04.16.3) may be the required classification. Zone eligibility differs significantly.",cite:"§ 18.04.2.3",blocking:true,resolve:"Request Planning Director interpretation per § 18.04.2.3."});

    // Title 15 cap
    t15Cav(pw);

    if(perm==="P"){
      pw.rat="Group Home, Large in "+z+". Permitted by-right. No CUP. No spacing rules.";
      pw.proc="Permitted (P) — by-right";
      devPlanCav(pw);
      pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_NONE];
      pw.rsk=scope==="major"?{nimby:"Low–Medium",escalation:"Low",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires PC + CC hearings",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000"}
        :scope==="minor"?{nimby:"Low",escalation:"Low",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires PC review",approval:"Low",fee:"$600–$700 + $950"}
        :{nimby:"Low",escalation:"None",timeline:"0 days",discretion:"None (by-right, no construction review)",approval:"Low",fee:"$0"};
      pw.rank=scope==="major"?"Moderate":"Good";
    } else {
      // C status — CUP required
      pw.rat="Group Home, Large in "+z+". Conditional Use Permit required — Planning Commission recommendation then City Council decision. 6 CUP criteria (§ 18.06.4.4(C)) apply.";
      pw.proc="Conditional Use (C) — CUP required";
      cupCavs(pw);
      devPlanCav(pw);
      pw.wf=[...WF_CUP];
      pw.rsk={nimby:"Medium–High",escalation:"Medium",timeline:"3–6 months",discretion:"Significant (6 CUP criteria)",approval:"Medium",fee:"$1,090 (CUP) + dev plan fees"};
      pw.rank="Moderate";
    }

    // Parking note
    pw.cav.push({msg:"Parking: 2 spaces per dwelling unit (Table 18.03.8.3-1). Interpretation ambiguous for group homes.",cite:"Table 18.03.8.3-1",blocking:false});
  });

  // ──── 3. LONG-TERM CARE FACILITY ────────────────────────────
  tP("LTC","Long-Term Care Facility","Full-time nursing; persons unable to live independently","ltc",999,(pw,perm)=>{
    // Requires full-time nursing
    if(nursing==="no")pw.cav.push({msg:"LTC requires full-time nursing assistance for persons who cannot live independently. If nursing is not full-time, consider Group Home Large or Medical Care Facility.",cite:"§ 18.04.4.2",blocking:true,resolve:"Confirm operational model includes full-time nursing."});
    else if(nursing==="unknown")pw.cav.push({msg:"Full-time nursing status unknown — LTC classification requires full-time nursing for persons unable to live independently.",cite:"§ 18.04.4.2",blocking:true,resolve:"Determine nursing staffing model."});

    // Title 15 cap
    t15Cav(pw);

    // All LTC zones are P — no CUP needed
    pw.proc="Permitted (P) — by-right";
    pw.rat="Long-Term Care Facility in "+z+". Permitted by-right in HDR, C, and MUC. Full-time nursing required.";
    devPlanCav(pw);
    pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_SITE];
    pw.rsk=scope==="major"?{nimby:"Low–Medium",escalation:"Low",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires PC + CC hearings",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000"}
      :scope==="minor"?{nimby:"Low",escalation:"Low",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires PC review",approval:"Low",fee:"$600–$700 + $950"}
      :{nimby:"Low",escalation:"Low",timeline:"2–6 weeks",discretion:"None (by-right, staff review only)",approval:"Low",fee:"$160–$220"};
    pw.rank=scope==="major"?"Moderate":"Good";

    // Parking note
    pw.cav.push({msg:"Parking: unlisted — Planning Director determination per § 18.03.8.3(D). Likely analogous to Group Homes (2/unit) or Institutional (1/400 sf GFA).",cite:"§ 18.03.8.3(D)",blocking:false});
  });

  // ──── 4. CONTINUING CARE RETIREMENT COMMUNITY ───────────────
  tP("CCRC","Continuing Care Retirement Community","Continuum of residential + health care; FHA-compliant; age-restricted","ccrc",999,(pw,perm)=>{
    // Population check — CCRC is typically age-restricted
    if(pop!=="elderly"&&pop!=="unknown")pw.cav.push({msg:"CCRC is typically an age-restricted (60+) continuum-of-care campus. A non-elderly population may not fit the CCRC definition, which requires 'meeting provisions of federal and state Fair Housing laws' for age-restricted communities.",cite:"§ 18.04.4.1",blocking:true,resolve:"Verify population is appropriate for CCRC model."});

    // Title 15 cap
    t15Cav(pw);

    pw.proc="Permitted (P) — by-right";
    pw.rat="Continuing Care Retirement Community in "+z+". Permitted by-right in HDR, C, and MUC. Campus-style model with continuum of care.";
    devPlanCav(pw);
    pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_SITE];
    pw.rsk=scope==="major"?{nimby:"Low–Medium",escalation:"Low",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires PC + CC hearings",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000"}
      :scope==="minor"?{nimby:"Low",escalation:"Low",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires PC review",approval:"Low",fee:"$600–$700 + $950"}
      :{nimby:"Low",escalation:"Low",timeline:"2–6 weeks",discretion:"None (by-right, staff review only)",approval:"Low",fee:"$160–$220"};
    pw.rank=scope==="major"?"Moderate":"Good";

    pw.cav.push({msg:"Parking: unlisted — Planning Director determination per § 18.03.8.3(D). Likely 1/400 sf GFA (institutional rate).",cite:"§ 18.03.8.3(D)",blocking:false});
  });

  // ──── 5. MEDICAL OFFICE OR CLINIC (outpatient only) ─────────
  tP("MED-OFF","Medical Office or Clinic","Outpatient only; no overnight patients","medOff",null,(pw,perm)=>{
    // MO-01: outpatient only
    if(overnight==="yes"){
      pw.stops.push({msg:"Medical Office does not allow overnight patients — outpatient only. Reclassify to Medical Care Facility for overnight operations.",cite:"§ 18.04.11.2(A)"});
      return;
    }
    pw.mg=null; // outpatient, no beds

    pw.proc="Permitted (P) — by-right";
    pw.rat="Medical Office or Clinic in "+z+". Outpatient treatment of physical or mental ailments. Viable for IOP, PHP (with nightly discharge), and outpatient counseling/therapy. No overnight patients.";
    devPlanCav(pw);

    // DWTN no-minimum-parking exception
    if(z==="DWTN")pw.cav.push({msg:"No minimum parking requirement in Downtown zone for commercial/office uses.",cite:"Table 18.03.8.3-1",blocking:false});

    pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_SITE];
    pw.rsk=scope==="major"?{nimby:"Low",escalation:"Low",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires PC + CC hearings",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000"}
      :scope==="minor"?{nimby:"Very low",escalation:"None",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires PC review",approval:"Low",fee:"$600–$700 + $950"}
      :{nimby:"Very low",escalation:"None",timeline:"2–6 weeks",discretion:"None (by-right, staff review only)",approval:"Very low",fee:"$160–$220"};
    pw.rank=scope==="major"?"Moderate":"Easiest";

    pw.cav.push({msg:"Parking: 1 space per 400 sf GFA (Table 18.03.8.3-1, 'All other Commercial and Office Uses').",cite:"Table 18.03.8.3-1",blocking:false});
  });

  // ──── 6. HEALTH CARE SUPPORT FACILITY ───────────────────────
  tP("HC-SUP","Health Care Support Facility","Health maintenance, labs, medical supply/services","hcSup",null,(pw,perm)=>{
    pw.mg=null; // support services, not residential

    pw.cav.push({msg:"Health Care Support Facility is focused on support services (labs, supply, maintenance). A behavioral health facility is unlikely to qualify unless it is primarily a support/ancillary operation. Requires Planning Director concurrence.",cite:"§ 18.04.16.2",blocking:true,resolve:"Request administrative determination from Planning Director."});

    if(perm==="P"){
      pw.proc="Permitted (P) — by-right";
      pw.rat="Health Care Support Facility in "+z+". Permitted by-right.";
      devPlanCav(pw);
      pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_SITE];
      pw.rsk=scope==="major"?{nimby:"Low",escalation:"Low",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires PC + CC hearings; interpretive classification risk",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000"}
        :scope==="minor"?{nimby:"Very low",escalation:"None",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires PC review; interpretive classification risk",approval:"Low",fee:"$600–$700 + $950"}
        :{nimby:"Very low",escalation:"None",timeline:"2–6 weeks",discretion:"Low — by-right but interpretive classification risk",approval:"Low",fee:"$160–$220"};
      pw.rank="Moderate (interpretive)";
    } else {
      pw.proc="Conditional Use (C) — CUP required";
      pw.rat="Health Care Support Facility in "+z+". CUP required — Planning Commission public hearing + City Council public hearing. Discretionary approval.";
      cupCavs(pw);
      devPlanCav(pw);
      pw.wf=[...WF_CUP];
      pw.rsk={nimby:"Low–Medium",escalation:"Low–Medium",timeline:"3–6 months",discretion:"Moderate — 6 CUP criteria (§ 18.06.4.4(C)); PC + CC public hearings; interpretive classification risk",approval:"Medium",fee:"$1,090 (CUP) + dev plan fees"};
      pw.rank="Hard (interpretive + CUP)";
    }

    pw.cav.push({msg:"Parking: 1 space per 400 sf GFA (Institutional and Public Uses).",cite:"Table 18.03.8.3-1",blocking:false});
  });

  // ──── 7. MEDICAL CARE FACILITY ──────────────────────────────
  tP("MED-CARE","Medical Care Facility","Diagnose/treat for 2+ persons; includes hospitals, rehab, detox","medCare",999,(pw,perm)=>{
    // Broadest medical pathway — includes inpatient
    if(medCare==="no"&&persCare==="no"&&nursing==="no"){
      pw.cav.push({msg:"Medical Care Facility requires medical, surgical, or nursing services for 2+ non-related persons. If no medical/nursing care is provided, consider Group Home classification instead.",cite:"§ 18.04.16.3",blocking:true,resolve:"Confirm operational model includes medical services."});
    }

    if(perm==="P"){
      pw.proc="Permitted (P) — by-right";
      pw.rat="Medical Care Facility in "+z+". Broadest medical/institutional pathway. Includes hospitals, rehabilitation, detox, psychiatric inpatient. Permitted by-right.";
      devPlanCav(pw);
      pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_SITE];
      pw.rsk=scope==="major"?{nimby:"Medium",escalation:"Low–Medium",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires PC + CC hearings",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000"}
        :scope==="minor"?{nimby:"Low–Medium",escalation:"Low",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires PC review",approval:"Low",fee:"$600–$700 + $950"}
        :{nimby:"Low–Medium",escalation:"Low",timeline:"2–6 weeks",discretion:"None (by-right, staff review only)",approval:"Low",fee:"$160–$220"};
      pw.rank=scope==="major"?"Moderate":"Good";
    } else {
      pw.proc="Conditional Use (C) — CUP required";
      pw.rat="Medical Care Facility in "+z+". CUP required — Planning Commission public hearing + City Council public hearing. Discretionary approval required. Viable for medically-staffed inpatient treatment, detox, hospital-level BH.";
      cupCavs(pw);
      devPlanCav(pw);
      pw.wf=[...WF_CUP];
      pw.rsk={nimby:"Medium–High",escalation:"Medium",timeline:"3–6 months",discretion:"Significant — 6 CUP criteria (§ 18.06.4.4(C)); PC + CC public hearings",approval:"Medium–High",fee:"$1,090 (CUP) + dev plan fees"};
      pw.rank="Moderate–Hard";
    }

    // Unknown #13: natural medicine business 500-ft buffer
    if(z==="C"||z==="MUC")pw.cav.push({msg:"§ 18.04.25.4(E) prohibits natural medicine businesses within 500 ft of 'any alcohol or drug rehabilitation facility.' Establishing a facility here could create a 500-ft exclusion zone affecting future natural medicine business siting.",cite:"§ 18.04.25.4(E)",blocking:false});

    pw.cav.push({msg:"Parking: 1 space per 400 sf GFA (Institutional and Public Uses).",cite:"Table 18.03.8.3-1",blocking:false});
  });

  // ──── 8. BOARDING HOUSE ─────────────────────────────────────
  tP("BOARD","Boarding House","4–12 persons; meals; ≥ 30 days; no medical or personal care","boarding",12,(pw,perm)=>{
    // BH-01: No continuous medical or personal care
    if(medCare==="yes"||persCare==="yes"){
      pw.stops.push({msg:"Boarding House definition excludes continuous medical or personal care. Cannot classify as Boarding House if medical care or personal care is provided.",cite:"§ 18.04.5.2(A)"});
      return;
    }
    if(medCare==="unknown"||persCare==="unknown")pw.cav.push({msg:"Boarding House excludes continuous medical or personal care. If any medical or personal care services are provided, this pathway is not available.",cite:"§ 18.04.5.2(A)",blocking:true,resolve:"Confirm no medical or personal care will be provided."});

    pw.cav.push({msg:"Boarding House is a negative boundary for most behavioral health operations. May be viable for a sober living house with meals but no treatment or personal care services. Edge case — see Unknown #2.",cite:"§ 18.04.5.2",blocking:false});

    // Title 15 cap
    t15Cav(pw);

    if(perm==="P"){
      pw.proc="Permitted (P) — by-right";
      pw.rat="Boarding House in "+z+". Permitted by-right. Long-term (≥ 30 days) tenancy for 4–12 persons with meals. No medical or personal care.";
      devPlanCav(pw);
      pw.wf=scope==="major"?[...WF_P_MJR]:scope==="minor"?[...WF_P_MNR]:[...WF_P_SITE];
      pw.rsk=scope==="major"?{nimby:"Low–Medium",escalation:"Low",timeline:"4–8 months",discretion:"Use by-right; Major Dev Plan requires PC + CC hearings",approval:"Low–Medium",fee:"$1,200–$1,450 + $1,000"}
        :scope==="minor"?{nimby:"Low",escalation:"None",timeline:"2–6 months",discretion:"Use by-right; Minor Dev Plan requires PC review",approval:"Low",fee:"$600–$700 + $950"}
        :{nimby:"Low",escalation:"None",timeline:"2–6 weeks",discretion:"None (by-right, staff review only)",approval:"Low",fee:"$160–$220"};
      pw.rank="Moderate (limited utility)";
    } else {
      pw.proc="Conditional Use (C) — CUP required";
      pw.rat="Boarding House in "+z+". CUP required — Planning Commission public hearing + City Council public hearing. Limited utility for BH operations due to medical/personal care exclusion.";
      cupCavs(pw);
      devPlanCav(pw);
      pw.wf=[...WF_CUP];
      pw.rsk={nimby:"Medium",escalation:"Low–Medium",timeline:"3–6 months",discretion:"Moderate — 6 CUP criteria (§ 18.06.4.4(C)); PC + CC public hearings",approval:"Medium",fee:"$1,090 (CUP)"};
      pw.rank="Hard (limited utility + CUP)";
    }

    pw.cav.push({msg:"Parking: 1 space per guest room (Table 18.03.8.3-1, 'All other lodging uses').",cite:"Table 18.03.8.3-1",blocking:false});
  });

  // ──── 9. LEGAL NONCONFORMING USE CONTINUATION ───────────────
  const pNC={id:"NC",nm:"Legal Nonconforming Use Continuation",th:"Lawfully established before LUDC (March 1, 2023); continuously maintained",v:"no",mg:null,stops:[],cav:[...gC],proc:"No approval required",rat:"",wf:[],rsk:{},rank:""};

  if(preexist==="yes"||(exRC==="yes")){
    // G-03: Discontinuance
    if(monthsDisc!=null&&monthsDisc>=12){
      pNC.stops.push({msg:"Use discontinued for "+monthsDisc+" months (≥ 12) — nonconforming status lost. Only conforming uses may resume.",cite:"§ 18.01.7.1(C)"});
    } else if(monthsDisc!=null&&monthsDisc>0&&monthsDisc<12){
      pNC.v="conditional";
      pNC.cav.push({msg:"Use discontinued for "+monthsDisc+" months — nonconforming status still valid but at risk. 12-month discontinuance terminates status.",cite:"§ 18.01.7.1(C)",blocking:false});
    } else if(monthsDisc==null){
      pNC.cav.push({msg:"Months discontinued unknown — verify that the prior use has not been discontinued for 12+ months.",cite:"§ 18.01.7.1(C)",blocking:true,resolve:"Research continuity with Planning Department records."});
    }

    // G-04: No enlargement
    if(expansion==="yes"){
      pNC.stops.push({msg:"Enlargement or expansion of nonconforming use requires full LUDC conformance. Once conforming, use shall not revert.",cite:"§ 18.01.7.1(B)"});
    }

    // G-06: Deemed CUP
    pNC.cav.push({msg:"If this use would require a CUP under the current LUDC, the preexisting legal status is deemed to satisfy the CUP requirement (§ 18.01.7.1(A)(1)). CUP runs with the land.",cite:"§ 18.01.7.1(A)(1)",blocking:false});

    // SP-01: Progressive redevelopment
    pNC.cav.push({msg:"Progressive redevelopment: proposals to reduce (not eliminate) nonconformity may be reviewed without variance. Planning Commission/City Council discretion.",cite:"§ 18.01.7.2(B)",blocking:false});

    // G-05: Damage threshold
    pNC.cav.push({msg:"If structure damaged > 50% of GFA, may rebuild to prior dimensions only (no expansion). Building permits within 12 months. Historic District contributing resources must follow Historic District Design Guidelines.",cite:"§ 18.01.7.1(D)–(E)",blocking:false});

    if(!pNC.stops.length){
      pNC.v=pNC.cav.some(c=>c.blocking)?"conditional":"yes";
      pNC.rat="Lawfully established use that does not conform to current LUDC. Deemed CUP if CUP would now be required. Use may continue within original scope. No enlargement. 12-month discontinuance terminates status.";
      pNC.rsk={nimby:"Minimal",escalation:"None",timeline:"Immediate",discretion:"None",approval:"Very low",fee:"$0"};
      pNC.rank="Best (if applicable)";
      pNC.wf=[...WF_NC];
    }
  } else if(preexist==="unknown"||exRC==="unknown"){
    pNC.v="conditional";
    pNC.rat="Preexisting use status unknown — requires verification.";
    pNC.cav.push({msg:"Verify whether this use was lawfully established before March 1, 2023 (LUDC effective date, § 18.01.1.2).",cite:"§ 18.01.7.1",blocking:true,resolve:"Research with Planning Department and property records."});
    pNC.rsk={nimby:"Unknown",escalation:"Unknown",timeline:"Pending",discretion:"Unknown",approval:"Unknown"};
    pNC.rank="Investigate";
    pNC.wf=[{t:"Research history with Planning Department"},{t:"Confirm lawfully established status and continuous operation"}];
  } else {
    pNC.stops.push({msg:"No preexisting legal use established on property.",cite:"§ 18.01.7.1"});
  }

  if(pNC.stops.length)pNC.v="no";
  R.push(pNC);

  // ──── SP-03: Informational note for zone-blocked pathways ───
  const rezoneCav={msg:"Variance cannot authorize a prohibited use (§ 18.06.4.2(G)). Only rezoning ($1,090) can make a non-permitted use available in this zone.",cite:"§ 18.06.4.2(G)",blocking:false};
  const zoneBlocked=R.filter(r=>r.v==="no"&&r.stops.some(s=>s.msg.startsWith("Not permitted in")));
  if(zoneBlocked.length>0){
    zoneBlocked.forEach(r=>r.cav.push(rezoneCav));
    gC.push(rezoneCav);
  }

  return{zone:z,gS,gC,results:R,p2:gS.length?"fail":"pass"};
}
