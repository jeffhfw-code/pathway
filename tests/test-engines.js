/* ═══════════════════════════════════════════════════════════════════
   ENGINE TEST SUITE
   Tests for runEngine (Denver), runCOSEngine (COS), runEPCEngine (EPC)
   ═══════════════════════════════════════════════════════════════════ */

const output=document.getElementById("output");
let totalPass=0,totalFail=0,totalSkip=0;
let currentSuite="";

function suite(name){
  currentSuite=name;
  output.innerHTML+=`<div class="suite"><div class="suite-name">${name}</div>`;
}

function endSuite(){
  output.innerHTML+=`</div>`;
}

function test(name,fn){
  try{
    fn();
    totalPass++;
    output.innerHTML+=`<div class="result pass">✓ ${name}</div>`;
  }catch(e){
    totalFail++;
    output.innerHTML+=`<div class="result fail">✗ ${name}</div><div class="detail">${e.message}</div>`;
  }
}

function assert(cond,msg){if(!cond)throw new Error(msg||"Assertion failed")}
function assertEqual(a,b,msg){if(a!==b)throw new Error((msg||"")+" — expected "+JSON.stringify(b)+", got "+JSON.stringify(a))}
function assertIncludes(arr,val,msg){if(!arr.includes(val))throw new Error((msg||"")+" — expected array to include "+JSON.stringify(val))}

function baseForm(overrides){
  return Object.assign({
    zone:null,lotSize:null,existingRC:"no",maintained:null,religious:"no",
    correctional:"no",rcWithin1mi:0,rcType34within1mi:0,distType34:99999,
    op24hr:"yes",overnight:"yes",licensing:"yes",address:"Test Address",
    fhaProtected:"yes",constructionType:"new",fbzPermits:null,pdzPermits:null,
    targetOver60:null,targetTerminal:null,tempShelter:null,cosOverlays:[],
    distGLRDetox:99999,nearestAL:"no",
    epcSexOffender:"no",epcNonprofit:"no",epcSeparation:null,epcCadO:"none",
    manOnSiteTreatment:"no",manPopulationType:"behavioral",manOvernightBeds:"yes",
    manProvidesMedCare:"no",manProvidesPersonalCare:"no",manFullTimeNursing:"no",
    manPreexistingUse:"no",manMonthsDiscontinued:null,manProposedExpansion:"no",
    manNaturalHazard:"no",manHistoricDistrict:"no",manConstructionScope:"none",
    manDwellingUnitSqft:null
  },overrides);
}

/* ═══════════════════════════════════════════════════════════════════
   DENVER ENGINE TESTS
   ═══════════════════════════════════════════════════════════════════ */
suite("Denver Engine — Zone Classification Helpers");

test("isSU identifies SU zones",()=>{
  assert(isSU("S-SU-Fx"));assert(isSU("E-SU-A"));assert(isSU("U-SU-H"));
  assert(!isSU("S-MU-3"));assert(!isSU("G-RH-3"));
});

test("isTU identifies TU zones",()=>{
  assert(isTU("E-TU-B"));assert(isTU("U-TU-C"));
  assert(!isTU("S-SU-Fx"));assert(!isTU("S-MU-3"));
});

test("isRH25 identifies RH-2.5 zones",()=>{
  assert(isRH25("S-RH-2.5"));assert(isRH25("E-RH-2.5"));assert(isRH25("U-RH-2.5"));
  assert(!isRH25("G-RH-3"));assert(!isRH25("U-RH-3A"));
});

test("isSU_TU_RH25 combines correctly",()=>{
  assert(isSU_TU_RH25("S-SU-Fx"));assert(isSU_TU_RH25("E-TU-B"));assert(isSU_TU_RH25("U-RH-2.5"));
  assert(!isSU_TU_RH25("G-MU-3"));
});

test("getSp returns correct spacing",()=>{
  const mu=getSp("S-MU-3");assertEqual(mu.d,1200,"MU spacing");
  const mx=getSp("S-MX-3");assertEqual(mx.d,600,"MX spacing");
  const dt=getSp("D-AS");assertEqual(dt.d,400,"D-AS spacing");
  const su=getSp("S-SU-Fx");assertEqual(su,null,"SU has no spacing");
});

test("hasMX identifies mixed-use zones",()=>{
  assert(hasMX("S-MX-3"));assert(hasMX("M-IMX-5"));assert(hasMX("M-GMX"));
  assert(!hasMX("S-MU-3"));assert(!hasMX("S-SU-Fx"));
});

endSuite();

suite("Denver Engine — Use Table Coverage");

test("All ZL zones have UT entries",()=>{
  const missing=ZL.filter(z=>!UT[z]);
  assertEqual(missing.length,0,"Missing zones: "+missing.join(", "));
});

test("UT entries have required keys",()=>{
  for(const z of ZL){
    const u=UT[z];
    assert(u,"Missing UT for "+z);
    assert("t1" in u,"Missing t1 for "+z);
    assert("t2" in u,"Missing t2 for "+z);
    assert("t3" in u,"Missing t3 for "+z);
    assert("t4" in u,"Missing t4 for "+z);
  }
});

test("OS/MHC zones are all NP",()=>{
  for(const z of["OS-A","OS-B","OS-C","MHC"]){
    const u=UT[z];
    assertEqual(u.t1,"NP",z+" t1");assertEqual(u.t2,"NP",z+" t2");
    assertEqual(u.t3,"NP",z+" t3");assertEqual(u.t4,"NP",z+" t4");
  }
});

endSuite();

suite("Denver Engine — Pathway Results");

test("SU zone produces 5 pathways",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx"}));
  assertEqual(r.results.length,5,"pathway count");
  assertEqual(r.p2,"pass");
});

test("Type 1 is viable in SU zone",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx"}));
  const p1=r.results.find(p=>p.id==="P1");
  assertEqual(p1.v,"yes","Type 1 viability");
  assertEqual(p1.mg,10,"Type 1 max guests");
});

test("Type 3/4 are NP in SU zone",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx"}));
  const p3=r.results.find(p=>p.id==="P3");
  const p4=r.results.find(p=>p.id==="P4");
  assertEqual(p3.v,"no","Type 3");assertEqual(p4.v,"no","Type 4");
});

test("Licensing=no blocks all pathways",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3",licensing:"no"}));
  assertEqual(r.p2,"fail");assertEqual(r.results.length,0);
});

test("Licensing=unknown creates blocking caveat",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3",licensing:"unknown"}));
  assertEqual(r.p2,"pass");
  const p1=r.results.find(p=>p.id==="P1");
  assertEqual(p1.v,"conditional","should be conditional");
  assert(p1.cav.some(c=>c.msg.includes("Licensing status unknown")),"should have licensing caveat");
});

test("Correctional in SU blocks Type 1",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",correctional:"yes"}));
  const p1=r.results.find(p=>p.id==="P1");
  assertEqual(p1.v,"no","correctional blocks T1 in SU");
});

test("Density >3 in SU blocks Type 1",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",rcWithin1mi:4}));
  const p1=r.results.find(p=>p.id==="P1");
  assertEqual(p1.v,"no","density blocks T1");
  assert(p1.stops[0].msg.includes("Density"));
});

test("Type 2 lot size check in SU zone",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",lotSize:10000}));
  const p2=r.results.find(p=>p.id==="P2");
  assertEqual(p2.v,"no","small lot blocks T2");
  assert(p2.stops[0].msg.includes("12,000"));
});

test("Type 2 viable with sufficient lot in SU",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",lotSize:15000}));
  const p2=r.results.find(p=>p.id==="P2");
  // Should be conditional (prior use caveat), not hard-stopped
  assert(p2.v!=="no","Type 2 should not be hard-stopped with 15k lot");
});

test("Religious assembly exempts Type 1 from ZP",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",religious:"yes"}));
  const p1=r.results.find(p=>p.id==="P1");
  assertEqual(p1.proc,"No ZP required");
});

test("MX zone allows all 4 types + existing",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3"}));
  assertEqual(r.results.length,5);
  const viable=r.results.filter(p=>p.v==="yes"||p.v==="conditional");
  assert(viable.length>=4,"at least 4 viable in MX zone");
});

test("Type 3 spacing blocks when too close",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3",distType34:400}));
  const p3=r.results.find(p=>p.id==="P3");
  assertEqual(p3.v,"no","spacing should block");
  assert(p3.stops[0].msg.includes("Spacing"));
});

test("Type 4 density >3 blocks",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3",rcType34within1mi:4}));
  const p4=r.results.find(p=>p.id==="P4");
  assertEqual(p4.v,"no","T4 density block");
});

test("Existing conforming use viable when maintained",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",existingRC:"yes",maintained:"yes"}));
  const p5=r.results.find(p=>p.id==="P5");
  assertEqual(p5.v,"yes","existing use should be viable");
});

test("Existing use conditional when maintenance unknown",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",existingRC:"yes",maintained:"unknown"}));
  const p5=r.results.find(p=>p.id==="P5");
  assertEqual(p5.v,"conditional");
});

test("Existing use blocked when not maintained",()=>{
  const r=runEngine(baseForm({zone:"S-SU-Fx",existingRC:"yes",maintained:"no"}));
  const p5=r.results.find(p=>p.id==="P5");
  assertEqual(p5.v,"no");
});

test("Downtown zone has no spacing requirement",()=>{
  const r=runEngine(baseForm({zone:"D-C",distType34:100}));
  const p3=r.results.find(p=>p.id==="P3");
  // D-C is isDtNS, so no spacing applies
  assert(p3.v!=="no"||!p3.stops.some(s=>s.msg.includes("Spacing")),"downtown should not have spacing block");
});

test("I-A/I-B only allow Type 3 and 4",()=>{
  const r=runEngine(baseForm({zone:"I-A"}));
  const p1=r.results.find(p=>p.id==="P1");
  const p2=r.results.find(p=>p.id==="P2");
  const p3=r.results.find(p=>p.id==="P3");
  assertEqual(p1.v,"no","T1 not permitted");
  assertEqual(p2.v,"no","T2 not permitted");
  assert(p3.v!=="no"||!p3.stops.some(s=>s.msg.includes("Not permitted")),"T3 should be permitted in I-A");
});

test("OS zone returns error result for all NP",()=>{
  const r=runEngine(baseForm({zone:"OS-A"}));
  assertEqual(r.results.length,5);
  r.results.forEach(p=>{assertEqual(p.v,"no",p.id+" should be no")});
});

endSuite();

suite("Denver Engine — Fee Population (F8)");

test("P1 standard pathway has rsk.fee",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3"}));
  const p1=r.results.find(p=>p.id==="P1");
  assert(p1.rsk.fee,"P1 should have fee");
  assertEqual(p1.rsk.fee,"$100","P1 fee should be $100");
});

test("P1 religious exemption has no fee",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3",religious:"yes"}));
  const p1=r.results.find(p=>p.id==="P1");
  assert(!p1.rsk.fee,"P1 religious should have no fee");
});

test("P2 pathway has rsk.fee",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3"}));
  const p2=r.results.find(p=>p.id==="P2");
  assert(p2.rsk.fee,"P2 should have fee");
  assertEqual(p2.rsk.fee,"$100","P2 fee should be $100");
});

test("P3 pathway has rsk.fee",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3"}));
  const p3=r.results.find(p=>p.id==="P3");
  assert(p3.rsk.fee,"P3 should have fee");
});

test("P4 pathway has rsk.fee",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3"}));
  const p4=r.results.find(p=>p.id==="P4");
  assert(p4.rsk.fee,"P4 should have fee");
});

test("P5 existing use has no fee",()=>{
  const r=runEngine(baseForm({zone:"S-MX-3",existingRC:"yes",maintained:"yes"}));
  const p5=r.results.find(p=>p.id==="P5");
  assert(!p5.rsk.fee,"P5 should have no fee");
});

endSuite();

/* ═══════════════════════════════════════════════════════════════════
   COS ENGINE TESTS
   ═══════════════════════════════════════════════════════════════════ */
suite("COS Engine — Use Table Coverage");

test("All COS_ZL zones have COS_UT entries (except plan-based)",()=>{
  const planBased=["FBZ","PDZ"];
  const missing=COS_ZL.filter(z=>!COS_UT[z]&&!planBased.includes(z));
  assertEqual(missing.length,0,"Missing COS zones: "+missing.join(", "));
});

test("APD zone is all NP",()=>{
  const u=COS_UT["APD"];
  for(const k of Object.keys(u)){assertEqual(u[k],"N","APD "+k)}
});

endSuite();

suite("COS Engine — Pathway Results");

test("R-4 zone produces HSE + GLR pathways",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes"}));
  assertEqual(r.p2,"pass");
  assert(r.results.length>0,"should have pathways");
  assert(r.results.some(p=>p.id==="HSE-S"),"should have HSE-S");
});

test("Licensing=no blocks all COS pathways",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",licensing:"no"}));
  assertEqual(r.p2,"fail");
});

test("Correctional forces GLR (not HSE)",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",correctional:"yes"}));
  // Correctional means fha=false, so no HSE pathways
  assert(!r.results.some(p=>p.id.startsWith("HSE")),"no HSE when correctional");
  assert(r.results.some(p=>p.id.startsWith("GLR")),"should have GLR");
});

test("FHA unknown produces both HSE and GLR",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"unknown"}));
  assert(r.results.some(p=>p.id.startsWith("HSE")),"should have HSE");
  assert(r.results.some(p=>p.id.startsWith("GLR")),"should have GLR");
});

test("HSE Small viable in R-4 with FHA",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes"}));
  const hseS=r.results.find(p=>p.id==="HSE-S");
  assert(hseS,"HSE-S should exist");
  assertEqual(hseS.v,"yes","HSE-S should be viable");
  assertEqual(hseS.mg,8,"max 8 residents");
});

test("GLR separation blocks when within 1000 ft",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"no",distGLRDetox:800}));
  const glrS=r.results.find(p=>p.id==="GLR-S");
  assertEqual(glrS.v,"no","GLR-S blocked by separation");
  assert(glrS.stops[0].msg.includes("1,000 ft"));
});

test("AL exception bypasses separation",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"no",distGLRDetox:800,nearestAL:"yes"}));
  const glrS=r.results.find(p=>p.id==="GLR-S");
  assert(glrS.v!=="no"||!glrS.stops.some(s=>s.msg.includes("1,000 ft")),"AL exception should bypass separation");
});

test("Hospice pathway appears only when targetTerminal set",()=>{
  const r1=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes"}));
  assert(!r1.results.some(p=>p.id==="HOSPICE"),"no hospice without terminal");
  const r2=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes",targetTerminal:"yes"}));
  assert(r2.results.some(p=>p.id==="HOSPICE"),"hospice with terminal");
});

test("LTC pathway appears only when targetOver60 set",()=>{
  const r1=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes"}));
  assert(!r1.results.some(p=>p.id==="LTC"),"no LTC without over60");
  const r2=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes",targetOver60:"yes"}));
  assert(r2.results.some(p=>p.id==="LTC"),"LTC with over60");
});

test("Existing conforming use in COS",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes",existingRC:"yes",maintained:"yes"}));
  const nc=r.results.find(p=>p.id==="NC");
  assertEqual(nc.v,"yes");
});

endSuite();

/* ═══════════════════════════════════════════════════════════════════
   EPC ENGINE TESTS
   ═══════════════════════════════════════════════════════════════════ */
suite("EPC Engine — Use Table Coverage");

test("All EPC_ZL zones have EPC_UT entries",()=>{
  const missing=EPC_ZL.filter(z=>!EPC_UT[z]);
  assertEqual(missing.length,0,"Missing EPC zones: "+missing.join(", "));
});

test("RVP zone is all NP",()=>{
  const u=EPC_UT["RVP"];
  for(const k of Object.keys(u)){assertEqual(u[k],"N","RVP "+k)}
});

test("EPC_GH_ZONES matches A4 zones",()=>{
  for(const z of EPC_ZL){
    const u=EPC_UT[z];if(!u)continue;
    if(u.gh==="A4"){assert(EPC_GH_ZONES.has(z),"A4 zone "+z+" missing from EPC_GH_ZONES")}
    else{assert(!EPC_GH_ZONES.has(z),"non-A4 zone "+z+" in EPC_GH_ZONES")}
  }
});

endSuite();

suite("EPC Engine — Group Home Pathways");

test("GH zones produce 8 GH pathways + institutional",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000"}));
  assertEqual(r.p2,"pass");
  const ghPaths=r.results.filter(p=>p.id.startsWith("GH-"));
  assertEqual(ghPaths.length,8,"should have 8 GH pathways");
});

test("Sex offender blocks all GH pathways",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000",epcSexOffender:"yes"}));
  const ghPaths=r.results.filter(p=>p.id.startsWith("GH-"));
  ghPaths.forEach(p=>{assertEqual(p.v,"no",p.id+" should be blocked")});
});

test("24-hour operation gets SP-05 posture",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000",op24hr:"yes"}));
  const ghDis=r.results.find(p=>p.id==="GH-DIS-S");
  assert(ghDis.proc.includes("SP-05"),"should have SP-05 proc");
  assertEqual(ghDis.mg,999,"no cap under SP-05");
});

test("Non-24-hour gets code-text posture with blocking caveat",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000",op24hr:"no"}));
  const ghDis=r.results.find(p=>p.id==="GH-DIS-S");
  assert(ghDis.cav.some(c=>c.msg.includes("SP-05")&&c.blocking),"should have blocking SP-05 caveat");
});

test("Non-GH zone has no GH pathways",()=>{
  const r=runEPCEngine(baseForm({zone:"CC"}));
  const ghPaths=r.results.filter(p=>p.id.startsWith("GH-"));
  ghPaths.forEach(p=>{assertEqual(p.v,"no",p.id+" not permitted in CC")});
});

endSuite();

suite("EPC Engine — Institutional Pathways");

test("Rehab facility allowed in CC zone",()=>{
  const r=runEPCEngine(baseForm({zone:"CC"}));
  const rehab=r.results.find(p=>p.id==="REHAB");
  assertEqual(rehab.v,"yes");
  assert(rehab.proc.includes("Allowed"));
});

test("Hospital allowed in CC zone",()=>{
  const r=runEPCEngine(baseForm({zone:"CC"}));
  const hosp=r.results.find(p=>p.id==="HOSP");
  assertEqual(hosp.v,"yes");
});

test("Medical Clinic blocked when overnight=yes",()=>{
  const r=runEPCEngine(baseForm({zone:"CC",overnight:"yes"}));
  const clinic=r.results.find(p=>p.id==="CLINIC");
  assertEqual(clinic.v,"no");
  assert(clinic.stops[0].msg.includes("overnight"));
});

test("Medical Clinic viable when overnight=no",()=>{
  const r=runEPCEngine(baseForm({zone:"CC",overnight:"no"}));
  const clinic=r.results.find(p=>p.id==="CLINIC");
  assertEqual(clinic.v,"yes");
});

test("Half-Way House requires correctional population",()=>{
  const r=runEPCEngine(baseForm({zone:"F-5",correctional:"no"}));
  const half=r.results.find(p=>p.id==="HALF");
  assertEqual(half.v,"no");
  assert(half.stops[0].msg.includes("probation/parole"));
});

test("Half-Way House viable with correctional in eligible zone",()=>{
  const r=runEPCEngine(baseForm({zone:"F-5",correctional:"yes"}));
  const half=r.results.find(p=>p.id==="HALF");
  assert(half.v!=="no"||!half.stops.some(s=>s.msg.includes("probation")),"should be viable with correctional");
});

test("Institution Philanthropic requires nonprofit",()=>{
  const r=runEPCEngine(baseForm({zone:"F-5",epcNonprofit:"no"}));
  const phil=r.results.find(p=>p.id==="PHIL");
  assertEqual(phil.v,"no");
  assert(phil.stops[0].msg.includes("not-for-profit"));
});

test("Institution Philanthropic viable with nonprofit in eligible zone",()=>{
  const r=runEPCEngine(baseForm({zone:"F-5",epcNonprofit:"yes"}));
  const phil=r.results.find(p=>p.id==="PHIL");
  assert(phil.v!=="no"||!phil.stops.some(s=>s.msg.includes("not-for-profit")),"should be viable with nonprofit");
});

test("PUD returns error",()=>{
  const r=runEPCEngine(baseForm({zone:"PUD"}));
  assert(r.error,"PUD should return error");
  assert(r.error.includes("PUD"));
});

test("Licensing=no blocks all EPC pathways",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000",licensing:"no"}));
  assertEqual(r.p2,"fail");
});

test("Existing conforming use in EPC",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000",existingRC:"yes",maintained:"yes"}));
  const nc=r.results.find(p=>p.id==="NC");
  assertEqual(nc.v,"yes");
});

endSuite();

suite("COS Engine — Fee Population (F8 verification)");

test("HSE-S has rsk.fee",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes"}));
  const hse=r.results.find(p=>p.id==="HSE-S");
  assert(hse&&hse.rsk.fee,"HSE-S should have fee");
});

test("NC existing use has no fee",()=>{
  const r=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes",existingRC:"yes",maintained:"yes"}));
  const nc=r.results.find(p=>p.id==="NC");
  assert(!nc.rsk.fee,"NC should have no fee");
});

endSuite();

suite("EPC Engine — Fee Population (F8 verification)");

test("GH-DIS-S has rsk.fee",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000"}));
  const gh=r.results.find(p=>p.id==="GH-DIS-S");
  assert(gh&&gh.rsk.fee,"GH-DIS-S should have fee");
});

test("NC existing use has no fee",()=>{
  const r=runEPCEngine(baseForm({zone:"RS-20000",existingRC:"yes",maintained:"yes"}));
  const nc=r.results.find(p=>p.id==="NC");
  assert(!nc.rsk.fee,"NC should have no fee");
});

endSuite();

/* ═══════════════════════════════════════════════════════════════════
   MANITOU SPRINGS ENGINE TESTS
   ═══════════════════════════════════════════════════════════════════ */
suite("Manitou — Use Table Coverage");

test("All MAN_ZL zones have MAN_UT entries",()=>{
  const missing=MAN_ZL.filter(z=>!MAN_UT[z]);
  assertEqual(missing.length,0,"Missing zones: "+missing.join(", "));
});

test("MAN_UT entries have required keys",()=>{
  for(const z of MAN_ZL){
    const u=MAN_UT[z];assert(u,"Missing MAN_UT for "+z);
    for(const k of["ghSmall","ghLarge","ltc","ccrc","medOff","hcSup","medCare","boarding"]){
      assert(k in u,"Missing "+k+" for "+z);
    }
  }
});

test("OS/P/PF zones are all N",()=>{
  for(const z of["OS","P","PF"]){
    const u=MAN_UT[z];
    for(const k of Object.keys(u)){assertEqual(u[k],"N",z+" "+k)}
  }
});

test("GH Small is P in all non-public zones",()=>{
  for(const z of["GR","LDR","HDR","HLDR","DWTN","C","MUC"]){
    assertEqual(MAN_UT[z].ghSmall,"P",z+" ghSmall");
  }
});

test("C zone has broadest eligibility — all 8 use types P",()=>{
  const u=MAN_UT["C"];
  for(const k of Object.keys(u)){assertEqual(u[k],"P","C zone "+k)}
});

test("GH Large is C in GR/LDR/HLDR, P in HDR/DWTN/C/MUC",()=>{
  assertEqual(MAN_UT["GR"].ghLarge,"C");
  assertEqual(MAN_UT["LDR"].ghLarge,"C");
  assertEqual(MAN_UT["HLDR"].ghLarge,"C");
  assertEqual(MAN_UT["HDR"].ghLarge,"P");
  assertEqual(MAN_UT["DWTN"].ghLarge,"P");
  assertEqual(MAN_UT["C"].ghLarge,"P");
  assertEqual(MAN_UT["MUC"].ghLarge,"P");
});

test("HC-SUP is P in C, C in MUC",()=>{
  assertEqual(MAN_UT["C"].hcSup,"P");
  assertEqual(MAN_UT["MUC"].hcSup,"C");
});

endSuite();

suite("Manitou — Zone Helper Functions");

test("manIsRes identifies residential zones",()=>{
  assert(manIsRes("GR"));assert(manIsRes("HDR"));
  assert(!manIsRes("DWTN"));assert(!manIsRes("OS"));
});

test("manIsComm identifies commercial zones",()=>{
  assert(manIsComm("DWTN"));assert(manIsComm("C"));assert(manIsComm("MUC"));
  assert(!manIsComm("GR"));assert(!manIsComm("PF"));
});

test("manIsPublic identifies public zones",()=>{
  assert(manIsPublic("OS"));assert(manIsPublic("P"));assert(manIsPublic("PF"));
  assert(!manIsPublic("GR"));assert(!manIsPublic("C"));
});

test("manTitle15Cap calculates correctly",()=>{
  assertEqual(manTitle15Cap(null),null,"null sqft");
  assertEqual(manTitle15Cap(50),1,"50 sf — minimum 1 for any positive sqft");
  assertEqual(manTitle15Cap(100),1,"100 sf");
  assertEqual(manTitle15Cap(250),2,"250 sf — boundary of tier 2");
  assertEqual(manTitle15Cap(475),5,"475 sf — boundary of tier 5");
  assertEqual(manTitle15Cap(535),6,"535 sf — boundary of tier 6");
  assertEqual(manTitle15Cap(850),12,"850 sf cap");
  // Above 850, formula caps at 850 input
  assertEqual(manTitle15Cap(2000),12,"2000 sf still capped");
});

endSuite();

suite("Manitou — GH Small Pathway");

test("GH-SM permitted in GR zone",()=>{
  const r=runManitouEngine(baseForm({zone:"GR"}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  assert(ghSm,"GH-SM should exist");
  assertEqual(ghSm.v,"yes");
  assert(ghSm.proc.includes("Permitted"));
});

test("GH-SM blocked in OS zone (public zone error)",()=>{
  const r=runManitouEngine(baseForm({zone:"OS"}));
  assert(r.error,"should return error for public zone");
});

test("G-01: on_site_treatment=yes blocks GH-SM",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manOnSiteTreatment:"yes"}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  assertEqual(ghSm.v,"no","treatment blocks GH-SM");
  assert(ghSm.stops.some(s=>s.msg.includes("medical or psychological treatment")));
});

test("G-01: on_site_treatment=unknown creates blocking caveat",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manOnSiteTreatment:"unknown"}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  assertEqual(ghSm.v,"conditional");
  assert(ghSm.cav.some(c=>c.msg.includes("Classification depends")&&c.blocking));
});

test("G-02: general population triggers blocking caveat",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manPopulationType:"general"}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  assert(ghSm.cav.some(c=>c.msg.includes("FHA-protected")&&c.blocking));
});

test("G-02: behavioral population passes FHA check",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manPopulationType:"behavioral"}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  assert(ghSm.cav.some(c=>c.msg.includes("qualifies as FHA-protected")&&!c.blocking));
});

test("GH-SM Title 15 cap constrains max when sqft provided",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manDwellingUnitSqft:350}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  // 350 sf → Title 15 cap = 4 persons (325≤sf<400 bracket); GH-SM zoning max = 8; controlling = 4
  assertEqual(ghSm.mg,4,"Controlling max should be Title 15 cap of 4");
});

endSuite();

suite("Manitou — GH Large Pathway");

test("GH-LG in HDR = Permitted",()=>{
  const r=runManitouEngine(baseForm({zone:"HDR"}));
  const ghLg=r.results.find(p=>p.id==="GH-LG");
  assertEqual(ghLg.v,"yes");
  assert(ghLg.proc.includes("Permitted"));
});

test("GH-LG in GR = CUP required",()=>{
  const r=runManitouEngine(baseForm({zone:"GR"}));
  const ghLg=r.results.find(p=>p.id==="GH-LG");
  assert(ghLg.proc.includes("CUP"));
});

test("G-12: natural hazard + CUP = blocked",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manNaturalHazard:"yes"}));
  const ghLg=r.results.find(p=>p.id==="GH-LG");
  assertEqual(ghLg.v,"no","hazard blocks CUP pathway");
  assert(ghLg.stops.some(s=>s.msg.includes("natural hazards")));
});

test("G-12: natural hazard + Permitted = not blocked",()=>{
  const r=runManitouEngine(baseForm({zone:"HDR",manNaturalHazard:"yes"}));
  const ghLg=r.results.find(p=>p.id==="GH-LG");
  // HDR is P, so hazard doesn't block (only blocks CUP)
  assert(ghLg.v!=="no"||!ghLg.stops.some(s=>s.msg.includes("natural hazards")),"hazard should not block by-right pathway");
});

test("Medical care triggers classification ambiguity caveat",()=>{
  const r=runManitouEngine(baseForm({zone:"HDR",manProvidesMedCare:"yes"}));
  const ghLg=r.results.find(p=>p.id==="GH-LG");
  assert(ghLg.cav.some(c=>c.msg.includes("boundary between Group Home Large and Medical Care")));
});

endSuite();

suite("Manitou — Institutional Pathways");

test("LTC permitted in HDR, blocked in GR",()=>{
  const r1=runManitouEngine(baseForm({zone:"HDR",manFullTimeNursing:"yes"}));
  const ltc1=r1.results.find(p=>p.id==="LTC");
  assertEqual(ltc1.v,"yes");

  const r2=runManitouEngine(baseForm({zone:"GR",manFullTimeNursing:"yes"}));
  const ltc2=r2.results.find(p=>p.id==="LTC");
  assertEqual(ltc2.v,"no");
  assert(ltc2.stops.some(s=>s.msg.includes("Not permitted")));
});

test("CCRC permitted in C zone",()=>{
  const r=runManitouEngine(baseForm({zone:"C",manPopulationType:"elderly"}));
  const ccrc=r.results.find(p=>p.id==="CCRC");
  assertEqual(ccrc.v,"yes");
});

test("MED-OFF: overnight blocks",()=>{
  const r=runManitouEngine(baseForm({zone:"DWTN",manOvernightBeds:"yes"}));
  const mo=r.results.find(p=>p.id==="MED-OFF");
  assertEqual(mo.v,"no");
  assert(mo.stops.some(s=>s.msg.includes("overnight")));
});

test("MED-OFF: outpatient viable in DWTN",()=>{
  const r=runManitouEngine(baseForm({zone:"DWTN",manOvernightBeds:"no"}));
  const mo=r.results.find(p=>p.id==="MED-OFF");
  assertEqual(mo.v,"yes");
});

test("HC-SUP: CUP in MUC",()=>{
  const r=runManitouEngine(baseForm({zone:"MUC"}));
  const hc=r.results.find(p=>p.id==="HC-SUP");
  assert(hc.proc.includes("CUP"),"HC-SUP should require CUP in MUC");
});

test("MED-CARE: P in C, C in MUC",()=>{
  const r1=runManitouEngine(baseForm({zone:"C"}));
  const mc1=r1.results.find(p=>p.id==="MED-CARE");
  assert(mc1.proc.includes("Permitted"),"MED-CARE P in C");

  const r2=runManitouEngine(baseForm({zone:"MUC"}));
  const mc2=r2.results.find(p=>p.id==="MED-CARE");
  assert(mc2.proc.includes("CUP"),"MED-CARE CUP in MUC");
});

endSuite();

suite("Manitou — Boarding House");

test("Boarding House: medical care blocks",()=>{
  const r=runManitouEngine(baseForm({zone:"DWTN",manProvidesMedCare:"yes"}));
  const bh=r.results.find(p=>p.id==="BOARD");
  assertEqual(bh.v,"no");
  assert(bh.stops.some(s=>s.msg.includes("medical or personal care")));
});

test("Boarding House: personal care blocks",()=>{
  const r=runManitouEngine(baseForm({zone:"DWTN",manProvidesPersonalCare:"yes"}));
  const bh=r.results.find(p=>p.id==="BOARD");
  assertEqual(bh.v,"no");
});

test("Boarding House: CUP in GR",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manProvidesMedCare:"no",manProvidesPersonalCare:"no"}));
  const bh=r.results.find(p=>p.id==="BOARD");
  assert(bh.proc.includes("CUP"),"Boarding should require CUP in GR");
});

test("Boarding House: P in DWTN",()=>{
  const r=runManitouEngine(baseForm({zone:"DWTN",manProvidesMedCare:"no",manProvidesPersonalCare:"no"}));
  const bh=r.results.find(p=>p.id==="BOARD");
  assert(bh.proc.includes("Permitted"),"Boarding P in DWTN");
});

test("Boarding House not permitted in LDR",()=>{
  const r=runManitouEngine(baseForm({zone:"LDR"}));
  const bh=r.results.find(p=>p.id==="BOARD");
  assertEqual(bh.v,"no");
  assert(bh.stops.some(s=>s.msg.includes("Not permitted")));
});

endSuite();

suite("Manitou — Nonconforming Use");

test("Preexisting + not discontinued = viable",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manPreexistingUse:"yes",existingRC:"yes",maintained:"yes",manMonthsDiscontinued:0}));
  const nc=r.results.find(p=>p.id==="NC");
  assert(nc.v==="yes"||nc.v==="conditional","NC should be viable");
});

test("G-03: discontinued > 12 months = blocked",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manPreexistingUse:"yes",existingRC:"yes",manMonthsDiscontinued:15}));
  const nc=r.results.find(p=>p.id==="NC");
  assertEqual(nc.v,"no");
  assert(nc.stops.some(s=>s.msg.includes("discontinued")));
});

test("G-04: proposed expansion = blocked",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manPreexistingUse:"yes",existingRC:"yes",manProposedExpansion:"yes",manMonthsDiscontinued:0}));
  const nc=r.results.find(p=>p.id==="NC");
  assertEqual(nc.v,"no");
  assert(nc.stops.some(s=>s.msg.includes("Enlargement")));
});

test("No preexisting use = blocked",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manPreexistingUse:"no",existingRC:"no"}));
  const nc=r.results.find(p=>p.id==="NC");
  assertEqual(nc.v,"no");
});

endSuite();

suite("Manitou — Global Rules & Caveats");

test("G-10: Commercial zone noise caveat in C zone",()=>{
  const r=runManitouEngine(baseForm({zone:"C"}));
  assert(r.gC.some(c=>c.msg.includes("noise")),"should have noise caveat");
});

test("G-11: MUC zone URA routing caveat",()=>{
  const r=runManitouEngine(baseForm({zone:"MUC"}));
  assert(r.gC.some(c=>c.msg.includes("Urban Renewal")),"should have URA caveat");
});

test("Historic district caveat when historic=yes",()=>{
  const r=runManitouEngine(baseForm({zone:"GR",manHistoricDistrict:"yes"}));
  assert(r.gC.some(c=>c.msg.includes("Historic District")),"should have historic caveat");
});

test("FHA reasonable accommodation caveat always present",()=>{
  const r=runManitouEngine(baseForm({zone:"GR"}));
  assert(r.gC.some(c=>c.msg.includes("reasonable accommodation")),"should have FHA caveat");
});

test("C zone produces all 9 pathways",()=>{
  const r=runManitouEngine(baseForm({zone:"C"}));
  assertEqual(r.results.length,9,"should have 9 pathways in C zone");
});

test("Engine returns p2=pass with no global stops",()=>{
  const r=runManitouEngine(baseForm({zone:"C"}));
  assertEqual(r.p2,"pass");
  assertEqual(r.gS.length,0,"no global hard stops");
});

endSuite();

/* ═══════════════════════════════════════════════════════════════════
   STATE & VALIDATION TESTS
   ═══════════════════════════════════════════════════════════════════ */
suite("State Management");

test("createDefaultState produces valid state",()=>{
  const s=createDefaultState();
  assertEqual(s.jurisdiction,null);
  assertEqual(s.pg,0);
  assertEqual(s.gisPhase,"idle");
  assertEqual(s.form.zone,null);
});

test("resetState clears state",()=>{
  ST.jurisdiction="denver";ST.pg=5;ST.form.zone="S-SU-Fx";
  resetState(false);
  assertEqual(ST.jurisdiction,null);
  assertEqual(ST.pg,0);
  assertEqual(ST.form.zone,null);
});

test("resetState keeps jurisdiction when flagged",()=>{
  ST.jurisdiction="cos";ST.pg=5;
  resetState(true);
  assertEqual(ST.jurisdiction,"cos");
  assertEqual(ST.pg,0);
});

endSuite();

suite("GIS Phase State Machine");

test("Valid transition: idle → searching",()=>{
  ST.gisPhase="idle";
  assert(setGisPhase("searching"),"should allow idle→searching");
  assertEqual(ST.gisPhase,"searching");
});

test("Valid transition: searching → disambig",()=>{
  ST.gisPhase="searching";
  assert(setGisPhase("disambig"),"should allow searching→disambig");
});

test("Valid transition: searching → querying",()=>{
  ST.gisPhase="searching";
  assert(setGisPhase("querying"),"should allow searching→querying");
});

test("Invalid transition: idle → done (rejected)",()=>{
  ST.gisPhase="idle";
  assert(!setGisPhase("done"),"should reject idle→done");
  assertEqual(ST.gisPhase,"idle","phase should not change");
});

test("Invalid transition: done → searching (rejected)",()=>{
  ST.gisPhase="done";
  assert(!setGisPhase("searching"),"should reject done→searching");
});

test("Valid transition: done → idle",()=>{
  ST.gisPhase="done";
  assert(setGisPhase("idle"),"should allow done→idle");
});

// Reset state for clean exit
resetState(false);

endSuite();

suite("Input Validation");

test("validateNumeric accepts valid numbers",()=>{
  const r=validateNumeric(15000,"Lot size",1,10000000);
  assert(r.valid);assertEqual(r.value,15000);
});

test("validateNumeric rejects NaN",()=>{
  const r=validateNumeric("abc","Lot size",1);
  assert(!r.valid);assert(r.error.includes("number"));
});

test("validateNumeric rejects below min",()=>{
  const r=validateNumeric(-5,"Lot size",0);
  assert(!r.valid);assert(r.error.includes("at least"));
});

test("validateNumeric accepts null/empty",()=>{
  assert(validateNumeric(null,"test").valid);
  assert(validateNumeric("","test").valid);
  assertEqual(validateNumeric(null,"test").value,null);
});

test("validateFormBeforeEngine catches bad lot size",()=>{
  ST.form.lotSize=-100;
  const errors=validateFormBeforeEngine();
  assert(errors.length>0,"should have errors");
  assert(errors[0].includes("Lot size"));
  ST.form.lotSize=null; // cleanup
});

endSuite();

/* ═══════════════════════════════════════════════════════════════════
   C11 CRITICAL — Previously missing test coverage
   ═══════════════════════════════════════════════════════════════════ */
suite("COS Engine — Detox / Shelter / FBZ / PDZ");

test("Detox blocked by separation when within 1000 ft",()=>{
  const r=runCOSEngine(baseForm({zone:"MX-M",fhaProtected:"yes",distGLRDetox:500}));
  const detox=r.results.find(p=>p.id==="DETOX");
  assert(detox,"DETOX should exist");
  assertEqual(detox.v,"no","DETOX blocked by separation");
  assert(detox.stops.some(s=>s.msg.includes("1,000 ft")),"stop should mention 1,000 ft");
});

test("Detox viable when beyond 1000 ft",()=>{
  const r=runCOSEngine(baseForm({zone:"MX-M",fhaProtected:"yes",distGLRDetox:2000}));
  const detox=r.results.find(p=>p.id==="DETOX");
  assert(detox,"DETOX should exist");
  assert(detox.v!=="no"||!detox.stops.some(s=>s.msg.includes("1,000 ft")),"DETOX should not be blocked by separation");
});

test("Shelter appears only when tempShelter set",()=>{
  const r1=runCOSEngine(baseForm({zone:"MX-M",fhaProtected:"yes"}));
  assert(!r1.results.some(p=>p.id==="SHELTER"),"no shelter without tempShelter");
  const r2=runCOSEngine(baseForm({zone:"MX-M",fhaProtected:"yes",tempShelter:"yes"}));
  assert(r2.results.some(p=>p.id==="SHELTER"),"shelter with tempShelter=yes");
});

test("FBZ zone does not crash — returns pathways",()=>{
  const r=runCOSEngine(baseForm({zone:"FBZ",fhaProtected:"yes",fbzPermits:"unknown"}));
  assertEqual(r.p2,"pass","FBZ should not error");
  assert(r.results.length>0,"should have pathways");
});

test("FBZ with permits=no blocks pathways",()=>{
  const r=runCOSEngine(baseForm({zone:"FBZ",fhaProtected:"yes",fbzPermits:"no"}));
  const hseS=r.results.find(p=>p.id==="HSE-S");
  assertEqual(hseS.v,"no","HSE-S blocked by FBZ permits=no");
});

test("PDZ zone does not crash — returns pathways",()=>{
  const r=runCOSEngine(baseForm({zone:"PDZ",fhaProtected:"yes",pdzPermits:"unknown"}));
  assertEqual(r.p2,"pass","PDZ should not error");
  assert(r.results.length>0,"should have pathways");
});

test("PDZ HSE Small always permitted",()=>{
  const r=runCOSEngine(baseForm({zone:"PDZ",fhaProtected:"yes",pdzPermits:"no"}));
  const hseS=r.results.find(p=>p.id==="HSE-S");
  assert(hseS,"HSE-S should exist in PDZ");
  assertEqual(hseS.v,"yes","HSE-S always permitted in PDZ residential");
});

endSuite();

suite("EPC Engine — Separation & CAD-O");

test("EPC separation null produces blocking caveat",()=>{
  const r=runEPCEngine(baseForm({zone:"RR-5",epcSeparation:null}));
  const ghS=r.results.find(p=>p.id==="GH-DIS-S");
  if(ghS&&ghS.v!=="no"){
    // Should have blocking caveat about unknown separation
    const hasSepCav=ghS.cav.some(c=>c.msg.toLowerCase().includes("separation"));
    assert(hasSepCav,"should have separation caveat when null");
  }
});

test("EPC CAD-O overlay produces caveat on institutional pathway",()=>{
  const r=runEPCEngine(baseForm({zone:"CC",epcCadO:"cado",overnight:"yes"}));
  const hosp=r.results.find(p=>p.id==="HOSP");
  assert(hosp,"HOSP pathway should exist in CC zone");
  const hasCadCav=hosp.cav.some(c=>c.msg.toLowerCase().includes("cad"));
  assert(hasCadCav,"should have CAD-O caveat on hospital pathway");
});

endSuite();

suite("Manitou — Construction Scope Branches");

test("Minor construction scope changes risk and workflow",()=>{
  const r=runManitouEngine(baseForm({zone:"C",manConstructionScope:"minor"}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  assert(ghSm,"GH-SM should exist");
  assertEqual(ghSm.rank,"Good","minor scope should rank Good");
  assert(ghSm.rsk.fee.includes("600"),"minor fee should reference $600");
});

test("Major construction scope changes risk and workflow",()=>{
  const r=runManitouEngine(baseForm({zone:"C",manConstructionScope:"major"}));
  const ghSm=r.results.find(p=>p.id==="GH-SM");
  assert(ghSm,"GH-SM should exist");
  assertEqual(ghSm.rank,"Moderate","major scope should rank Moderate");
  assert(ghSm.rsk.fee.includes("1,200"),"major fee should reference $1,200");
});

test("Title 15 cap returns null for zero sqft",()=>{
  assertEqual(manTitle15Cap(0),null,"0 sqft should return null");
  assertEqual(manTitle15Cap(-100),null,"negative sqft should return null");
  assertEqual(manTitle15Cap(null),null,"null should return null");
});

endSuite();

/* ── Summary ──────────────────────────────────────────────────── */
output.innerHTML+=`<div class="summary">` +
  `<span class="pass">✓ ${totalPass} passed</span> · ` +
  `<span class="fail">${totalFail>0?"✗ "+totalFail+" failed":"0 failed"}</span>` +
  `</div>`;

if(totalFail>0){document.title="FAIL — "+totalFail+" test(s)"}
else{document.title="ALL PASS — "+totalPass+" tests"}
