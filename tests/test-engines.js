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
    epcSexOffender:"no",epcNonprofit:"no",epcSeparation:null,epcCadO:"none"
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
  const r2=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes",targetTerminal:true}));
  assert(r2.results.some(p=>p.id==="HOSPICE"),"hospice with terminal");
});

test("LTC pathway appears only when targetOver60 set",()=>{
  const r1=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes"}));
  assert(!r1.results.some(p=>p.id==="LTC"),"no LTC without over60");
  const r2=runCOSEngine(baseForm({zone:"R-4",fhaProtected:"yes",targetOver60:true}));
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

/* ── Summary ──────────────────────────────────────────────────── */
output.innerHTML+=`<div class="summary">` +
  `<span class="pass">✓ ${totalPass} passed</span> · ` +
  `<span class="fail">${totalFail>0?"✗ "+totalFail+" failed":"0 failed"}</span>` +
  `</div>`;

if(totalFail>0){document.title="FAIL — "+totalFail+" test(s)"}
else{document.title="ALL PASS — "+totalPass+" tests"}
