/* ═══════════════════════════════════════════════════════════════════
   EL PASO COUNTY RULE ENGINE
   Dependencies: config.js (EPC_UT, EPC_ZL, EPC_GH_ZONES, epcIsGHZone, epcIsCommercial)
   ═══════════════════════════════════════════════════════════════════ */

function runEPCEngine(f){
  const z=f.zone;
  if(z==="PUD")return{error:"PUD district — use eligibility governed by the approved PUD development plan, not Table 5-1. Variance of use is not available in PUD (§ 5.3.3(B)(1)). Verify with El Paso County PCD."};
  const ut=EPC_UT[z];if(!ut)return{error:"Zone not found in EPC Use Table."};
  const lic=f.licensing,cor=f.correctional==="yes",sexOff=f.epcSexOffender;
  const op24=f.op24hr==="yes",overnight=f.overnight==="yes";
  const nonprofit=f.epcNonprofit==="yes";
  const sep=f.epcSeparation,cadO=f.epcCadO||"none";
  const exRC=f.existingRC,mnt=f.maintained;
  const isGH=ut.gh==="A4"; // group home permitted in this zone
  const isComm=epcIsCommercial(z);
  const R=[],gS=[],gC=[];

  // ──── PASS 2: Global rules ────────────────────────────────────

  // G-01: Licensing (scope: all pathways, but hard stop only for state-licensed sub-types)
  if(lic==="no")gS.push({msg:"Cannot obtain state licensing/certification",cite:"§ 5.2.17(C)(4)"});
  if(lic==="unknown")gC.push({msg:"Licensing status unknown — copies of all applicable licenses must be maintained on premises",cite:"§ 5.2.17(C)(4)",blocking:true,resolve:"Confirm with CDPHE/BHA/CARR."});

  // G-02: Sex offender — hard stop for all GH pathways (applied per-pathway, but if yes, note globally)
  // Applied per-pathway below since it only affects GH

  // G-03: Building/fire/health code — informational, applied per GH pathway below

  // G-04: No nonconforming rights — applied per-pathway for existing ops

  // If global hard stop, bail
  if(gS.length)return{zone:z,gS,gC,results:[],p2:"fail"};

  // SP-05 static note for all GH pathways
  const sp05Note={msg:"SP-05 enforcement policy active (PCD Director memo Oct. 2024): occupancy thresholds, separation requirements, and SU routing for group homes are not currently enforced. Building code, fire code, and state licensing remain applicable.",cite:"SP-05 / HB24-1007 / SB24-048",blocking:false,resolve:"Monitor LDC update progress; verify policy remains in effect before relying on it."};
  const sp05Sep={msg:"Code-text contingency: if SP-05 reverts, 500 ft separation along same road applies to this sub-type (§ 5.2.17(A)). GH for Disabled Persons is exempt.",cite:"§ 5.2.17(A)",blocking:false};
  const bldgCode={msg:"Building, fire, and health code compliance required. IBC R-4 occupancy threshold (typically 16 residents) may limit bed count independent of zoning.",cite:"§ 5.2.17(C)(3)",blocking:false};

  // ──── PASS 3: Pathway tester ──────────────────────────────────

  function tP(id,nm,th,utKey,maxRes,fn){
    const perm=ut[utKey];
    if(perm==="N"){
      R.push({id,nm,th,v:"no",mg:null,stops:[{msg:"Not permitted in "+z,cite:"Table 5-1"}],cav:[],proc:"N/A",rat:"",wf:[],rsk:{},rank:"Not viable"});
      return;
    }
    const pw={id,nm,th,v:"yes",mg:maxRes,stops:[],cav:[...gC],proc:perm,rat:"",wf:[],rsk:{},rank:""};
    fn(pw,perm);
    if(pw.stops.length)pw.v="no";
    else if(pw.cav.some(c=>c.blocking))pw.v="conditional";
    R.push(pw);
  }

  // ──── CAD-O overlay modifier ──────────────────────────────────
  function cadOBlock(pw,useType){
    if(cadO==="none"||!cadO)return false;
    // cadO === "cado": property is inside CAD-O boundary but sub-zone (ADNL/APZ-1/APZ-2/ANAV) unknown
    // Most sub-zones are surmountable (APZ-2/ANAV = no restriction, ADNL = noise cert).
    // Only APZ-1 prohibits hospital/conv hospital — small area, rare.
    if(cadO==="cado"){
      if(useType==="convHosp"){
        pw.cav.push({msg:"Property is within the CAD-O. Convalescent Hospital is prohibited in the APZ-1 sub-zone and has no additional restrictions in APZ-2/ANAV. Verify sub-zone with PCD.",cite:"§ 3.4.2",blocking:false});
      }
      if(useType==="hosp"){
        pw.cav.push({msg:"Property is within the CAD-O. Hospital/institutional uses require a 30 dBA noise reduction certificate in the ADNL sub-zone and are prohibited in APZ-1. No additional restrictions in APZ-2/ANAV. Verify sub-zone with PCD.",cite:"§ 3.4.2",blocking:false});
      }
    }
    return false;
  }

  // ──── Workflow templates ───────────────────────────────────────
  const WF_GH_SP05=[{t:"Confirm SP-05 enforcement policy is still active with PCD"},{t:"Obtain state licensing/certification as applicable"},{t:"Apply for Group Home Permit ($192)"},{t:"Submit residential site plan ($165)"},{t:"PCD staff review"},{t:"Begin operations"}];
  const WF_GH_CODE_SMALL=[{t:"Obtain state licensing/certification"},{t:"Apply for Group Home Permit ($192)"},{t:"Submit residential site plan ($165)"},{t:"PCD staff review"},{t:"Begin operations"}];
  const WF_GH_CODE_LARGE=[{t:"Obtain state licensing/certification"},{t:"Pre-application meeting with PCD (recommended)"},{t:"Submit Special Use application ($6,401) with FHAA reasonable accommodation documentation"},{t:"PCD Director administrative review (FHAA criteria per § 5.2.17(D)(2))"},{t:"If elevated: BoCC hearing (not Planning Commission)"},{t:"Submit site plan"},{t:"Begin operations"}];
  const WF_ADMIN=[{t:"Pre-application meeting (recommended)"},{t:"Submit site development plan ($1,685–$3,955)"},{t:"PCD staff review"},{t:"Begin operations"}];
  const WF_SU=[{t:"Pre-application meeting with PCD"},{t:"Submit Special Use application ($6,401)"},{t:"Adjacent owner notification"},{t:"Agency referrals"},{t:"PCD Director administrative review (§ 5.3.2(C) criteria)"},{t:"If elevated: BoCC public hearing"},{t:"Submit site development plan"},{t:"Begin operations"}];

  // ──── GROUP HOME PATHWAYS (8) ─────────────────────────────────
  // All 8 share the same Use Table key "gh" but differ in sub-type rules

  function ghPathway(id,nm,th,subtype,isLarge,maxCode){
    if(!isGH){
      R.push({id,nm,th,v:"no",mg:null,stops:[{msg:"Group Home not permitted in "+z,cite:"Table 5-1"}],cav:[],proc:"N/A",rat:"",wf:[],rsk:{},rank:"Not viable"});
      return;
    }
    const pw={id,nm,th,v:"yes",mg:null,stops:[],cav:[...gC],proc:"A",rat:"",wf:[],rsk:{},rank:""};

    // G-02: Sex offender prohibition
    if(sexOff==="yes"){pw.stops.push({msg:"Sex offender population prohibited in group homes",cite:"§ 5.2.17(C)(2)"});R.push({...pw,v:"no"});return}
    if(sexOff==="unknown")pw.cav.push({msg:"Verify no registered sex offenders (prohibited unless related by blood/marriage/adoption or foster care)",cite:"§ 5.2.17(C)(2)",blocking:true,resolve:"Screen population per C.R.S. § 18-3-412.5."});

    // G-03: Building code note
    pw.cav.push(bldgCode);

    // SP-05 enforcement policy note
    pw.cav.push(sp05Note);

    // === SP-05 CURRENT POSTURE (default) ===
    if(op24){
      // SP-05 applies: all group homes = Allowed, no separation, no occupancy limit
      pw.mg=999; // no LDC cap enforced
      pw.proc="Allowed (SP-05)";
      pw.rat=nm+" in "+z+". Under SP-05 enforcement policy: Allowed regardless of size. No separation enforced. No occupancy threshold. Building code (IBC R-4 at ~16 residents) is the primary constraint.";
      pw.wf=[...WF_GH_SP05];
      pw.rsk={nimby:"Low",escalation:"Low",timeline:"2–6 weeks",discretion:"Minimal",approval:"Low",fee:"$357"};
      pw.rank="Easiest (SP-05)";

      // Code-text contingency caveats for large pathways
      if(isLarge){
        pw.cav.push({msg:"Code-text contingency: if SP-05 reverts, 9+ occupants require Special Use with FHAA criteria (§ 5.2.17(D)). Fee would increase to $6,401+. Timeline: 3–6+ months.",cite:"§ 5.2.17(D); Table 5-3",blocking:false});
      }
      // Separation contingency for non-disabled sub-types
      if(subtype!=="disabled"){
        pw.cav.push(sp05Sep);
        // If user provided separation data, note code-text status
        if(sep!==null&&sep<500){
          pw.cav.push({msg:"Code-text contingency: separation "+sep+" ft < 500 ft minimum. If SP-05 reverts, this would block this pathway unless administrative relief (250 ft min, § 5.5.1(B)(5)) is obtained.",cite:"§ 5.2.17(A)",blocking:false});
        }
      }
    } else {
      // Not 24-hour — SP-05 may not apply (memo says "24-hour care or permanent living")
      pw.cav.push({msg:"SP-05 enforcement policy applies to group homes with 24-hour care or permanent living. Non-24-hour operation may not qualify — code-text rules may apply. Verify with PCD.",cite:"SP-05 memo",blocking:true,resolve:"Confirm with PCD whether SP-05 applies to this operational model."});
      // Fall back to code-text logic
      if(isLarge){
        pw.mg=999;
        pw.proc="Special Use (FHAA) — code text";
        pw.rat=nm+" in "+z+". Code text: 9+ requires Special Use with FHAA reasonable accommodation criteria.";
        pw.wf=[...WF_GH_CODE_LARGE];
        pw.rsk={nimby:"Medium–High",escalation:"Medium",timeline:"3–6+ months",discretion:"Moderate",approval:"Medium",fee:"$6,401+"};
        pw.rank="Moderate (code text)";
      } else {
        pw.mg=maxCode;
        pw.proc="Allowed — code text";
        pw.rat=nm+" in "+z+". Code text: ≤"+maxCode+" = Allowed. Site plan only.";
        pw.wf=[...WF_GH_CODE_SMALL];
        pw.rsk={nimby:"Low",escalation:"Low",timeline:"2–6 weeks",discretion:"Minimal",approval:"Low",fee:"$357"};
        pw.rank="Easy (code text)";
      }
      // Separation test (code text) for non-disabled
      if(subtype!=="disabled"&&!isComm){
        if(sep!==null&&sep<500){
          pw.stops.push({msg:"Separation: "+sep+" ft along same road < 500 ft minimum (code text applies — non-24-hour)",cite:"§ 5.2.17(A)"});
        } else if(sep===null){
          pw.cav.push({msg:"Separation distance unknown — 500 ft along same road required under code text",cite:"§ 5.2.17(A)",blocking:true,resolve:"Measure from lot boundary along road to nearest GH/childcare/family care."});
        }
      }
    }

    // G-07: NGRI/violent offender exclusion — mental illness only
    if(subtype==="mental"&&cor){
      pw.cav.push({msg:"Correctional population: C.R.S. § 30-28-115(2)(b.5) excludes persons convicted of violent felonies and NGRI for violent offenses from mental illness group homes",cite:"C.R.S. § 30-28-115(2)(b.5)",blocking:true,resolve:"Verify population eligibility."});
    }

    // State licensing prerequisite for preemption (mental illness, DD, aged)
    if(subtype==="mental"&&lic!=="yes"){
      pw.cav.push({msg:"State licensing required for C.R.S. § 30-28-115(2)(b.5) preemption. If SP-05 reverts, unlicensed operation loses residential-use-by-right status for ≤8.",cite:"C.R.S. § 30-28-115(2)(b.5)",blocking:false});
    }
    if(subtype==="dd"&&lic!=="yes"){
      pw.cav.push({msg:"State licensing required for C.R.S. § 30-28-115(2)(a) preemption.",cite:"C.R.S. § 30-28-115(2)(a)",blocking:false});
    }
    if(subtype==="aged"&&lic!=="yes"){
      pw.cav.push({msg:"State licensing/ALR certification may be required for C.R.S. § 30-28-115(2)(b) preemption.",cite:"C.R.S. § 30-28-115(2)(b)",blocking:false});
    }

    // SP-04: Recovery residence preemption note (disabled sub-type only)
    if(subtype==="disabled"){
      pw.cav.push({msg:"Recovery residences may also invoke C.R.S. § 30-28-115(2)(b.7) state preemption (residential use, subject only to regulations of like dwellings). Legal argument — not an administrative pathway.",cite:"C.R.S. § 30-28-115(2)(b.7)",blocking:false});
    }

    // Boarding house secondary pathway note (disabled sub-type only)
    if(subtype==="disabled"&&ut.boarding!=="N"){
      pw.cav.push({msg:"Boarding House is a secondary pathway if residents pay compensation and owner/manager lives on-site. Group Home controls per § 5.1.5 (specific over general), but Boarding House has different zone eligibility.",cite:"§ 5.1.5",blocking:false});
    }

    if(pw.stops.length)pw.v="no";
    else if(pw.cav.some(c=>c.blocking))pw.v="conditional";
    R.push(pw);
  }

  ghPathway("GH-DIS-S","GH Disabled Persons ≤8","≤8 disabled persons (incl. SUD recovery)","disabled",false,8);
  ghPathway("GH-DIS-L","GH Disabled Persons 9+","9+ disabled persons (no LDC cap enforced)","disabled",true,999);
  ghPathway("GH-MI-S","GH Mental Illness ≤8","≤8 persons w/ mental illness (state-licensed)","mental",false,8);
  ghPathway("GH-MI-L","GH Mental Illness 9+","9+ persons w/ mental illness (no LDC cap enforced)","mental",true,999);
  ghPathway("GH-DD-S","GH Developmentally Disabled ≤8","≤8 IDD persons (state-licensed)","dd",false,8);
  ghPathway("GH-DD-L","GH Developmentally Disabled 9+","9+ IDD persons (no LDC cap enforced)","dd",true,999);
  ghPathway("GH-AGE-S","GH Aged/ALR ≤8","≤8 persons aged 60+","aged",false,8);
  ghPathway("GH-AGE-L","GH Aged/ALR 9+","9+ persons aged 60+ (no LDC cap enforced)","aged",true,999);

  // ──── REHABILITATION FACILITY ─────────────────────────────────
  tP("REHAB","Rehabilitation Facility","Institutional SUD/alcohol treatment (no LDC bed cap)","rehab",999,(pw,perm)=>{
    if(cadOBlock(pw,"hosp"))return; // institutional use
    const isA=perm==="A";
    pw.proc=isA?"Allowed — SDP review":"Special Use (§ 5.3.2)";
    pw.rat="Rehabilitation Facility in "+z+". Institutional (not a group home). "+
      (isA?"Allowed — site development plan review only.":"Special Use required — PCD Director decides.");
    pw.wf=isA?[...WF_ADMIN]:[...WF_SU];
    if(isA){pw.rsk={nimby:"Low–Medium",escalation:"Low",timeline:"2–6 weeks",discretion:"Low",approval:"Low",fee:"$1,685–$3,955"};pw.rank="Good"}
    else{pw.rsk={nimby:"Medium–High",escalation:"Medium",timeline:"3–6 months",discretion:"Moderate",approval:"Medium",fee:"$6,401+"};pw.rank="Moderate"}
    if(nonprofit)pw.cav.push({msg:"Nonprofit operator: Institution Philanthropic is an alternate pathway with potentially wider zone eligibility",cite:"§ 1.15",blocking:false});
  });

  // ──── HOSPITAL ────────────────────────────────────────────────
  tP("HOSP","Hospital","Inpatient medical/surgical (incl. psych, medical detox)","hosp",999,(pw,perm)=>{
    if(cadOBlock(pw,"hosp"))return;
    const isA=perm==="A";
    pw.proc=isA?"Allowed — SDP review":"Special Use (§ 5.3.2)";
    pw.rat="Hospital in "+z+". Viable for inpatient psychiatry and medical detox. "+
      (isA?"Allowed.":"Special Use required.");
    pw.wf=isA?[...WF_ADMIN]:[...WF_SU];
    if(isA){pw.rsk={nimby:"Low–Medium",escalation:"Low",timeline:"2–6 weeks",discretion:"Low",approval:"Low",fee:"$1,685–$3,955"};pw.rank="Good"}
    else{pw.rsk={nimby:"Medium–High",escalation:"Medium",timeline:"3–6 months",discretion:"Moderate",approval:"Medium",fee:"$6,401+"};pw.rank="Moderate"}
  });

  // ──── HOSPITAL, CONVALESCENT ──────────────────────────────────
  tP("CONV","Hospital, Convalescent","Nursing/LTC/sub-acute (no LDC bed cap)","convHosp",999,(pw,perm)=>{
    if(cadOBlock(pw,"convHosp"))return;
    const isA=perm==="A";
    pw.proc=isA?"Allowed — SDP review":"Special Use (§ 5.3.2)";
    pw.rat="Hospital, Convalescent in "+z+". Ongoing care as principal function. Includes nursing homes, LTC. "+
      (isA?"Allowed.":"Special Use required.");
    pw.wf=isA?[...WF_ADMIN]:[...WF_SU];
    if(isA){pw.rsk={nimby:"Low",escalation:"Low",timeline:"2–6 weeks",discretion:"Low",approval:"Low",fee:"$1,685–$3,955"};pw.rank="Good"}
    else{pw.rsk={nimby:"Medium",escalation:"Medium",timeline:"3–6 months",discretion:"Moderate",approval:"Medium",fee:"$6,401+"};pw.rank="Moderate–Hard"}
  });

  // ──── MEDICAL CLINIC ──────────────────────────────────────────
  tP("CLINIC","Medical Clinic","Outpatient BH/MAT/IOP (no overnight)","medClinic",null,(pw,perm)=>{
    if(overnight){pw.stops.push({msg:"Medical Clinic does not allow overnight lodging — outpatient only",cite:"§ 1.15 (def)"});return}
    pw.proc="Allowed — SDP review";
    pw.mg=null; // outpatient, no beds
    pw.rat="Medical Clinic in "+z+". Outpatient health/mental health care. Viable for MAT, IOP, outpatient BH. No overnight.";
    pw.wf=[...WF_ADMIN];
    pw.rsk={nimby:"Very low",escalation:"Low",timeline:"2–6 weeks",discretion:"Minimal",approval:"Low",fee:"$1,685–$3,955"};pw.rank="Easiest";
  });

  // ──── HALF-WAY HOUSE ──────────────────────────────────────────
  tP("HALF","Half-Way House","Adults on probation/parole (no LDC cap)","halfway",999,(pw,perm)=>{
    if(!cor){pw.stops.push({msg:"Half-Way House requires population exclusively on probation/parole",cite:"§ 1.15 (def)"});return}
    pw.proc="Special Use (§ 5.3.2)";
    pw.rat="Half-Way House in "+z+". Group care for adults on probation/parole. Special Use required in all 4 eligible zones.";
    pw.wf=[...WF_SU];
    pw.rsk={nimby:"Very high",escalation:"High",timeline:"3–6+ months",discretion:"Significant",approval:"High",fee:"$6,401"};pw.rank="Hard";
  });

  // ──── HUMAN SERVICE SHELTER ───────────────────────────────────
  tP("SHELTER","Human Service Shelter","Residential lodging + supportive services","humanSvc",999,(pw,perm)=>{
    const isA=perm==="A";
    pw.proc=isA?"Allowed — SDP review":"Special Use (§ 5.3.2)";
    pw.rat="Human Service Shelter in "+z+". Residential lodging + supportive services for persons in need. "+
      (isA?"Allowed (CS zone).":"Special Use required.");
    pw.wf=isA?[...WF_ADMIN]:[...WF_SU];
    if(isA){pw.rsk={nimby:"Medium",escalation:"Low–Medium",timeline:"2–6 weeks",discretion:"Low",approval:"Low–Medium",fee:"$1,685–$3,955"};pw.rank="Moderate"}
    else{pw.rsk={nimby:"High",escalation:"High",timeline:"3–6 months",discretion:"Significant",approval:"Medium–High",fee:"$6,401+"};pw.rank="Hard"}
  });

  // ──── BOARDING AND ROOMING HOUSE ──────────────────────────────
  tP("BOARD","Boarding/Rooming House","5+ lodgers for compensation","boarding",999,(pw,perm)=>{
    const isA=perm==="A";
    pw.proc=isA?"Allowed — SDP review":"Special Use (§ 5.3.2)";
    pw.rat="Boarding/Rooming House in "+z+". 5+ lodgers for compensation, owner/manager on-site. "+
      (isA?"Allowed.":"Special Use required.");
    if(isGH)pw.cav.push({msg:"If residents are disabled persons (incl. SUD recovery), Group Home for Disabled Persons is the more specific use and controls per § 5.1.5. Boarding House is a secondary/fallback pathway.",cite:"§ 5.1.5",blocking:false});
    pw.wf=isA?[...WF_ADMIN]:[...WF_SU];
    if(isA){pw.rsk={nimby:"Low–Medium",escalation:"Low",timeline:"2–6 weeks",discretion:"Low",approval:"Low",fee:"$1,685–$3,955"};pw.rank="Good"}
    else{pw.rsk={nimby:"Medium",escalation:"Medium",timeline:"3–6 months",discretion:"Moderate",approval:"Medium",fee:"$6,401+"};pw.rank="Moderate"}
  });

  // ──── INSTITUTION, PHILANTHROPIC ──────────────────────────────
  tP("PHIL","Institution, Philanthropic","Not-for-profit charitable (no LDC cap)","philanthropic",999,(pw,perm)=>{
    if(!nonprofit){pw.stops.push({msg:"Requires not-for-profit operator",cite:"§ 1.15 (def)"});return}
    const isA=perm==="A";
    pw.proc=isA?"Allowed — SDP review":"Special Use (§ 5.3.2)";
    pw.rat="Institution, Philanthropic in "+z+". Not-for-profit charitable establishment. Alternate BH pathway with wider zone eligibility for nonprofit operators. "+
      (isA?"Allowed.":"Special Use required.");
    pw.cav.push({msg:"Interpretive risk: broad definition requires PCD Director concurrence that BH operation qualifies as 'philanthropic institution'",cite:"§ 1.15",blocking:true,resolve:"Request administrative determination ($415) from PCD before filing."});
    pw.wf=isA?[...WF_ADMIN]:[...WF_SU];
    if(isA){pw.rsk={nimby:"Low–Medium",escalation:"Low–Medium",timeline:"2–6 weeks + interp",discretion:"Moderate",approval:"Low–Medium",fee:"$1,685–$3,955 + $415 interp"};pw.rank="Moderate (interpretive)"}
    else{pw.rsk={nimby:"Medium–High",escalation:"Medium",timeline:"3–6+ months",discretion:"Significant",approval:"Medium–High",fee:"$6,401+ + $415 interp"};pw.rank="Hard (interpretive)"}
  });

  // ──── EXISTING CONFORMING USE ─────────────────────────────────
  const pNC={id:"NC",nm:"Existing conforming use",th:"Legally established + maintained",v:"no",mg:null,stops:[],cav:[...gC],proc:"No new app",rat:"",wf:[],rsk:{},rank:""};
  if(exRC==="yes"&&mnt==="yes"){
    pNC.v="yes";pNC.rat="Legally established and continuously maintained. Per § 5.6.2(A), pre-existing nonconforming use presumed to have required special use permit. Use may continue. Cannot change to different nonconforming use.";
    pNC.cav.push({msg:"Enlargement of nonconforming use requires variance of use or special use (§ 5.6.4)",cite:"§ 5.6.4",blocking:false});
    pNC.rsk={nimby:"Minimal",escalation:"Minimal",timeline:"Immediate",discretion:"None",approval:"Very low"};pNC.rank="Best (if applicable)";
    pNC.wf=[{t:"Confirm legally established status with PCD"},{t:"Continue operations within existing scope"}];
  } else if(exRC==="yes"&&mnt==="unknown"){
    pNC.v="conditional";pNC.rat="Existing use confirmed, maintenance unverified.";
    pNC.cav.push({msg:"1-year abandonment voids nonconforming status — only conforming uses may resume (§ 5.6.3)",cite:"§ 5.6.3",blocking:true,resolve:"Research via PCD records."});
    pNC.rsk={nimby:"Unknown",escalation:"Unknown",timeline:"Pending",discretion:"Unknown",approval:"Unknown"};pNC.rank="Investigate";
    pNC.wf=[{t:"Research history with PCD"},{t:"Confirm continuous operation"}];
  } else if(exRC==="yes"&&mnt==="no"){
    pNC.stops.push({msg:"Abandoned 1+ year — nonconforming status lost (§ 5.6.3)",cite:"§ 5.6.3"});
  } else {
    pNC.stops.push({msg:"No existing group home or BH use on property",cite:"§ 5.6.2"});
  }
  if(pNC.stops.length)pNC.v="no";
  R.push(pNC);

  // ──── SP-03: Variance of Use fallback note ────────────────────
  // Count how many pathways are blocked by zone eligibility alone
  const zoneBlocked=R.filter(r=>r.v==="no"&&r.stops.some(s=>s.msg.startsWith("Not permitted in"))).length;
  if(zoneBlocked>0){
    // Add a global caveat about variance of use
    gC.push({msg:"Variance of use (§ 5.3.3) available for uses not permitted in this zone — BoCC approval, exercised sparingly. Fee: $5,551. Not available in PUD.",cite:"§ 5.3.3",blocking:false,resolve:"Consult land use counsel before pursuing."});
  }

  return{zone:z,gS,gC,results:R,p2:"pass"};
}
