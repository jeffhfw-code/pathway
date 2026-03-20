/* ═══════════════════════════════════════════════════════════════════
   APPLICATION STATE — Centralized state management with validation
   ═══════════════════════════════════════════════════════════════════ */

function createDefaultForm(){
  return{
    address:null,zone:null,lotSize:null,existingRC:null,maintained:null,
    religious:null,correctional:null,rcWithin1mi:null,rcType34within1mi:null,
    distType34:null,op24hr:null,overnight:null,licensing:null,
    // COS-specific
    fhaProtected:null,constructionType:null,fbzPermits:null,pdzPermits:null,
    targetOver60:null,targetTerminal:null,tempShelter:null,cosOverlays:[],
    distGLRDetox:null,nearestAL:null,
    // EPC-specific
    epcSexOffender:null,epcNonprofit:null,epcSeparation:null,epcCadO:null
  };
}

function createDefaultState(){
  return{
    jurisdiction:null,
    pg:0,
    form:createDefaultForm(),
    results:null,activeTab:"dashboard",expanded:{},
    gisPhase:"idle",gisError:null,gisAddresses:null,gisData:null,
    gisAutoZone:null,gisAutoLot:null,gisAutoRC:null,gisAutoRC34:null,
    gisAutoDist34:null,gisOverrides:{},
    // COS GIS extras
    cosAutoOverlays:[],cosAutoNNA:null,cosAutoAPZ:null,cosAutoFacilities:[],
    cosAutoALR:0,cosAutoCUP:[],cosAutoUV:[],cosAutoNearestFacDist:null,
    cosAutoNearestFacName:null,cosAutoNearestFacIsALR:false,
    // EPC infrastructure
    epcInfraStatus:null,epcInfraDistrict:null,epcInfraChecking:false
  };
}

let ST=createDefaultState();

function resetState(keepJurisdiction){
  const jur=keepJurisdiction?ST.jurisdiction:null;
  ST=createDefaultState();
  ST.jurisdiction=jur;
}

/* ── GIS Phase State Machine ──────────────────────────────────── */
function setGisPhase(newPhase){
  const allowed=GIS_TRANSITIONS[ST.gisPhase];
  if(!allowed||!allowed.includes(newPhase)){
    console.warn("Invalid GIS phase transition: "+ST.gisPhase+" → "+newPhase);
    return false;
  }
  ST.gisPhase=newPhase;
  return true;
}

/* ── Input Validation ─────────────────────────────────────────── */
function validateNumeric(value,fieldName,min,max){
  if(value===null||value===undefined||value==="")return{valid:true,value:null};
  const num=Number(value);
  if(isNaN(num)){return{valid:false,value:null,error:fieldName+" must be a number"}}
  if(min!==undefined&&num<min){return{valid:false,value:num,error:fieldName+" must be at least "+min}}
  if(max!==undefined&&num>max){return{valid:false,value:num,error:fieldName+" must be at most "+max.toLocaleString()}}
  return{valid:true,value:num};
}

function validateFormBeforeEngine(){
  const f=ST.form;const errors=[];
  // Lot size: must be positive if provided
  if(f.lotSize!==null){
    const r=validateNumeric(f.lotSize,"Lot size",1,10000000);
    if(!r.valid)errors.push(r.error);
    else f.lotSize=r.value;
  }
  // RC counts: must be non-negative integers if provided
  if(f.rcWithin1mi!==null){
    const r=validateNumeric(f.rcWithin1mi,"RC within 1 mi",0,999);
    if(!r.valid)errors.push(r.error);
    else f.rcWithin1mi=r.value;
  }
  if(f.rcType34within1mi!==null){
    const r=validateNumeric(f.rcType34within1mi,"Type 3/4 within 1 mi",0,999);
    if(!r.valid)errors.push(r.error);
    else f.rcType34within1mi=r.value;
  }
  // Distances: must be non-negative if provided
  if(f.distType34!==null){
    const r=validateNumeric(f.distType34,"Distance to nearest 3/4",0,999999);
    if(!r.valid)errors.push(r.error);
    else f.distType34=r.value;
  }
  if(f.distGLRDetox!==null){
    const r=validateNumeric(f.distGLRDetox,"Distance to GLR/Detox",0,999999);
    if(!r.valid)errors.push(r.error);
    else f.distGLRDetox=r.value;
  }
  if(f.epcSeparation!==null){
    const r=validateNumeric(f.epcSeparation,"Separation distance",0,999999);
    if(!r.valid)errors.push(r.error);
    else f.epcSeparation=r.value;
  }
  return errors;
}
