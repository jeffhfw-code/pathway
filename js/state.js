/* ═══════════════════════════════════════════════════════════════════
   APPLICATION STATE — Centralized state management with validation
   ═══════════════════════════════════════════════════════════════════ */

function createDefaultForm(){
  return Object.assign({
    address:null,zone:null,lotSize:null,existingRC:null,maintained:null,
    religious:null,correctional:null,rcWithin1mi:null,rcType34within1mi:null,
    distType34:null,op24hr:null,overnight:null,licensing:null,
    // COS-specific
    fhaProtected:null,constructionType:null,fbzPermits:null,pdzPermits:null,
    targetOver60:null,targetTerminal:null,tempShelter:null,cosOverlays:[],
    distGLRDetox:null,nearestAL:null,
    // EPC-specific
    epcSexOffender:null,epcNonprofit:null,epcSeparation:null,epcCadO:null,
    // Manitou Springs-specific
    manClinicalDetox:null,manMATDispensing:null,manMedManagement:null,
    manNursing24hr:null,manOtherMedical:null,
    manOvernightBeds:null,manProvidesPersonalCare:null,
    manPreexistingUse:null,manMonthsDiscontinued:null,manProposedExpansion:null,
    manNaturalHazard:null,manHistoricDistrict:null,manConstructionScope:null,
    manDwellingUnitSqft:null
  },FORM_DEFAULTS);
}

function createDefaultState(){
  return{
    jurisdiction:null,autoDetectPhase:null,autoDetectError:null,
    pg:0,
    form:createDefaultForm(),
    results:null,activeTab:"dashboard",expanded:{},
    showSaved:false,showCompare:false,showGlossary:false,compareIds:[],checklistState:{},glossaryFilter:"all",
    gisPhase:"idle",gisError:null,gisAddresses:null,gisData:null,
    gisAutoZone:null,gisAutoLot:null,gisAutoRC:null,gisAutoRC34:null,
    gisAutoDist34:null,gisOverrides:{},
    // COS GIS extras
    cosAutoOverlays:[],cosAutoNNA:null,cosAutoAPZ:null,cosAutoFacilities:[],
    cosAutoALR:0,cosAutoCUP:[],cosAutoUV:[],cosAutoNearestFacDist:null,
    cosAutoNearestFacName:null,cosAutoNearestFacIsALR:false,
    // EPC infrastructure
    epcInfraStatus:null,epcInfraDistrict:null,epcInfraChecking:false,
    // EPC CDPHE facilities
    epcAutoFacilities:[],epcAutoNearestFacDist:null,epcAutoNearestFacName:null,
    // Manitou Springs GIS + Spatialest
    manAutoZone:null,manAutoBuildingSqft:null,manAutoYearBuilt:null,
    manAutoLotSize:null,manAutoBeds:null,manAutoParcelId:null,
    manAutoAssessorLink:null,manAutoHazard:null,manAutoHistoric:null,
    manAutoBuildingUse:null
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
  // Manitou Springs validations
  if(f.manDwellingUnitSqft!==null){
    const r=validateNumeric(f.manDwellingUnitSqft,"Dwelling unit sqft",100,100000);
    if(!r.valid)errors.push(r.error);
    else f.manDwellingUnitSqft=r.value;
  }
  if(f.manMonthsDiscontinued!==null){
    const r=validateNumeric(f.manMonthsDiscontinued,"Months discontinued",0,999);
    if(!r.valid)errors.push(r.error);
    else f.manMonthsDiscontinued=r.value;
  }
  return errors;
}

/* ═══════════════════════════════════════════════════════════════════
   SHAREABLE URL (F4)
   ═══════════════════════════════════════════════════════════════════ */
function stateToHash(){
  // Compact serialization: only include non-null, non-default form values
  const defaults=createDefaultForm();
  const f={};
  for(const[k,v] of Object.entries(ST.form)){
    if(v!==null&&v!==undefined&&v!==defaults[k]){
      // Skip empty arrays
      if(Array.isArray(v)&&v.length===0&&Array.isArray(defaults[k])&&defaults[k].length===0)continue;
      f[k]=v;
    }
  }
  return"#"+btoa(unescape(encodeURIComponent(JSON.stringify({j:ST.jurisdiction,f}))));
}

function hydrateFromHash(){
  if(!location.hash||location.hash.length<2)return false;
  try{
    const payload=JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
    if(payload.j&&payload.f&&typeof payload.f==="object"&&!Array.isArray(payload.f)){
      const validJurs=["denver","cos","epc","manitou"];
      if(!validJurs.includes(payload.j))return false;
      // Only allow keys that exist in the default form (prevent prototype pollution)
      const defaults=createDefaultForm();
      const safeForm={};
      for(const k of Object.keys(payload.f)){
        if(k==="__proto__"||k==="constructor"||k==="prototype")continue;
        if(!(k in defaults))continue;
        const v=payload.f[k];
        if(v!==null&&typeof v==="object"&&!Array.isArray(v))continue;
        safeForm[k]=v;
      }
      ST.jurisdiction=payload.j;
      ST.form=Object.assign(createDefaultForm(),safeForm);
      return true;
    }
  }catch(e){console.warn("Invalid hash:",e)}
  return false;
}

function shareURL(){
  history.replaceState(null,"",stateToHash());
  const url=location.href;
  // Use Web Share API on mobile (handles long URLs properly in iOS share sheet)
  if(navigator.share){
    navigator.share({title:"Pathway Analysis — "+(ST.form.address||"Results"),url}).catch(()=>{});
    return;
  }
  // Desktop fallback: clipboard copy
  navigator.clipboard.writeText(url).then(()=>{
    const t=document.createElement("div");
    t.textContent="Link copied!";
    t.style.cssText="position:fixed;top:16px;right:16px;background:#1A3D28;color:#4ADE80;padding:8px 16px;border-radius:8px;font-size:13px;z-index:9999;";
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2000);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   SAVED ANALYSES (F5)
   ═══════════════════════════════════════════════════════════════════ */
function savedAnalyses(){return JSON.parse(localStorage.getItem("pw-saved")||"[]")}

function saveAnalysis(summary){
  const list=savedAnalyses();
  list.unshift({id:String(Date.now()),ts:Date.now(),jurisdiction:ST.jurisdiction,address:ST.form.address,zone:ST.form.zone,form:{...ST.form},summary});
  localStorage.setItem("pw-saved",JSON.stringify(list));
}

function deleteAnalysis(id){
  const list=savedAnalyses().filter(a=>a.id!==id);
  localStorage.setItem("pw-saved",JSON.stringify(list));
}

function loadAnalysis(id){
  const a=savedAnalyses().find(x=>x.id===id);
  if(!a)return;
  resetState();
  ST.jurisdiction=a.jurisdiction;
  ST.form=Object.assign(createDefaultForm(),a.form);
  go();
}
