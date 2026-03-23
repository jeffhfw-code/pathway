/* ═══════════════════════════════════════════════════════════════════
   COLORADO SPRINGS RULE ENGINE
   Dependencies: config.js (COS_UT, COS_ZL)
   ═══════════════════════════════════════════════════════════════════ */

function runCOSEngine(f){
  const z=f.zone,ut=COS_UT[z];if(!ut)return{error:"Zone not found."};
  const cor=f.correctional==="yes";
  const fha=cor?false:(f.fhaProtected==="yes");
  const fhaUnk=!cor&&f.fhaProtected==="unknown";
  const lic=f.licensing;
  const distRaw=f.distGLRDetox;
  const dist=distRaw!=null?distRaw:999999;
  const distUnknown=distRaw==null;
  const alException=f.nearestAL==="yes";
  const exRC=f.existingRC,mnt=f.maintained;
  const R=[],gS=[],gC=[];

  // Pass 2 — General rules
  if(lic==="no")gS.push({msg:"Cannot obtain state licensing/certification",cite:"§ 7.3.107"});
  if(lic==="unknown")gC.push({msg:"Licensing status unknown",cite:"§ 7.3.107",blocking:true,resolve:"Confirm with state licensing agency."});
  if(gS.length)return{zone:z,gS,gC,results:[],p2:"fail"};

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
  if(fha||fhaUnk){
    const fhaLabel=fhaUnk?" (FHA status unconfirmed)":"";

    tP("HSE-S","HSE Small"+fhaLabel,"≤ 8 residents","hseS",8,(pw,perm)=>{
      if(fhaUnk)pw.cav.push({msg:"FHA-protected status unconfirmed — if not FHA, must use GLR",cite:"§ 7.6.301",blocking:true,resolve:"Confirm population FHA status."});
      pw.cav.push(mgrCav);pw.cav.push(noClockCav);
      pw.rat="HSE Small permitted in "+z+". Up to 8 residents. No separation rule. Admin permit ($175).";
      pw.proc="Admin permit";
      pw.wf=[...WF_ADMIN_HSE];
      pw.rsk={nimby:"Very low",escalation:"Low (manager referral possible)",timeline:"1–3 months",discretion:"Minimal",approval:"Very low",fee:"$175"};
      pw.rank="Easiest pathway";
    });

    tP("HSE-M","HSE Medium"+fhaLabel,"9–15 residents","hseM",15,(pw,perm)=>{
      if(fhaUnk)pw.cav.push({msg:"FHA status unconfirmed",cite:"§ 7.6.301",blocking:true,resolve:"Confirm population FHA status."});
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

    tP("HSE-L","HSE Large"+fhaLabel,"≥ 16 residents (no cap)","hseL",999,(pw,perm)=>{
      if(fhaUnk)pw.cav.push({msg:"FHA status unconfirmed",cite:"§ 7.6.301",blocking:true,resolve:"Confirm population FHA status."});
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

  // === GLR pathways (non-FHA or unknown) ===
  const distUnkCav=distUnknown?{msg:"Distance to nearest GLR/Detox facility unknown — 1,000-ft separation rule (§ 7.3.301E.1.a) cannot be verified. Measure before filing.",cite:"§ 7.3.301E.1.a",blocking:true,resolve:"Measure straight-line distance to nearest GLR or Detox facility."}:null;
  if(!fha||fhaUnk){
    const glrLabel=fhaUnk?" (if not FHA-protected)":"";

    tP("GLR-S","GLR Small"+glrLabel,"≤ 8 residents","glrS",8,(pw,perm)=>{
      if(fhaUnk)pw.cav.push({msg:"If population IS FHA-protected, use HSE instead",cite:"§ 7.6.301",blocking:false});
      if(sepApplies){pw.stops.push({msg:"Within 1,000 ft of GLR/Detox ("+Math.round(dist).toLocaleString()+" ft)",cite:"§ 7.3.301E.1.a"});return}
      if(dist<1000&&alException)pw.cav.push({msg:"AL exception applied — verify both are AL-licensed",cite:"§ 7.3.301E.1.b",blocking:true,resolve:"Confirm with COS Planning."});
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

    tP("GLR-M","GLR Medium"+glrLabel,"9–15 residents","glrM",15,(pw,perm)=>{
      if(fhaUnk)pw.cav.push({msg:"If FHA-protected, use HSE instead",cite:"§ 7.6.301",blocking:false});
      if(sepApplies){pw.stops.push({msg:"Within 1,000 ft of GLR/Detox",cite:"§ 7.3.301E.1.a"});return}
      if(dist<1000&&alException)pw.cav.push({msg:"AL exception — verify both AL-licensed",cite:"§ 7.3.301E.1.b",blocking:true,resolve:"Confirm with COS Planning."});
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

    tP("GLR-L","GLR Large"+glrLabel,"≥ 16 residents (no cap)","glrL",999,(pw,perm)=>{
      if(fhaUnk)pw.cav.push({msg:"If FHA-protected, use HSE instead",cite:"§ 7.6.301",blocking:false});
      if(sepApplies){pw.stops.push({msg:"Within 1,000 ft of GLR/Detox",cite:"§ 7.3.301E.1.a"});return}
      if(dist<1000&&alException)pw.cav.push({msg:"AL exception — verify both AL-licensed",cite:"§ 7.3.301E.1.b",blocking:true,resolve:"Confirm with COS Planning."});
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

  // === Hospice ===
  if(f.targetTerminal==="yes"){
    tP("HOSPICE","Hospice","≥ 9 terminal, < 6 months","hospice",999,(pw,perm)=>{
      pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP":"Admin";
      pw.rat="Hospice in "+z+". ≥9 terminally ill, state licensed, 24-hour palliative.";
      if(isCUP){
        pw.wf=[...WF_CUP];
        pw.rsk={nimby:"Low–Medium",escalation:"Low",timeline:"3–5 months",discretion:"Moderate",approval:"Low–Medium",fee:"$1,445 + $1,520+/acre"};pw.rank="Moderate";
      } else {
        pw.wf=[...WF_ADMIN_SIMPLE];
        pw.rsk={nimby:"Very low",escalation:"Low",timeline:"1–3 months",discretion:"Low",approval:"Low",fee:"$175"};pw.rank="Good";
      }
    });
  }

  // === Long-term Care Facility ===
  if(f.targetOver60==="yes"){
    tP("LTC","Long-term Care Facility","Persons over 60","ltc",999,(pw,perm)=>{
      pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP":"Admin";
      pw.rat="LTC in "+z+". Persons over 60, lodging/meals for compensation.";
      if(isCUP){
        pw.wf=[...WF_CUP_NODEV];
        pw.rsk={nimby:"Low",escalation:"Low",timeline:"3–5 months",discretion:"Moderate",approval:"Low–Medium",fee:"$1,445"};pw.rank="Moderate";
      } else {
        pw.wf=[...WF_ADMIN_SIMPLE];
        pw.rsk={nimby:"Very low",escalation:"Low",timeline:"1–3 months",discretion:"Low",approval:"Low",fee:"$175"};pw.rank="Good";
      }
    });
  }

  // === Human Services Shelter ===
  if(f.tempShelter==="yes"){
    tP("SHELTER","Human Services Shelter","Temporary group lodging","shelter",999,(pw,perm)=>{
      pw.cav.push(noClockCav);
      const isCUP=perm==="C";
      pw.proc=isCUP?"CUP":"Admin";
      pw.rat="HS Shelter in "+z+". Temporary group lodging, generally unlicensed.";
      if(isCUP){
        pw.wf=[...WF_CUP];
        pw.rsk={nimby:"High",escalation:"High",timeline:"3–5+ months",discretion:"Significant",approval:"Medium–High",fee:"$1,445"};pw.rank="Hard";
      } else {
        pw.wf=[...WF_ADMIN_SIMPLE];
        pw.rsk={nimby:"Medium",escalation:"Medium",timeline:"1–3 months",discretion:"Moderate",approval:"Medium",fee:"$175"};pw.rank="Moderate";
      }
    });
  }

  // === Existing conforming use ===
  const pNC={id:"NC",nm:"Existing conforming use",th:"Pre-UDC lawful use",v:"no",mg:null,stops:[],cav:[...gC],proc:"No new app",rat:"",wf:[],rsk:{},rank:""};
  if(exRC==="yes"&&mnt==="yes"){pNC.v="yes";pNC.rat="Previously established, continuously maintained. Per § 7.3.106 / § 7.5.804, deemed to have CUP. May continue and expand within use-specific standards.";pNC.rsk={nimby:"Minimal",escalation:"Minimal",timeline:"Immediate",discretion:"None",approval:"Very low"};pNC.rank="Best (if applicable)";pNC.wf=[{t:"Confirm status with COS Planning"},{t:"Continue operations within existing scope"}]}
  else if(exRC==="yes"&&mnt==="unknown"){pNC.v="no";pNC.rat="Existing use confirmed, maintenance unverified.";pNC.stops.push({msg:"Maintenance unconfirmed — cannot verify continuous operation",cite:"§ 7.5.804E"});pNC.cav.push({msg:"12-month discontinuance voids nonconforming status",cite:"§ 7.5.804E",blocking:true,resolve:"Research via COS Planning."});pNC.rsk={nimby:"Unknown",escalation:"Unknown",timeline:"Pending",discretion:"Unknown",approval:"Unknown"};pNC.rank="Investigate";pNC.wf=[{t:"Research history with COS Planning"},{t:"Confirm continuous operation"}]}
  else if(exRC==="yes"&&mnt==="no")pNC.stops.push({msg:"Discontinued 12+ months — nonconforming status lost",cite:"§ 7.5.804E"});
  else pNC.stops.push({msg:"No existing group living use on lot",cite:"§ 7.5.804"});
  if(pNC.stops.length)pNC.v="no";R.push(pNC);

  return{zone:z,gS,gC,results:R,p2:"pass"};
}
