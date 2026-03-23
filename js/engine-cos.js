/* ═══════════════════════════════════════════════════════════════════
   COLORADO SPRINGS RULE ENGINE
   Dependencies: config.js (COS_UT, COS_ZL)
   Population: hardcoded BH/SUD (behavioral health / substance use disorder)
   ═══════════════════════════════════════════════════════════════════ */

function runCOSEngine(f){
  const z=f.zone,ut=COS_UT[z];if(!ut)return{error:"Zone not found."};
  const cor=f.correctional==="yes";
  const fha=cor?false:(f.fhaProtected==="yes");
  // FHA is yes/no only (no "unknown" — user must resolve before proceeding)
  const distRaw=f.distGLRDetox;
  const dist=distRaw!=null?distRaw:999999;
  const distUnknown=distRaw==null;
  const alException=f.nearestAL==="yes";
  // Prior-use checklist for NC pathway
  const priorUses=f.cosPriorUses||[];
  const hasPriorUse=priorUses.length>0&&!priorUses.includes("none");
  const priorOperating=f.cosPriorStillOperating;
  const monthsDisc=f.cosMonthsDiscontinued;
  const expansion=f.cosProposedExpansion;
  const R=[],gS=[],gC=[];

  // Licensing hardcoded — BH/SUD operators always have state licensing
  // (FORM_DEFAULTS sets licensing:"yes"; no wizard page shown)

  // Manager referral risk — applies to all admin pathways
  const mgrCav={msg:"Manager may refer to Planning Commission (§ 7.5.408)",cite:"§ 7.5.408",blocking:false,resolve:"Cannot be eliminated; flag as escalation risk."};

  // Pathway tester
  function tP(id,nm,th,utKey,maxRes,fn){
    let perm=ut[utKey];
    if(perm==="N"){R.push({id,nm,th,v:"no",mg:null,stops:[{msg:"Not permitted in "+z,cite:"Table 7.3.2-A"}],cav:[],proc:"N/A",rat:"",wf:[],rsk:{},rank:"Not viable"});return}
    // FBZ/PDZ gate
    if(z==="FBZ"){
      if(f.fbzPermits==="no"){R.push({id,nm,th,v:"no",mg:null,stops:[{msg:"FBZ regulating plan does not permit this use",cite:"§ 7.3.102E"}],cav:[],proc:"N/A",rat:"",wf:[],rsk:{},rank:"Not viable"});return}
      if(f.fbzPermits==="unknown"){perm="C"} // conservative
    }
    if(z==="PDZ"){
      if(utKey==="hseS"){perm="P"} // HSE Small always permitted in PDZ residential
      else if(f.pdzPermits==="no"){R.push({id,nm,th,v:"no",mg:null,stops:[{msg:"PDZ Land Use Plan does not include this use",cite:"§ 7.3.103"}],cav:[],proc:"N/A",rat:"",wf:[],rsk:{},rank:"Not viable"});return}
      else if(f.pdzPermits==="unknown"){perm="C"}
    }
    const pw={id,nm,th,v:"yes",mg:maxRes,stops:[],cav:[...gC],proc:perm==="P"?"Admin":"CUP",rat:"",wf:[],rsk:{},rank:""};
    fn(pw,perm);
    if(pw.stops.length)pw.v="no";else if(pw.cav.some(c=>c.blocking)){pw.v="no";pw.cav.filter(c=>c.blocking).forEach(c=>pw.stops.push({msg:c.msg,cite:c.cite}))}
    R.push(pw);
  }

  // === COS workflow templates (CPD-published timelines) ===
  const WF_ADMIN_HSE=[
    {t:"Submit HSE Application via online system (description, resident count, vicinity map, site plan)"},
    {t:"Manager completeness review"},
    {t:"Manager issues provisional permit (6 months, renewable once for 6 months) — § 7.3.301E.3"},
    {t:"Obtain state license"},
    {t:"Provisional converts to administrative permit"},
    {t:"If use discontinued 12 months → permit expires"}
  ];
  const WF_ADMIN_DP=[
    {t:"Pre-application conference (planner contact ~2 working days, appointment ~7 working days)"},
    {t:"Submit HSE Application + Development Plan (within 6-month window from pre-app)"},
    {t:"Completeness check — incomplete apps rejected"},
    {t:"First review letter (~4 weeks from submittal)"},
    {t:"Revisions submitted — planner re-review (~2 weeks per round)"},
    {t:"Manager decision (or PC if referred under § 7.5.408)"}
  ];
  const WF_CUP=[
    {t:"Pre-application conference (planner contact ~2 working days, appointment ~7 working days)"},
    {t:"Submit CUP + Dev Plan application (within 6-month window from pre-app)"},
    {t:"Completeness check — incomplete apps rejected"},
    {t:"First review letter (~4 weeks from submittal)"},
    {t:"Revisions submitted — planner re-review (~2 weeks per round)"},
    {t:"Application finalized for agenda"},
    {t:"Site posting + neighbor postcards (10 consecutive days minimum)"},
    {t:"Planning Commission hearing (3rd Thursday cycle)"},
    {t:"PC decision — approve / approve with conditions / deny"},
    {t:"10-day appeal window"}
  ];
  const WF_CUP_NODEV=[
    {t:"Pre-application conference (planner contact ~2 working days, appointment ~7 working days)"},
    {t:"Submit CUP application (within 6-month window from pre-app)"},
    {t:"Completeness check — incomplete apps rejected"},
    {t:"First review letter (~4 weeks from submittal)"},
    {t:"Revisions submitted — planner re-review (~2 weeks per round)"},
    {t:"Application finalized for agenda"},
    {t:"Site posting + neighbor postcards (10 consecutive days minimum)"},
    {t:"Planning Commission hearing (3rd Thursday cycle)"},
    {t:"PC decision — approve / approve with conditions / deny"},
    {t:"10-day appeal window"}
  ];
  const WF_ADMIN_SIMPLE=[
    {t:"Pre-application conference (optional for admin-track)"},
    {t:"Submit application"},
    {t:"Completeness check"},
    {t:"First review letter (~4 weeks)"},
    {t:"Revisions if needed (~2 weeks per round)"},
    {t:"Manager decision"}
  ];
  // No statutory review clock caveat — applies to all COS pathways
  const noClockCav={msg:"No statutory review deadline — COS timelines are targets, not maximums (unlike Denver's 180-day Exec. Order 151)",cite:"CPD Development Process",blocking:false};

  // === HSE pathways (FHA-protected only) ===
  if(fha){
    tP("HSE-S","HSE Small","≤ 8 residents","hseS",8,(pw,perm)=>{
      pw.cav.push(mgrCav);pw.cav.push(noClockCav);
      pw.rat="HSE Small permitted in "+z+". Up to 8 residents. No separation rule. Admin permit ($175).";
      pw.proc="Admin permit";
      pw.wf=[...WF_ADMIN_HSE];
      pw.rsk={nimby:"Very low",escalation:"Low (manager referral possible)",timeline:"1–3 months",discretion:"Minimal",approval:"Very low",fee:"$175"};
      pw.rank="Easiest pathway";
    });

    tP("HSE-M","HSE Medium","9–15 residents","hseM",15,(pw,perm)=>{
      pw.cav.push(mgrCav);pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP + Dev Plan":"Admin + Dev Plan";
      pw.rat="HSE Medium in "+z+". 9–15 residents. No separation rule. Dev Plan required (§ 7.3.301E.2.a).";
      if(isCUP){
        pw.wf=[...WF_CUP];
        pw.rsk={nimby:"Medium",escalation:"Medium",timeline:"3–5+ months",discretion:"Moderate",approval:"Medium",fee:"$1,445 + $1,520+/acre"};pw.rank="Moderate";
      } else {
        pw.wf=[...WF_ADMIN_DP];
        pw.rsk={nimby:"Low",escalation:"Low–Medium",timeline:"2–6 months",discretion:"Low",approval:"Low",fee:"$175 + $1,520+/acre"};pw.rank="Good";
      }
    });

    tP("HSE-L","HSE Large","≥ 16 residents (no cap)","hseL",999,(pw,perm)=>{
      pw.cav.push(mgrCav);pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP + Dev Plan":"Admin + Dev Plan";
      pw.rat="HSE Large in "+z+". 16+ residents, no UDC cap. Dev Plan required. § 7.3.301E.4 additional criteria apply.";
      if(isCUP){
        pw.wf=[...WF_CUP];
        pw.rsk={nimby:"High",escalation:"High",timeline:"3–6 months",discretion:"Significant",approval:"Medium–High",fee:"$1,445 + $1,520+/acre"};pw.rank="Moderate–Hard";
      } else {
        pw.wf=[...WF_ADMIN_DP];
        pw.rsk={nimby:"Medium",escalation:"Medium",timeline:"2–6 months",discretion:"Moderate",approval:"Low–Medium",fee:"$175 + $1,520+/acre"};pw.rank="Moderate";
      }
    });
  }

  // Separation check — hoisted so all pathways (GLR, DETOX, etc.) can access it
  const sepApplies=dist<1000&&!alException;

  // === GLR pathways (non-FHA) ===
  const distUnkCav=distUnknown?{msg:"Distance to nearest GLR/Detox facility unknown — 1,000-ft separation rule (§ 7.3.301E.1.a) cannot be verified. Measure before filing.",cite:"§ 7.3.301E.1.a",blocking:true,resolve:"Measure straight-line distance to nearest GLR or Detox facility."}:null;
  if(!fha){
    tP("GLR-S","GLR Small","≤ 8 residents","glrS",8,(pw,perm)=>{
      if(sepApplies){pw.stops.push({msg:"Within 1,000 ft of GLR/Detox ("+Math.round(dist).toLocaleString()+" ft)",cite:"§ 7.3.301E.1.a"});return}
      if(dist<1000&&alException)pw.cav.push({msg:"AL exception applied — verify both proposed and existing facility hold AL licenses (§ 7.3.301E.1.b). GIS detected nearest facility as AL-licensed; confirm proposed facility also qualifies.",cite:"§ 7.3.301E.1.b",blocking:false});
      if(distUnkCav)pw.cav.push(distUnkCav);
      pw.cav.push(mgrCav);pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP":"Admin";
      pw.rat="GLR Small in "+z+". Up to 8 residents. 1,000-ft separation "+(dist>=1000?"met.":"exception applied.");
      if(isCUP){
        pw.wf=[...WF_CUP_NODEV];
        pw.rsk={nimby:"Medium",escalation:"Medium",timeline:"3–5 months",discretion:"Moderate",approval:"Medium",fee:"$1,445"};pw.rank="Moderate";
      } else {
        pw.wf=[...WF_ADMIN_SIMPLE];
        pw.rsk={nimby:"Low",escalation:"Low",timeline:"1–3 months",discretion:"Low",approval:"Low",fee:"$175"};pw.rank="Good";
      }
    });

    tP("GLR-M","GLR Medium","9–15 residents","glrM",15,(pw,perm)=>{
      if(sepApplies){pw.stops.push({msg:"Within 1,000 ft of GLR/Detox",cite:"§ 7.3.301E.1.a"});return}
      if(dist<1000&&alException)pw.cav.push({msg:"AL exception applied — verify both facilities hold AL licenses",cite:"§ 7.3.301E.1.b",blocking:false});
      if(distUnkCav)pw.cav.push(distUnkCav);
      pw.cav.push(mgrCav);pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP + Dev Plan":"Admin + Dev Plan";
      pw.rat="GLR Medium in "+z+". 9–15 residents. § 7.3.301E.4 additional criteria apply.";
      if(isCUP){
        pw.wf=[...WF_CUP];
        pw.rsk={nimby:"Medium–High",escalation:"Medium",timeline:"3–6 months",discretion:"Moderate",approval:"Medium",fee:"$1,445 + $1,520+/acre"};pw.rank="Hard";
      } else {
        pw.wf=[...WF_ADMIN_DP];
        pw.rsk={nimby:"Low–Medium",escalation:"Low–Medium",timeline:"2–6 months",discretion:"Moderate",approval:"Low–Medium",fee:"$175 + $1,520+/acre"};pw.rank="Moderate";
      }
    });

    tP("GLR-L","GLR Large","≥ 16 residents (no cap)","glrL",999,(pw,perm)=>{
      if(sepApplies){pw.stops.push({msg:"Within 1,000 ft of GLR/Detox",cite:"§ 7.3.301E.1.a"});return}
      if(dist<1000&&alException)pw.cav.push({msg:"AL exception applied — verify both facilities hold AL licenses",cite:"§ 7.3.301E.1.b",blocking:false});
      if(distUnkCav)pw.cav.push(distUnkCav);
      pw.cav.push(mgrCav);pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP + Dev Plan":"Admin + Dev Plan";
      pw.rat="GLR Large in "+z+". 16+ residents, no UDC cap. § 7.3.301E.4 applies.";
      if(isCUP){
        pw.wf=[...WF_CUP];
        pw.rsk={nimby:"High",escalation:"High",timeline:"3–6 months",discretion:"Significant",approval:"Medium–High",fee:"$1,445 + $1,520+/acre"};pw.rank="Hardest";
      } else {
        pw.wf=[...WF_ADMIN_DP];
        pw.rsk={nimby:"Medium",escalation:"Medium",timeline:"2–6 months",discretion:"Moderate",approval:"Medium",fee:"$175 + $1,520+/acre"};pw.rank="Moderate–Hard";
      }
    });
  }

  // === Detoxification Center ===
  tP("DETOX","Detoxification Center","24-hr medical detox","detox",999,(pw,perm)=>{
    if(sepApplies){pw.stops.push({msg:"Within 1,000 ft of GLR/Detox",cite:"§ 7.3.301E.1.a"});return}
    if(distUnkCav)pw.cav.push(distUnkCav);
    pw.cav.push(noClockCav);
    const detoxIsCUP=perm==="C";
    pw.proc=detoxIsCUP?"CUP + Dev Plan":"Permitted";
    pw.rat="Detox Center in "+z+"."+(detoxIsCUP?" Conditional — CUP required.":" Permitted by right.");
    pw.wf=detoxIsCUP?[...WF_CUP]:[{t:"Confirm zoning compliance"},{t:"File site plan"},{t:"Obtain state license"},{t:"Begin operations"}];
    pw.rsk={nimby:"Very high",escalation:"High",timeline:"3–6 months",discretion:"Significant",approval:"High",fee:"$1,445 + $1,520+/acre"};pw.rank="Very Hard";
  });

  // === Population-gated pathways — always Not Viable for BH/SUD ===
  R.push({id:"HOSPICE",nm:"Hospice",th:"≥ 9 terminal, < 6 months",v:"no",mg:null,stops:[{msg:"BH/SUD population — hospice requires terminal diagnosis with < 6 month life expectancy",cite:"Table 7.3.2-A"}],cav:[],proc:"N/A",rat:"Hospice is for terminally ill populations, not behavioral health or substance use disorder.",wf:[],rsk:{},rank:"Not viable"});
  R.push({id:"LTC",nm:"Long-term Care Facility",th:"Persons over 60",v:"no",mg:null,stops:[{msg:"BH/SUD population — Long-term Care requires residents exclusively over age 60",cite:"Table 7.3.2-A"}],cav:[],proc:"N/A",rat:"LTC serves elderly populations (60+), not behavioral health or substance use disorder.",wf:[],rsk:{},rank:"Not viable"});
  R.push({id:"SHELTER",nm:"Human Services Shelter",th:"Temporary group lodging",v:"no",mg:null,stops:[{msg:"BH/SUD population — Human Services Shelter is temporary group lodging without treatment programming",cite:"Table 7.3.2-A"}],cav:[],proc:"N/A",rat:"HS Shelter provides temporary lodging only, not structured BH/SUD treatment.",wf:[],rsk:{},rank:"Not viable"});

  // === Existing conforming use (NC) — prior-use checklist ===
  const pNC={id:"NC",nm:"Existing conforming use",th:"Pre-UDC lawful use",v:"no",mg:null,stops:[],cav:[...gC],proc:"No new app",rat:"",wf:[],rsk:{},rank:""};
  if(hasPriorUse&&priorOperating==="yes"){
    pNC.v="yes";
    pNC.rat="Previously established ("+priorUses.join(", ")+"), continuously maintained. Per § 7.3.106 / § 7.5.804, deemed to have CUP. May continue within use-specific standards.";
    pNC.rsk={nimby:"Minimal",escalation:"Minimal",timeline:"Immediate",discretion:"None",approval:"Very low"};
    pNC.rank="Best (if applicable)";
    pNC.wf=[{t:"Confirm legally established status with COS Planning"},{t:"Continue operations within existing scope"}];
    if(expansion==="yes")pNC.cav.push({msg:"Proposed expansion — verify expansion is within use-specific standards. Enlargement beyond original scope may require new application.",cite:"§ 7.5.804",blocking:false});
  }
  else if(hasPriorUse&&priorOperating==="no"&&monthsDisc!=null&&monthsDisc>=12){
    pNC.stops.push({msg:"Discontinued 12+ months ("+monthsDisc+" months) — nonconforming status lost",cite:"§ 7.5.804E"});
  }
  else if(hasPriorUse&&priorOperating==="no"&&monthsDisc!=null&&monthsDisc<12){
    pNC.stops.push({msg:"Discontinued "+monthsDisc+" months — at risk of losing nonconforming status at 12 months",cite:"§ 7.5.804E"});
    pNC.rat="Prior use discontinued less than 12 months. Nonconforming status may still be preserved if use resumes before the 12-month deadline.";
  }
  else if(hasPriorUse&&priorOperating==="no"){
    pNC.stops.push({msg:"Discontinuance period unknown — verify with COS Planning whether 12-month window has lapsed",cite:"§ 7.5.804E"});
  }
  else{
    pNC.stops.push({msg:"No existing group living use on lot",cite:"§ 7.5.804"});
  }
  if(pNC.stops.length)pNC.v="no";R.push(pNC);

  return{zone:z,gS,gC,results:R,p2:"pass"};
}
