/* ═══════════════════════════════════════════════════════════════════
   GIS LOOKUP MODULE — Unified lookup flow + jurisdiction-specific queries
   Dependencies: config.js (endpoints), state.js (ST, setGisPhase)
   ═══════════════════════════════════════════════════════════════════ */

/* ── Shared: Haversine distance ───────────────────────────────── */
function gisHav(a1,o1,a2,o2){
  const R=3958.8,dLa=(a2-a1)*Math.PI/180,dLo=(o2-o1)*Math.PI/180;
  const a=Math.sin(dLa/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/* ── Unified lookup flow controller ───────────────────────────── */
async function gisUnifiedStart(inputId,findFn,runFn,errorContext){
  const raw=document.getElementById(inputId).value.trim();
  if(!raw)return;
  ST.form.address=raw;setGisPhase("searching");ST.gisError=null;render();
  try{
    const candidates=await findFn(raw);
    if(candidates.length===0){
      setGisPhase("error");
      ST.gisError="No matching address found in "+errorContext+". Check spelling or include the directional (N/S/E/W).";
      render();return;
    }
    if(candidates.length===1){await runFn(candidates[0])}
    else{setGisPhase("disambig");ST.gisAddresses=candidates;render()}
  }catch(err){
    setGisPhase("error");
    ST.gisError="ArcGIS query failed: "+(err.message||err)+". You can skip the lookup and enter data manually.";
    render();
  }
}

async function gisUnifiedSelect(idx,runFn){
  setGisPhase("querying");render();
  try{await runFn(ST.gisAddresses[idx])}
  catch(err){
    setGisPhase("error");
    ST.gisError="Layer query failed: "+(err.message||err)+". You can skip and enter data manually.";
    render();
  }
}

function gisSkip(){setGisPhase("skipped");render()}

/* ═══════════════════════════════════════════════════════════════════
   DENVER GIS
   ═══════════════════════════════════════════════════════════════════ */
function gisNormalize(raw){
  let s=raw.trim().toUpperCase();
  s=s.replace(/,?\s*(DENVER|CO|COLORADO|\d{5}(-\d{4})?)[\s,]*/gi," ").trim();
  const abbrs={"STREET":"ST","AVENUE":"AVE","BOULEVARD":"BLVD","DRIVE":"DR","COURT":"CT","PLACE":"PL","LANE":"LN","CIRCLE":"CIR","PARKWAY":"PKWY","ROAD":"RD"};
  const parts=s.split(/\s+/);
  const last=parts[parts.length-1];
  if(abbrs[last])parts[parts.length-1]=abbrs[last];
  return parts.join(" ");
}

async function gisFindAddresses(raw){
  const norm=gisNormalize(raw);
  const queries=[`FULL_ADDRESS='${norm}'`,`FULL_ADDRESS LIKE '${norm}%'`];
  const m=norm.match(/^(\d+)\s+(.+?)(?:\s+(ST|AVE|BLVD|DR|CT|PL|LN|WAY|CIR|PKWY|RD))?\s*$/);
  if(m){const num=m[1];const street=m[2].replace(/^[NSEW]\s+/,"");queries.push(`ADDRESS_NUMBER=${num} AND STREET_NAME LIKE '${street}%'`)}
  for(const where of queries){
    const url=`${ADDR_LAYER}?where=${encodeURIComponent(where)}&outFields=FULL_ADDRESS,LATITUDE,LONGITUDE&returnGeometry=false&resultRecordCount=10&f=json`;
    const res=await fetch(url);const data=await res.json();
    const feats=(data.features||[]).map(f=>f.attributes);
    if(feats.length>0){
      if(feats.length===1)return feats;
      const bases=new Map();
      for(const f of feats){const base=f.FULL_ADDRESS.replace(/\s+(APT|UNIT|STE|#)\s+\S+$/i,"");if(!bases.has(base))bases.set(base,f)}
      return Array.from(bases.values());
    }
  }
  return[];
}

async function gisQueryLayers(lat,lon){
  const geom=`${lon}%2C${lat}`;
  const[parcelRes,zoningRes,rcRes]=await Promise.all([
    fetch(`${PARCEL_LAYER}?geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=SITUS_ADDRESS_LINE1,LAND_AREA,ZONE_10,ZONE_ID,D_CLASS_CN,PROP_CLASS,OWNER_NAME,APPRAISED_TOTAL_VALUE,LEGAL_DESC,Shape__Area,SALE_DATE,SALE_PRICE,RES_ORIG_YEAR_BUILT,COM_ORIG_YEAR_BUILT,TOT_UNITS&returnGeometry=false&f=json`),
    fetch(`${ZONING_LAYER}?geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=ZONE_DISTRICT,ZONE_DESCRIPTION,ZONE_USE_FORM,NBHD_CONTEXT,ZONE_DIST_TYPE&returnGeometry=false&f=json`),
    fetch(`${RC_LAYER}?geometry=${geom}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${GIS_MI}&units=esriSRUnit_Meter&outFields=FACILITY_NAME,FACILITY_ADDRESS,RES_CARE_TYPE&returnGeometry=true&outSR=4326&f=json`)
  ]);
  const parcelData=await parcelRes.json();const zoningData=await zoningRes.json();const rcData=await rcRes.json();
  let parcel=null;const parcelCount=parcelData.features?.length||0;
  if(parcelCount===1)parcel=parcelData.features[0].attributes;
  else if(parcelCount>1)parcel=parcelData.features.map(f=>f.attributes).sort((a,b)=>(b.LAND_AREA||0)-(a.LAND_AREA||0))[0];
  const facilities=(rcData.features||[]).map(f=>{
    const d=gisHav(lat,lon,f.geometry.y,f.geometry.x);
    return{name:f.attributes.FACILITY_NAME,addr:f.attributes.FACILITY_ADDRESS,type:f.attributes.RES_CARE_TYPE,mi:d,ft:Math.round(d*5280)};
  }).sort((a,b)=>a.mi-b.mi);
  return{parcel,parcelCount,zoning:zoningData.features?.length?zoningData.features[0].attributes:null,facilities};
}

async function gisRunWithAddress(addr){
  setGisPhase("querying");render();
  const lat=addr.LATITUDE,lon=addr.LONGITUDE;
  try{
    const data=await gisQueryLayers(lat,lon);
    const z=data.zoning;const p=data.parcel;
    const zoningZone=z?z.ZONE_DISTRICT:null;const landArea=p?p.LAND_AREA:null;
    const totalRC=data.facilities.length;
    const t34=data.facilities.filter(f=>f.type==="Type 3"||f.type==="Type 4");
    const t34c=t34.length;const nearest34=t34.length?t34[0]:null;
    ST.gisData={parcel:p,zoning:z,facilities:data.facilities,matchedAddr:addr.FULL_ADDRESS,lat,lon,parcelCount:data.parcelCount};
    ST.gisAutoZone=zoningZone;ST.gisAutoLot=landArea;ST.gisAutoRC=totalRC;ST.gisAutoRC34=t34c;ST.gisAutoDist34=nearest34?nearest34.ft:null;
    if(zoningZone&&ZL.includes(zoningZone)){ST.form.zone=zoningZone}
    if(landArea)ST.form.lotSize=landArea;
    ST.form.rcWithin1mi=totalRC;ST.form.rcType34within1mi=t34c;ST.form.distType34=nearest34?nearest34.ft:null;
    ST.form.address=addr.FULL_ADDRESS;setGisPhase("done");render();
  }catch(err){setGisPhase("error");ST.gisError="Layer query failed: "+(err.message||err)+". You can skip and enter data manually.";render()}
}

function gisStartLookup(){gisUnifiedStart("gis-addr",gisFindAddresses,gisRunWithAddress,"Denver\u2019s address point layer")}
function gisSelectAddress(idx){gisUnifiedSelect(idx,gisRunWithAddress)}

function gisApplyAndContinue(){
  const ov=ST.gisOverrides;
  if(ov.zone!==undefined)ST.form.zone=ov.zone||null;
  if(ov.lotSize!==undefined)ST.form.lotSize=ov.lotSize===""?null:Number(ov.lotSize);
  if(ov.rcWithin1mi!==undefined)ST.form.rcWithin1mi=ov.rcWithin1mi===""?null:Number(ov.rcWithin1mi);
  if(ov.distType34!==undefined)ST.form.distType34=ov.distType34===""?null:Number(ov.distType34);
  if(ov.rcType34within1mi!==undefined)ST.form.rcType34within1mi=ov.rcType34within1mi===""?null:Number(ov.rcType34within1mi);
  advance();
}

/* ═══════════════════════════════════════════════════════════════════
   COLORADO SPRINGS GIS
   ═══════════════════════════════════════════════════════════════════ */
function cosNormalize(raw){
  let s=raw.trim().toUpperCase();
  s=s.replace(/,?\s*(COLORADO\s+SPRINGS|COS|CO|COLORADO|\d{5}(-\d{4})?)[\s,]*/gi," ").trim();
  const abbrs={"STREET":"ST","AVENUE":"AVE","BOULEVARD":"BLVD","DRIVE":"DR","COURT":"CT","PLACE":"PL","LANE":"LN","CIRCLE":"CIR","PARKWAY":"PKWY","ROAD":"RD","TERRACE":"TER","WAY":"WAY","NORTH":"N","SOUTH":"S","EAST":"E","WEST":"W"};
  return s.split(/\s+/).map(p=>abbrs[p]||p).join(" ");
}

async function cosFindAddresses(raw){
  const norm=cosNormalize(raw);
  const queries=[`FullAddress='${norm}'`,`FullAddress LIKE '${norm}%'`];
  const m=norm.match(/^(\d+)\s+([NSEW]\s+)?(.+?)(?:\s+(ST|AVE|BLVD|DR|CT|PL|LN|WAY|CIR|PKWY|RD|TER))?\s*$/);
  if(m){queries.push(`Add_Number=${m[1]} AND FullAddress LIKE '%${m[3]}%'`)}
  for(const where of queries){
    const url=`${COS_ADDR}?where=${encodeURIComponent(where)}&outFields=FullAddress,Add_Number&returnGeometry=true&outSR=4326&resultRecordCount=10&f=json`;
    const res=await fetch(url);const data=await res.json();
    const feats=(data.features||[]).map(f=>({...f.attributes,x:f.geometry.x,y:f.geometry.y}));
    if(feats.length>0){
      const bases=new Map();
      for(const f of feats){const base=f.FullAddress.replace(/\s+(APT|UNIT|STE|#)\s+\S+$/i,"");if(!bases.has(base))bases.set(base,f)}
      return Array.from(bases.values());
    }
  }
  return[];
}

async function cosQueryLayers(lat,lon){
  const geom=`${lon},${lat}`;
  const gP=`geometry=${encodeURIComponent(geom)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=json`;
  const coreFetches=[
    fetch(`${COS_PARCEL}?${gP}&outFields=PARCEL,ZONING,MAINADDRES,OwnerName,ACREAGE,LEGAL,Shape_Area,CITY,type`).then(r=>r.json()),
    fetch(`${COS_ZONING}?${gP}&outFields=LABEL,DESCRIPT,ECP_Zoning_Code,ECP_Zone_Description`).then(r=>r.json()),
  ];
  const overlayFetches=Object.entries(COS_OVERLAYS).map(([key,layer])=>
    fetch(`${layer.url}?${gP}&outFields=${layer.fields}`).then(r=>r.json()).then(d=>({key,features:d.features||[]})).catch(()=>({key,features:[]}))
  );
  const cdpheFetch=fetch(`${CDPHE}?geometry=${encodeURIComponent(geom)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${GIS_MI}&units=esriSRUnit_Meter&outFields=Facility_Name,Facility_Type,Facility_Type_Detail,Address_Full,Licensed_Beds_Total,Operating_Status,Latitude,Longitude&returnGeometry=true&outSR=4326&resultRecordCount=200&f=json`).then(r=>r.json()).catch(()=>({features:[]}));
  const cupFetch=fetch(`${COS_CUP}?${gP}&outFields=FILE_NUM`).then(r=>r.json()).catch(()=>({features:[]}));
  const uvFetch=fetch(`${COS_USEVAR}?${gP}&outFields=FILE_NUM`).then(r=>r.json()).catch(()=>({features:[]}));
  const[parcelRes,zoningRes,...rest]=await Promise.all([...coreFetches,...overlayFetches,cdpheFetch,cupFetch,uvFetch]);
  const oLen=Object.keys(COS_OVERLAYS).length;
  const overlayResults=rest.slice(0,oLen);
  const cdpheData=rest[oLen];const cupData=rest[oLen+1];const uvData=rest[oLen+2];
  let parcel=null;const parcelCount=parcelRes.features?.length||0;
  if(parcelCount===1)parcel=parcelRes.features[0].attributes;
  else if(parcelCount>1)parcel=parcelRes.features.map(f=>f.attributes).sort((a,b)=>(b.ACREAGE||0)-(a.ACREAGE||0))[0];
  const zoning=zoningRes.features?.length?zoningRes.features[0].attributes:null;
  const overlays={};
  overlayResults.forEach(o=>{overlays[o.key]=o.features});
  const facilities=(cdpheData.features||[]).map(f=>{
    const a=f.attributes;const d=gisHav(lat,lon,f.geometry.y,f.geometry.x);
    return{name:a.Facility_Name,type:a.Facility_Type,beds:a.Licensed_Beds_Total,status:a.Operating_Status,mi:d,ft:Math.round(d*5280)};
  }).sort((a,b)=>a.mi-b.mi);
  const cupFiles=(cupData.features||[]).map(f=>f.attributes.FILE_NUM).filter(Boolean);
  const uvFiles=(uvData.features||[]).map(f=>f.attributes.FILE_NUM).filter(Boolean);
  const activeOverlays=[];
  if(overlays.streamside?.length)activeOverlays.push("SS-O");
  if(overlays.historic?.length)activeOverlays.push("HP-O");
  if(overlays.hillside?.length)activeOverlays.push("HS-O");
  let airportOverlay=null;
  if(overlays.airport?.length){airportOverlay=overlays.airport[0].attributes.ECP_Zoning_Code||"AP-O";activeOverlays.push(airportOverlay)}
  let apzType=null;
  if(overlays.apz?.length){apzType=overlays.apz[0].attributes.APZType;if(apzType)activeOverlays.push("AP-O: "+apzType)}
  let nnaSector=null;
  if(overlays.nna?.length){nnaSector=overlays.nna[0].attributes.SECTOR;activeOverlays.push("NNA-O"+(nnaSector?" "+nnaSector:""))}
  let effectiveZone=zoning?zoning.LABEL:null;
  if(nnaSector)effectiveZone="NNA-O "+nnaSector;
  const lotAcres=parcel?parcel.ACREAGE:null;
  const shapeArea=parcel&&parcel.Shape_Area?Math.round(parcel.Shape_Area):null;
  const lotSqFt=lotAcres?Math.round(lotAcres*43560):shapeArea;
  return{parcel,parcelCount,zoning,effectiveZone,zoningLabel:zoning?zoning.LABEL:null,zoningDesc:zoning?(zoning.ECP_Zone_Description||zoning.DESCRIPT):null,lotSqFt,activeOverlays,nnaSector,apzType,facilities,cupFiles,uvFiles,alrCount:facilities.filter(f=>f.type==="Assisted Living Residence").length};
}

async function cosGisRun(addr){
  setGisPhase("querying");render();
  const lat=addr.y,lon=addr.x;
  try{
    const data=await cosQueryLayers(lat,lon);
    ST.gisData={...data,matchedAddr:addr.FullAddress,lat,lon};
    ST.gisAutoZone=data.effectiveZone;
    ST.gisAutoLot=data.lotSqFt;
    ST.cosAutoOverlays=data.activeOverlays;
    ST.cosAutoNNA=data.nnaSector;
    ST.cosAutoAPZ=data.apzType;
    ST.cosAutoFacilities=data.facilities;
    ST.cosAutoALR=data.alrCount;
    ST.cosAutoCUP=data.cupFiles;
    ST.cosAutoUV=data.uvFiles;
    const relevantFac=data.facilities.filter(f=>f.type==="Assisted Living Residence"||f.type==="Nursing Facilities");
    const nearestRelevant=relevantFac.length?relevantFac[0]:null;
    ST.cosAutoNearestFacDist=nearestRelevant?nearestRelevant.ft:null;
    ST.cosAutoNearestFacName=nearestRelevant?nearestRelevant.name:null;
    ST.cosAutoNearestFacIsALR=nearestRelevant?nearestRelevant.type==="Assisted Living Residence":false;
    if(data.effectiveZone&&COS_ZL.includes(data.effectiveZone))ST.form.zone=data.effectiveZone;
    if(data.lotSqFt)ST.form.lotSize=data.lotSqFt;
    ST.form.cosOverlays=data.activeOverlays.filter(o=>o.startsWith("AP-O")||o==="SS-O"||o==="HP-O"||o==="HS-O");
    if(nearestRelevant){ST.form.distGLRDetox=nearestRelevant.ft;if(nearestRelevant.type==="Assisted Living Residence")ST.form.nearestAL="yes"}
    ST.form.address=addr.FullAddress;
    setGisPhase("done");render();
  }catch(err){setGisPhase("error");ST.gisError="Layer query failed: "+(err.message||err)+". You can skip and enter data manually.";render()}
}

function cosGisStart(){gisUnifiedStart("cos-addr",cosFindAddresses,cosGisRun,"Colorado Springs address point layer")}
function cosGisSelect(idx){gisUnifiedSelect(idx,cosGisRun)}

function cosGisApply(){
  const ov=ST.gisOverrides;
  if(ov.zone!==undefined)ST.form.zone=ov.zone||null;
  if(ov.lotSize!==undefined)ST.form.lotSize=ov.lotSize===""?null:Number(ov.lotSize);
  advance();
}

/* ═══════════════════════════════════════════════════════════════════
   EL PASO COUNTY GIS
   ═══════════════════════════════════════════════════════════════════ */
async function epcFindCandidates(raw){
  const q=encodeURIComponent(raw.replace(/,?\s*(el\s*paso\s*county|CO|Colorado|\d{5}(-\d{4})?)[\s,]*/gi," ").trim());
  const gUrl=`${EPC_GEOCODE}?SingleLine=${q}&searchExtent=${EPC_BBOX}&outFields=Addr_type,Match_addr,StAddr&maxLocations=5&f=json`;
  const gRes=await fetch(gUrl);const gData=await gRes.json();
  const candidates=(gData.candidates||[]).filter(c=>c.score>=80);
  // Transform to unified format for disambiguation
  return candidates;
}

async function epcGisRun(candidate){
  setGisPhase("querying");render();
  const lon=candidate.location.x,lat=candidate.location.y;
  const geom=`${lon},${lat}`;
  const gP=`geometry=${encodeURIComponent(geom)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnGeometry=false&f=json`;
  try{
    const[zoningRes,parcelRes,overlayRes,cityRes,cdpheRes]=await Promise.all([
      fetch(`${EPC_GIS_ZONING}?${gP}&outFields=ZONING,ZONETYPE`).then(r=>r.json()),
      fetch(`${EPC_GIS_PARCEL}?${gP}&outFields=PARCEL,HYPERLINK,Shape.STArea()`).then(r=>r.json()),
      fetch(`${EPC_GIS_OVERLAY}?${gP}&outFields=ZONEOVERLAY`).then(r=>r.json()),
      fetch(`${EPC_GIS_CITIES}?${gP}&outFields=NAME`).then(r=>r.json()).catch(()=>({features:[]})),
      fetch(`${CDPHE}?geometry=${encodeURIComponent(geom)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=${GIS_MI}&units=esriSRUnit_Meter&outFields=Facility_Name,Facility_Type,Facility_Type_Detail,Address_Full,Licensed_Beds_Total,Operating_Status,Latitude,Longitude&returnGeometry=true&outSR=4326&resultRecordCount=200&f=json`).then(r=>r.json()).catch(()=>({features:[]}))
    ]);
    const zoning=zoningRes.features?.length?zoningRes.features[0].attributes:null;
    let parcel=null;const pCount=parcelRes.features?.length||0;
    if(pCount===1)parcel=parcelRes.features[0].attributes;
    else if(pCount>1)parcel=parcelRes.features.map(f=>f.attributes).sort((a,b)=>(b["Shape.STArea()"]||0)-(a["Shape.STArea()"]||0))[0];
    const overlay=overlayRes.features?.length?overlayRes.features[0].attributes:null;
    const cityName=cityRes.features?.length?cityRes.features[0].attributes.NAME:null;

    const autoZone=zoning?zoning.ZONING:null;
    const parcelArea=parcel?parcel["Shape.STArea()"]:null;
    const autoLot=parcelArea?Math.round(parcelArea):null;
    const autoOverlay=overlay?overlay.ZONEOVERLAY:null;
    const parcelId=parcel?parcel.PARCEL:null;
    const assessorLink=parcel?parcel.HYPERLINK:null;

    let cityWarning=null;
    if(cityName&&autoZone){
      cityWarning="Zone returned as "+autoZone+", but address is inside "+cityName+". The EPC zoning layer may overlap incorporated boundaries. Verify with PCD whether this property is governed by EPC or "+cityName+" zoning.";
    } else if(cityName&&!autoZone){
      cityWarning="This address is inside "+cityName+" (incorporated). The El Paso County Land Development Code does not apply. Use "+cityName+"'s zoning code instead.";
    }

    // CDPHE licensed facilities within 1 mile
    const epcFacilities=(cdpheRes.features||[]).map(f=>{
      const a=f.attributes;const d=gisHav(lat,lon,f.geometry.y,f.geometry.x);
      return{name:a.Facility_Name,type:a.Facility_Type,detail:a.Facility_Type_Detail,addr:a.Address_Full,beds:a.Licensed_Beds_Total,status:a.Operating_Status,mi:d,ft:Math.round(d*5280)};
    }).sort((a,b)=>a.mi-b.mi);
    ST.epcAutoFacilities=epcFacilities;
    const epcNearest=epcFacilities.length?epcFacilities[0]:null;
    ST.epcAutoNearestFacDist=epcNearest?epcNearest.ft:null;
    ST.epcAutoNearestFacName=epcNearest?epcNearest.name:null;
    if(epcNearest)ST.form.epcSeparation=epcNearest.ft;

    ST.gisData={matchedAddr:candidate.attributes.Match_addr,lat,lon,autoZone,autoLot,autoOverlay,parcelId,assessorLink,cityName,cityWarning};
    ST.gisAutoZone=autoZone;
    ST.gisAutoLot=autoLot;
    if(autoZone&&EPC_ZL.includes(autoZone)&&!cityName)ST.form.zone=autoZone;
    if(autoLot)ST.form.lotSize=autoLot;
    ST.form.address=candidate.attributes.Match_addr;
    if(autoOverlay){
      const ol=autoOverlay.toUpperCase();
      if(ol.includes("CAD")){ST.form.epcCadO="cado"}else{ST.form.epcCadO="none"}
    } else {ST.form.epcCadO="none"}
    setGisPhase("done");render();
    epcWaterSewerCheck(candidate.attributes.Match_addr,lat,lon);
  }catch(err){setGisPhase("error");ST.gisError="Layer query failed: "+(err.message||err)+". You can skip and enter data manually.";render()}
}

async function epcGisStart(){
  const raw=document.getElementById("epc-addr").value.trim();
  if(!raw)return;
  ST.form.address=raw;setGisPhase("searching");ST.gisError=null;render();
  try{
    const candidates=await epcFindCandidates(raw);
    if(candidates.length===0){
      setGisPhase("error");
      ST.gisError="No matching address found in El Paso County. Try including city name or check spelling.";
      render();return;
    }
    if(candidates.length===1){await epcGisRun(candidates[0])}
    else{
      setGisPhase("disambig");
      ST.gisAddresses=candidates.map(c=>({addr:c.attributes.Match_addr,x:c.location.x,y:c.location.y,score:c.score}));
      render();
    }
  }catch(err){setGisPhase("error");ST.gisError="Geocoding failed: "+(err.message||err)+". You can skip and enter data manually.";render()}
}

async function epcGisSelect(idx){
  setGisPhase("querying");render();
  try{
    const a=ST.gisAddresses[idx];
    await epcGisRun({location:{x:a.x,y:a.y},attributes:{Match_addr:a.addr}});
  }catch(err){setGisPhase("error");ST.gisError="Layer query failed: "+(err.message||err)+". You can skip and enter data manually.";render()}
}

function epcGisApply(){
  const ov=ST.gisOverrides;
  if(ov.zone!==undefined)ST.form.zone=ov.zone||null;
  if(ov.lotSize!==undefined)ST.form.lotSize=ov.lotSize===""?null:Number(ov.lotSize);
  advance();
}

/* ═══════════════════════════════════════════════════════════════════
   EPC WATER / SEWER INFRASTRUCTURE CHECK
   ═══════════════════════════════════════════════════════════════════ */
async function epcWaterSewerCheck(addressStr,lat,lon){
  ST.epcInfraStatus=null;ST.epcInfraDistrict=null;ST.epcInfraChecking=true;render();
  try{
    const gP=`geometry=${lon},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=NAME&returnGeometry=false&f=json`;
    const[swdRes,sanRes]=await Promise.all([
      fetch(`${EPC_DIST_SWD}?${gP}`).then(r=>r.json()).catch(()=>({features:[]})),
      fetch(`${EPC_DIST_SAN}?${gP}`).then(r=>r.json()).catch(()=>({features:[]})),
    ]);
    const names=[];
    for(const data of[swdRes,sanRes]){
      (data.features||[]).forEach(f=>{if(f.attributes?.NAME)names.push(f.attributes.NAME)});
    }
    const unique=[...new Set(names)];
    if(unique.length>0){
      const formatted=unique.map(n=>n.replace(/\bSWD\b/,"Water & Sanitation District").replace(/\bWD\b/,"Water District").replace(/\bSD\b/,"Sanitation District").replace(/\bMD\b/,"Metropolitan District").replace(/([A-Z]+)/g,w=>w.charAt(0)+w.slice(1).toLowerCase())).join("; ");
      ST.epcInfraStatus="district";ST.epcInfraDistrict=formatted;
    } else {
      ST.epcInfraStatus="well-septic";ST.epcInfraDistrict=null;
    }
  }catch(e){
    ST.epcInfraStatus="unknown";ST.epcInfraDistrict="Lookup failed: "+e.message;
  }
  ST.epcInfraChecking=false;render();
}
