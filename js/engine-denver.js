/* ═══════════════════════════════════════════════════════════════════
   DENVER RULE ENGINE
   Dependencies: config.js (UT, zone helpers)
   ═══════════════════════════════════════════════════════════════════ */
function runEngine(f){
  const z=f.zone,ut=UT[z];if(!ut)return{error:"Zone not found."};
  const lot=f.lotSize||0,rcN=f.rcWithin1mi||0,rc34=f.rcType34within1mi||0,d34=f.distType34!=null?f.distType34:999999,cor=f.correctional==="yes",rel=f.religious==="yes",lic=f.licensing,exRC=f.existingRC,mnt=f.maintained;
  const R=[],gS=[],gC=[];
  if(lic==="no")gS.push({msg:"Cannot obtain licensing/certification",cite:"§ 11.2.8.1.B.1"});
  if(lic==="unknown")gC.push({msg:"Licensing status unknown",cite:"§ 11.2.8.1.B.1",blocking:true,resolve:"Confirm with CPD and state agency."});
  if(cor)gC.push({msg:"Correctional supervision — DPS referral mandatory",cite:"§ 11.2.8.1.B.2",blocking:false,resolve:"Contact DPS before filing."});
  if(f.op24hr==="no")gC.push({msg:"Less-than-24-hour conditions apply",cite:"§ 11.2.8.1.B.3",blocking:false,resolve:"Address in operational plan."});
  if(gS.length)return{zone:z,gS,gC,results:[],p2:"fail"};

  function tP(id,nm,th,tk,fn){const el=ut[tk];if(el==="NP"){R.push({id,nm,th,v:"no",mg:null,stops:[{msg:"Not permitted in "+z,cite:"Use Table"}],cav:[],proc:el,rat:"",wf:[],rsk:{},rank:"Not viable"});return}const pw={id,nm,th,v:"yes",mg:null,stops:[],cav:[...gC],proc:el,rat:"",wf:[],rsk:{},rank:""};fn(pw);if(pw.stops.length)pw.v="no";else if(pw.cav.some(c=>c.blocking)){pw.v="no";pw.cav.filter(c=>c.blocking).forEach(c=>pw.stops.push({msg:c.msg,cite:c.cite}))}R.push(pw)}

  tP("P1","Type 1","Up to 10 guests","t1",pw=>{
    pw.mg=10;
    if(isSU_TU_RH25(z)&&cor){pw.stops.push({msg:"Correctional prohibited in SU/TU/RH-2.5",cite:"§ 11.2.9.2.A"});return}
    if(isSU_TU_RH25(z)&&rcN>3){pw.stops.push({msg:"Density: "+rcN+" RC within 1 mi (max 3)",cite:"§ 11.2.9.2.B"});return}
    if(isMRH3(z))pw.cav.push({msg:"M-RH-3: Type 1 density applicability ambiguous",cite:"§ 11.2.9.2/§ 9.7.9",blocking:true,resolve:"Request CPD determination."});
    if(rel){pw.proc="No ZP required";pw.rat="Religious Assembly exemption — no zoning permit needed (up to 10 guests year-round).";pw.wf=[{t:"Confirm religious assembly status"},{t:"Begin operations — no ZP required"},{t:"If exceeding 10 guests, file for Type 2/3/4"}]}
    else{pw.rat="Type 1 permitted in "+z+". Up to 10 guests year-round.";pw.wf=[{t:"Pre-app meeting (optional)"},{t:"Compile ZP application"},{t:"File with CPD"},{t:"Completeness review"},{t:"ZA decision"}];if(cor)pw.wf.splice(3,0,{t:"DPS referral and comment period"})}
    pw.rsk={nimby:"Low",escalation:"Low",timeline:"2–6 weeks",discretion:"Minimal",approval:"Low"};if(!rel)pw.rsk.fee="$100";pw.rank="Best pathway";
  });

  tP("P2","Type 2","11–40 guests","t2",pw=>{
    let mx=40;const isSTR=isSU_TU_anyRH(z);
    if(isSTR){mx=20;
      if(isMRH3(z))pw.cav.push({msg:"M-RH-3: Type 2 SU/TU/RH rules applied conservatively",cite:"§§ 11.2.10.1–.3/§ 9.7.9",blocking:true,resolve:"Request CPD determination."});
      pw.cav.push({msg:"Prior use must be RC or Civic/Public/Institutional",cite:"§ 11.2.10.1.A",blocking:true,resolve:"Confirm with CPD or Assessor."});
      if(lot>0&&lot<12000){let msg="Lot "+lot.toLocaleString()+" sf below 12,000 sf minimum (§ 11.2.10.1.C — applies to all SU, TU, and RH zones per Code text)";if(isRH3_3A(z)||isMRH3(z))msg+=". Note: standard RH-3/3A lots are typically under 12,000 sf — consider administrative inquiry with CPD";pw.stops.push({msg,cite:"§ 11.2.10.1.C"});return}
      if(!lot)pw.cav.push({msg:"Lot size unknown — 12,000 sf min applies",cite:"§ 11.2.10.1.C",blocking:true,resolve:"Verify via Assessor."})}
    if(isSU_TU_RH25(z)&&cor){pw.stops.push({msg:"Correctional prohibited in SU/TU/RH-2.5",cite:"§ 11.2.10.2"});return}
    if(isRH3_3A(z)&&cor){pw.cav.push({msg:"Correctional in RH-3/3A triggers ZPCIM",cite:"§ 11.2.10.3",blocking:false,resolve:"Budget for CIM."});pw.proc="L-ZPCIM"}
    if(isMRH3(z)&&cor)pw.cav.push({msg:"M-RH-3 + correctional: prohibition vs ZPCIM unclear",cite:"§§ 11.2.10.2–.3",blocking:true,resolve:"Request CPD determination."});
    pw.mg=mx;pw.rat="Type 2 in "+z+". Max "+mx+(isSTR?" (SU/TU/RH cap)":"")+".";
    const cim=pw.proc.includes("ZPCIM");
    pw.rsk={nimby:cim?"Medium":"Low",escalation:cim?"Medium":"Low",timeline:cim?"8–14 weeks":"2–6 weeks",discretion:cim?"Moderate":"Low",approval:cim?"Medium":"Low",fee:"$100"};
    if(cim)pw.rsk.clock="180-day City review clock (Exec. Order 151)";
    pw.rank=cim?"Moderate":"Good";
    pw.wf=cim?[{t:"Pre-app meeting"},{t:"Host CIM (21-day notice, 400-ft radius)"},{t:"Compile ZP + CIM summary"},{t:"File with CPD"},{t:"Completeness review"},{t:"ZA decision"}]:[{t:"Pre-app meeting (optional)"},{t:"Compile ZP application"},{t:"File with CPD"},{t:"Completeness review"},{t:"ZA decision"}];
    if(cor){const idx=pw.wf.length-1;pw.wf.splice(idx,0,{t:"DPS referral and comment period"})}
  });

  function addSpC(pw,ty){
    const sp=getSp(z);
    if(!sp){
      if(isCMP(z))pw.cav.push({msg:"CMP "+ty+" spacing needs verification (OCR anomaly noted)",cite:"§§ 11.2.11–.12",blocking:true,resolve:"Verify against official PDF."});
      else if(isIAIB(z))pw.cav.push({msg:"I-A/I-B "+ty+" spacing needs confirmation",cite:"§§ 11.2.11–.12",blocking:true,resolve:"Request CPD confirmation."});
    }
    if(isCCN12(z))pw.cav.push({msg:"C-CCN-12 not in "+ty+" spacing enumeration (only -3,-4,-5,-7,-8 listed)",cite:ty==="Type 3"?"§ 11.2.11.3":"§ 11.2.12.3",blocking:true,resolve:"Request CPD determination."});
  }

  tP("P3","Type 3","41–100 guests","t3",pw=>{
    pw.mg=100;const sp=getSp(z);
    if(sp&&d34<sp.d){pw.stops.push({msg:"Spacing: "+Math.round(d34).toLocaleString()+" ft (min "+sp.d.toLocaleString()+")",cite:sp.c3});return}
    addSpC(pw,"Type 3");
    let sn=sp?" Spacing met ("+sp.d.toLocaleString()+" ft min).":"";if(isDtNS(z))sn=" No spacing for this downtown district.";
    pw.rat="Type 3 in "+z+". 41–100 guests."+sn;
    pw.rsk={nimby:"High",escalation:"High",timeline:"12–20 weeks",discretion:"Moderate",approval:"Medium–High",clock:"180-day City review clock (Exec. Order 151)",fee:"$100"};pw.rank="Challenging";
    pw.wf=[{t:"Pre-app meeting"},{t:"Host CIM (21-day notice, 400-ft radius)"},{t:"Compile ZP + CIM summary"},{t:"File with CPD"},{t:"Completeness review"},{t:"Agency referrals"},{t:"ZA decision"}];
    if(cor){pw.wf.splice(pw.wf.length-1,0,{t:"DPS referral and comment period"})}
  });

  tP("P4","Type 4","101+ guests","t4",pw=>{
    pw.mg=999;if(rc34>3){pw.stops.push({msg:"Density: "+rc34+" Type 3/4 within 1 mi (max 3)",cite:"§ 11.2.12.1.B"});return}
    const sp=getSp(z);if(sp&&d34<sp.d){pw.stops.push({msg:"Spacing: "+Math.round(d34).toLocaleString()+" ft (min "+sp.d.toLocaleString()+")",cite:sp.c4});return}
    addSpC(pw,"Type 4");
    let sn=sp?" Spacing met.":"";if(isDtNS(z))sn=" No spacing for this downtown district.";
    pw.rat="Type 4 in "+z+". 101+. No code cap."+sn;
    pw.rsk={nimby:"Very high",escalation:"Very high",timeline:"16–24 weeks",discretion:"Significant",approval:"High",clock:"180-day City review clock (Exec. Order 151)",fee:"$100"};pw.rank="Most difficult";
    pw.wf=[{t:"Pre-app meeting"},{t:"Host CIM (21-day notice, 400-ft radius)"},{t:"Compile ZP + CIM summary"},{t:"File with CPD"},{t:"Completeness review"},{t:"Agency referrals"},{t:"ZA decision"}];
    if(cor){pw.wf.splice(pw.wf.length-1,0,{t:"DPS referral and comment period"})}
  });

  const p5={id:"P5",nm:"Existing conforming-use",th:"Established + maintained",v:"no",mg:null,stops:[],cav:[...gC],proc:"No new ZP",rat:"",wf:[],rsk:{},rank:""};
  if(exRC==="yes"&&mnt==="yes"){p5.v="yes";p5.rat="Legally established and maintained. Count frozen.";p5.cav.push({msg:"Count cannot increase",cite:"§ 11.2.8.1.C.1.c",blocking:false,resolve:"Verify with CPD."});p5.rsk={nimby:"Minimal",escalation:"Minimal",timeline:"Immediate",discretion:"None",approval:"Very low"};p5.rank="Best (if applicable)";p5.wf=[{t:"Confirm with CPD"},{t:"Continue within count"}]}
  else if(exRC==="yes"&&mnt==="unknown"){p5.v="no";p5.rat="RC confirmed, maintenance unverified.";p5.stops.push({msg:"Maintenance unconfirmed — cannot verify continuous operation",cite:"§ 11.2.8.1.C"});p5.cav.push({msg:"Maintenance unconfirmed",cite:"§ 11.2.8.1.C",blocking:true,resolve:"Research via CPD/Assessor."});p5.rsk={nimby:"Unknown",escalation:"Unknown",timeline:"Pending",discretion:"Unknown",approval:"Unknown"};p5.rank="Investigate";p5.wf=[{t:"Research history"},{t:"Confirm with CPD"}]}
  else if(exRC==="yes"&&mnt==="no")p5.stops.push({msg:"Not maintained — lapsed",cite:"§ 11.2.8.1.C"});
  else p5.stops.push({msg:"No existing RC use",cite:"§ 11.2.8.1.C"});
  if(p5.stops.length)p5.v="no";R.push(p5);

  return{zone:z,gS,gC,results:R,p2:"pass"};
}
