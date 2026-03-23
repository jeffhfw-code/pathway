/* ═══════════════════════════════════════════════════════════════════
   CONFIGURATION — Constants, zone lists, use tables, GIS endpoints
   ═══════════════════════════════════════════════════════════════════

   ADDING A NEW JURISDICTION (F13)
   ────────────────────────────────
   1. config.js  — Add GIS endpoints, zone list (XXX_ZL), zone groups
                   (XXX_ZG), and use table (XXX_UT). Add citeURL() branch.
                   Add ENGINE_VERIFIED entry.
   2. engine-xxx.js — Create runXXXEngine(f) returning
                   {zone, gS, gC, results[], p2}. Each pathway object has:
                   {id, nm, th, v, mg, stops[], cav[], proc, rat, wf[], rsk{}, rank}.
   3. gis.js     — Add xxxGisStart/Select/Apply flow + xxxGisRun(). Follow
                   the unified gisStart/gisSelect pattern.
   4. state.js   — Add any jurisdiction-specific fields to createDefaultForm()
                   and createDefaultState().
   5. ui.js      — Add jurisdiction card in selector, getXXXPages(), intake
                   pages, GIS done block. Wire engine in go().
   6. index.html — Add engine script tag.
   7. sw.js      — Add engine to ASSETS, bump CACHE_NAME version.
   8. tests/     — Add test cases in test-engines.js.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Denver ArcGIS Layer Endpoints ────────────────────────────── */
const GIS_BASE="https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/ArcGIS/rest/services";
const ADDR_LAYER=`${GIS_BASE}/ODC_CITY_LOC_ADDRESSPUBLIC_P/FeatureServer/31/query`;
const PARCEL_LAYER=`${GIS_BASE}/ODC_PROP_PARCELS_A/FeatureServer/245/query`;
const ZONING_LAYER=`${GIS_BASE}/ODC_ZONE_ZONING_A/FeatureServer/209/query`;
const RC_LAYER=`${GIS_BASE}/ODC_SVCS_RESCAREFACILITY_P/FeatureServer/346/query`;
const GIS_MI=1609.34;

/* ── Colorado Springs ArcGIS Layer Endpoints ──────────────────── */
const COS_GIS="https://gis.coloradosprings.gov/arcgis/rest/services/GeneralUse";
const COS_ADDR=`${COS_GIS}/LandRecords/MapServer/0/query`;
const COS_PARCEL=`${COS_GIS}/LandRecords/MapServer/4/query`;
const COS_ZONING=`${COS_GIS}/PlanningZoning/MapServer/11/query`;
const COS_CUP=`${COS_GIS}/PlanningLandUseEntitlements/MapServer/0/query`;
const COS_USEVAR=`${COS_GIS}/PlanningLandUseEntitlements/MapServer/3/query`;
const CDPHE="https://services3.arcgis.com/66aUo8zsujfVXRIT/ArcGIS/rest/services/CDPHE_Health_Facilities/FeatureServer/0/query";
const COS_OVERLAYS={
  airport:{url:`${COS_GIS}/PlanningZoning/MapServer/1/query`,fields:"ECP_Zoning_Code"},
  hillside:{url:`${COS_GIS}/PlanningZoning/MapServer/4/query`,fields:"OBJECTID"},
  streamside:{url:`${COS_GIS}/PlanningZoning/MapServer/5/query`,fields:"buf,type"},
  historic:{url:`${COS_GIS}/PlanningZoning/MapServer/7/query`,fields:"OBJECTID"},
  nna:{url:`${COS_GIS}/PlanningZoning/MapServer/8/query`,fields:"SECTOR,ECP_Zoning_Code"},
  apz:{url:`${COS_GIS}/PlanningZoning/MapServer/9/query`,fields:"APZType"},
};

/* ── El Paso County ArcGIS Layer Endpoints ────────────────────── */
const EPC_GIS_ZONING="https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/ZoningAreas/MapServer/1/query";
const EPC_GIS_PARCEL="https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/Parcels/MapServer/0/query";
const EPC_GIS_OVERLAY="https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/ZoningOverlay/FeatureServer/0/query";
const EPC_GEOCODE="https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
const EPC_BBOX="-105.05,38.52,-104.04,39.40";
const EPC_GIS_CITIES="https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/IncorporatedCities/FeatureServer/0/query";
const EPC_DIST_SWD="https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/SanitationWaterDistricts/FeatureServer/0/query";
const EPC_DIST_WATER="https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/WaterDistricts/FeatureServer/0/query";
const EPC_DIST_SAN="https://gisservices.elpasoco.com/arcgis2/rest/services/HubPublic/SanitationDistricts/FeatureServer/0/query";
const EPC_CDSS_BASE="https://dwr.state.co.us/Rest/GET/api/v2";
const EPC_PARCEL_FS="https://gis.colorado.gov/public/rest/services/Address_and_Parcel/Colorado_Public_Parcels/FeatureServer/0/query";

/* ── External Map/Reference URLs ──────────────────────────────── */
const RC_MAP="https://geospatialdenver.maps.arcgis.com/apps/webappviewer/index.html?id=de6f7c05261448e6832eda1b173f80d0";
const ZMAP="https://www.denvergov.org/maps/map/zoning";
const ASSR="https://property.spatialest.com/co/denver";
const COS_ZMAP="https://coloradosprings.gov/planning/zoning-maps";
const EPC_ZMAP="https://epcdev.maps.arcgis.com/apps/webappviewer/index.html?id=7b9d76e1e58c41a1a0f22235e4a42be9";

/* ═══════════════════════════════════════════════════════════════════
   DENVER — Zone List + Use Tables
   ═══════════════════════════════════════════════════════════════════ */
const ZL=["S-SU-Fx","S-SU-Ix","S-SU-A","S-SU-D","S-SU-F","S-SU-FA","S-SU-I","S-RH-2.5","S-MU-3","S-MU-5","S-MU-8","S-MU-12","S-MU-20","S-CC-3x","S-CC-5x","S-CC-3","S-CC-5","S-MX-2x","S-MX-2","S-MX-2A","S-MX-3","S-MX-3A","S-MX-5","S-MX-5A","S-MX-8","S-MX-8A","S-MX-12","S-MX-12A","S-MS-3","S-MS-5","E-SU-A","E-SU-B","E-SU-D","E-SU-Dx","E-SU-G","E-TU-B","E-TU-C","E-RH-2.5","E-MU-2.5","E-RX-3","E-RX-5","E-CC-3x","E-CC-3","E-MX-2x","E-MS-2x","E-MX-2A","E-MX-2","E-MS-2","E-MX-3A","E-MX-3","E-MS-3","E-MS-5","U-SU-A","U-SU-A2","U-SU-B","U-SU-B2","U-SU-C","U-SU-C2","U-SU-E","U-SU-H","U-TU-B","U-TU-B2","U-TU-C","U-RH-2.5","U-RH-3A","U-RX-3","U-RX-5","U-MX-2x","U-MS-2x","U-MX-2","U-MS-2","U-MX-3","U-MS-3","U-MS-5","G-RH-3","G-MU-3","G-MU-5","G-MU-8","G-MU-12","G-MU-20","G-RO-3","G-RO-5","G-RX-3","G-RX-5","G-MX-3","G-MS-3","G-MS-5","C-RX-5","C-RX-8","C-RX-12","C-MX-3","C-MX-5","C-MX-8","C-MX-12","C-MX-16","C-MX-20","C-MS-5","C-MS-8","C-MS-12","C-CCN-3","C-CCN-4","C-CCN-5","C-CCN-7","C-CCN-8","C-CCN-12","D-C","D-TD","D-LD","D-CV","D-GT","D-AS","D-AS-12+","D-AS-20+","D-CPV-T","D-CPV-R","D-CPV-C","I-MX-3","I-MX-5","I-MX-8","I-MX-12","I-A","I-B","CMP-H","CMP-H2","CMP-EI","CMP-EI2","CMP-ENT","CMP-NWC","CMP-NWC-C","CMP-NWC-G","CMP-NWC-F","CMP-NWC-R","OS-A","OS-B","OS-C","MHC","O-1","M-RH-3","M-RX-3","M-RX-5","M-RX-5A","M-CC-5","M-MX-5","M-IMX-5","M-IMX-8","M-IMX-12","M-GMX"];
const ZG={"Suburban (S-)":{p:"S-"},"Urban Edge (E-)":{p:"E-"},"Urban (U-)":{p:"U-"},"General Urban (G-)":{p:"G-"},"Urban Center (C-)":{p:"C-"},"Downtown (D-)":{p:"D-"},"Industrial (I-)":{p:"I-"},"Campus (CMP-)":{p:"CMP-"},"Open Space (OS-)":{p:"OS-"},"Master Plan (M-)":{p:"M-"},"Other":{p:null}};
const UT={};function aZ(z,t1,t2,t3,t4){z.forEach(x=>{UT[x]={t1,t2,t3,t4}})}
aZ(["S-SU-Fx","S-SU-Ix","S-SU-A","S-SU-D","S-SU-F","S-SU-FA","S-SU-I","S-RH-2.5"],"L/L-ZP","L-ZPCIM","NP","NP");aZ(["S-MU-3","S-MU-5"],"L/L-ZP","L-ZP","NP","NP");aZ(["S-MU-8","S-MU-12","S-MU-20","S-CC-3x","S-CC-5x","S-CC-3","S-CC-5"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");aZ(["S-MX-2x","S-MX-2","S-MX-2A"],"L/L-ZP","L-ZP","NP","NP");aZ(["S-MX-3","S-MX-3A","S-MX-5","S-MX-5A","S-MX-8","S-MX-8A","S-MX-12","S-MX-12A","S-MS-3","S-MS-5"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");
aZ(["E-SU-A","E-SU-B","E-SU-D","E-SU-Dx","E-SU-G","E-TU-B","E-TU-C","E-RH-2.5","E-MU-2.5"],"L/L-ZP","L-ZPCIM","NP","NP");aZ(["E-RX-3","E-RX-5"],"L/L-ZP","L-ZP","L-ZPCIM","NP");aZ(["E-CC-3x","E-CC-3","E-MX-3A","E-MX-3","E-MS-3","E-MS-5"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");aZ(["E-MX-2x","E-MS-2x","E-MX-2A","E-MX-2","E-MS-2"],"L/L-ZP","L-ZP","NP","NP");
aZ(["U-SU-A","U-SU-A2","U-SU-B","U-SU-B2","U-SU-C","U-SU-C2","U-SU-E","U-SU-H","U-TU-B","U-TU-B2","U-TU-C","U-RH-2.5","U-RH-3A"],"L/L-ZP","L-ZPCIM","NP","NP");aZ(["U-RX-3","U-RX-5"],"L/L-ZP","L-ZP","L-ZPCIM","NP");aZ(["U-MX-2x","U-MS-2x","U-MX-2","U-MS-2"],"L/L-ZP","L-ZP","NP","NP");aZ(["U-MX-3","U-MS-3","U-MS-5"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");
aZ(["G-RH-3"],"L/L-ZP","L-ZPCIM","NP","NP");aZ(["G-MU-3","G-MU-5"],"L/L-ZP","L-ZP","L-ZPCIM","NP");aZ(["G-MU-8","G-MU-12","G-MU-20","G-RO-3","G-RO-5","G-RX-3","G-RX-5","G-MX-3","G-MS-3","G-MS-5"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");
aZ(["C-RX-5"],"L/L-ZP","L-ZP","L-ZPCIM","NP");aZ(["C-RX-8","C-RX-12","C-MX-3","C-MX-5","C-MX-8","C-MX-12","C-MX-16","C-MX-20","C-MS-5","C-MS-8","C-MS-12","C-CCN-3","C-CCN-4","C-CCN-5","C-CCN-7","C-CCN-8","C-CCN-12"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");
aZ(["D-C","D-TD","D-LD","D-CV","D-GT","D-AS","D-AS-12+","D-AS-20+","D-CPV-T","D-CPV-R","D-CPV-C"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");
aZ(["I-MX-3","I-MX-5","I-MX-8","I-MX-12"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");aZ(["I-A","I-B"],"NP","NP","L-ZPCIM","L-ZPCIM");
aZ(["CMP-H","CMP-H2","CMP-EI","CMP-EI2","CMP-ENT","CMP-NWC","CMP-NWC-C","CMP-NWC-G","CMP-NWC-F","CMP-NWC-R"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");
aZ(["OS-A","OS-B","OS-C","MHC"],"NP","NP","NP","NP");aZ(["O-1"],"L/L-ZP","L-ZP","L-ZPCIM","L-ZPCIM");
aZ(["M-RH-3"],"L/L-ZP","L-ZPCIM","NP","NP");aZ(["M-RX-3","M-RX-5","M-RX-5A","M-CC-5","M-MX-5","M-IMX-5","M-IMX-8","M-IMX-12","M-GMX"],"L/L-ZP","L-ZPCIM","L-ZPCIM","L-ZPCIM");

/* ── Denver Zone Helper Functions ─────────────────────────────── */
function isSU(z){return/^[A-Z]-SU/.test(z)}
function isTU(z){return/^[A-Z]-TU/.test(z)}
function isRH25(z){return/RH-2\.5/.test(z)}
function isSU_TU_RH25(z){return isSU(z)||isTU(z)||isRH25(z)}
function isAnyRH(z){return/^[A-Z]-RH/.test(z)||/^M-RH/.test(z)}
function isSU_TU_anyRH(z){return isSU(z)||isTU(z)||isAnyRH(z)}
function isMRH3(z){return z==="M-RH-3"}
function isRH3_3A(z){return/^[SEUG]-RH-3/.test(z)}
const CCN_SP=new Set(["C-CCN-3","C-CCN-4","C-CCN-5","C-CCN-7","C-CCN-8"]);
function hasMU(z){return/-(MU)-/.test(z)&&!/MU-2\.5/.test(z)}
function hasRO(z){return/-RO-/.test(z)}
function hasRX(z){return/-RX-/.test(z)}
function hasMX(z){return/-MX-/.test(z)||/-IMX-/.test(z)||/-GMX/.test(z)}
function hasCC(z){return/-CC-/.test(z)&&!/C-CCN/.test(z)}
function hasMS(z){return/-MS-/.test(z)}
function isCCN12(z){return z==="C-CCN-12"}
function isDASGT(z){return/^D-(AS|GT)/.test(z)}
function isDtNS(z){return/^D-(C$|TD|LD|CV|CPV)/.test(z)}
function isCMP(z){return/^CMP-/.test(z)}
function isIAIB(z){return z==="I-A"||z==="I-B"}
function getSp(z){
  if(hasMU(z)||hasRO(z)||hasRX(z))return{d:1200,c3:"§ 11.2.11.2",c4:"§ 11.2.12.2"};
  if(hasCC(z)||hasMX(z)||hasMS(z)||CCN_SP.has(z))return{d:600,c3:"§ 11.2.11.3",c4:"§ 11.2.12.3"};
  if(isDASGT(z))return{d:400,c3:"§ 11.2.11.4",c4:"§ 11.2.12.4"};
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   COLORADO SPRINGS — Zone List + Use Table (§ 7.3.2-A)
   ═══════════════════════════════════════════════════════════════════ */
const COS_ZL=["A","R-E","R-1 9","R-1 6","R-2","R-4","R-5","R-Flex Low","R-Flex Med","R-Flex High","OR","MX-N","MX-T","MX-M","MX-L","MX-I","FBZ","BP","LI","GI","APD","PF","PK","PDZ","NNA-O South","NNA-O Central","NNA-O North"];
const COS_ZG={"Residential":{list:["A","R-E","R-1 9","R-1 6","R-2","R-4","R-5","R-Flex Low","R-Flex Med","R-Flex High"]},"Office/Mixed-Use":{list:["OR","MX-N","MX-T","MX-M","MX-L","MX-I"]},"Form-Based/Planned":{list:["FBZ","PDZ"]},"Employment/Industrial":{list:["BP","LI","GI"]},"Special Purpose":{list:["APD","PF","PK"]},"NNA Overlay":{list:["NNA-O South","NNA-O Central","NNA-O North"]}};
const COS_UT={};
// gcl = Group Care Living — populated per Table 7.3.2-A but no engine pathway yet (reserved)
function cZ(zones,glrS,glrM,glrL,hseS,hseM,hseL,gcl,ltc,detox,hospice,shelter){
  zones.forEach(z=>{COS_UT[z]={glrS,glrM,glrL,hseS,hseM,hseL,gcl,ltc,detox,hospice,shelter}});
}
cZ(["A"],      "N","N","N","P","N","N","N","N","C","C","C");
cZ(["R-E"],    "N","N","N","P","N","N","N","N","N","C","C");
cZ(["R-1 9"],  "N","N","N","P","N","N","N","N","N","C","C");
cZ(["R-1 6"],  "N","N","N","P","N","N","N","N","N","C","C");
cZ(["R-2"],    "N","N","N","P","N","N","N","N","N","C","C");
cZ(["R-4"],    "P","C","N","P","P","N","P","P","N","P","C");
cZ(["R-5"],    "P","P","C","P","P","P","P","P","N","P","C");
cZ(["R-Flex Low"],"C","N","N","P","N","N","P","N","N","C","C");
cZ(["R-Flex Med"],"P","C","N","P","P","P","P","C","N","C","C");
cZ(["R-Flex High"],"P","P","C","P","P","P","P","P","N","C","C");
cZ(["OR"],     "P","P","P","P","N","N","P","P","C","P","N");
cZ(["MX-N"],   "P","P","P","P","N","N","P","P","C","P","N");
cZ(["MX-T"],   "P","P","P","P","P","P","P","P","N","N","C");
cZ(["MX-M"],   "P","P","P","P","P","P","P","C","C","P","P");
cZ(["MX-L"],   "P","P","P","N","N","N","C","C","C","P","P");
cZ(["MX-I"],   "P","P","P","N","N","N","P","P","N","P","P");
cZ(["BP"],     "N","N","N","N","N","N","N","N","N","C","C");
cZ(["LI"],     "N","N","N","N","N","N","N","N","N","C","C");
cZ(["GI"],     "N","N","N","N","N","N","N","N","N","C","N");
cZ(["APD"],    "N","N","N","N","N","N","N","N","N","N","N");
cZ(["PF"],     "N","N","N","N","N","N","N","N","P","N","N");
cZ(["PK"],     "N","N","N","N","N","N","N","N","N","N","N");
cZ(["NNA-O South"],  "P","P","P","P","P","P","C","P","N","P","P");
cZ(["NNA-O Central"],"C","C","C","C","C","C","N","C","N","C","C");
cZ(["NNA-O North"],  "C","C","C","C","C","C","C","C","N","C","C");
// FBZ/PDZ: plan-based zones — conservative "C" baseline; engine gate logic (lines 38-46) overrides per plan status
cZ(["FBZ"],    "C","C","C","C","C","C","C","C","C","C","C");
cZ(["PDZ"],    "C","C","C","C","C","C","C","C","C","C","C");

/* ═══════════════════════════════════════════════════════════════════
   EL PASO COUNTY — Zone List + Use Table (LDC Table 5-1)
   ═══════════════════════════════════════════════════════════════════ */
const EPC_ZL=["F-5","A-35","A-5","RR-5","RR-2.5","RR-0.5","RS-20000","RS-6000","RS-5000","RM-12","RM-30","R-T","MHP","MHS","MHP-R","RVP","CC","CR","CS","I-2","I-3","C-1","C-2","M","R-4","PUD"];
const EPC_ZG={
  "Forestry/Agriculture":{list:["F-5","A-35","A-5"]},
  "Rural Residential":{list:["RR-5","RR-2.5","RR-0.5"]},
  "Residential Suburban":{list:["RS-20000","RS-6000","RS-5000"]},
  "Residential Multi":{list:["RM-12","RM-30"]},
  "Special Purpose":{list:["R-T","MHP","MHS","MHP-R","RVP"]},
  "Commercial":{list:["CC","CR","CS"]},
  "Industrial":{list:["I-2","I-3"]},
  "Obsolete":{list:["C-1","C-2","M","R-4"]},
  "Planned":{list:["PUD"]}
};
const EPC_UT={};
function eZ(zones,gh,rehab,hosp,convHosp,medClinic,halfway,humanSvc,boarding,philanthropic){
  zones.forEach(z=>{EPC_UT[z]={gh,rehab,hosp,convHosp,medClinic,halfway,humanSvc,boarding,philanthropic}});
}
eZ(["F-5"],       "A4","N","N","S","N","S","N","N","S");
eZ(["A-35"],      "A4","N","N","S","N","S","N","N","N");
eZ(["A-5"],       "A4","N","N","S","N","S","N","N","S");
eZ(["RR-5"],      "A4","N","N","N","N","S","N","N","S");
eZ(["RR-2.5"],    "A4","N","N","N","N","N","N","N","S");
eZ(["RR-0.5"],    "A4","N","N","N","N","N","N","N","S");
eZ(["RS-20000","RS-6000","RS-5000"],"A4","N","N","N","N","N","N","N","N");
eZ(["RM-12"],     "A4","S","N","S","N","N","N","A","N");
eZ(["RM-30"],     "A4","S","S","S","N","N","N","A","N");
eZ(["R-T"],       "A4","N","N","N","N","N","N","N","N");
eZ(["MHP","MHS","MHP-R"],"A4","N","N","N","N","N","N","N","N");
eZ(["RVP"],       "N","N","N","N","N","N","N","N","N");
eZ(["CC"],        "N","A","A","S","A","N","S","S","A");
eZ(["CR"],        "N","A","A","S","A","N","S","S","A");
eZ(["CS"],        "N","A","S","S","A","N","A","A","A");
eZ(["I-2","I-3"], "N","N","N","N","N","N","N","N","N");
eZ(["C-1"],       "N","A","S","S","N","N","S","S","S");
eZ(["C-2"],       "N","A","S","S","N","N","S","S","S");
eZ(["M"],         "N","A","A","A","A","N","S","A","A");
eZ(["R-4"],       "N","N","N","N","N","N","N","N","N");
eZ(["PUD"],       "N","N","N","N","N","N","N","N","N");

/* ── EPC Zone Helper Functions ────────────────────────────────── */
const EPC_GH_ZONES=new Set(["F-5","A-35","A-5","RR-5","RR-2.5","RR-0.5","RS-20000","RS-6000","RS-5000","RM-12","RM-30","R-T","MHP","MHS","MHP-R"]);
function epcIsGHZone(z){return EPC_GH_ZONES.has(z)}
function epcIsCommercial(z){return["CC","CR","CS","C-1","C-2","M"].includes(z)}

/* ── Spatialest Property Record API (El Paso County) ──────────── */
const SPATIALEST_API="https://property.spatialest.com/co/elpaso/api/v1/recordcard";

/* ── FEMA National Flood Hazard Layer ──────────────────────────── */
const FEMA_NFHL="https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query";

/* ── NPS National Register Historic Districts ──────────────────── */
const NPS_HISTORIC="https://services1.arcgis.com/4yjifSiIG17F0gW5/arcgis/rest/services/National_Register_of_Historic_Places_Historic_Districts/FeatureServer/0/query";

/* ═══════════════════════════════════════════════════════════════════
   MANITOU SPRINGS — Zone List + Use Table (LUDC Table 18.04.2.5-1)
   ═══════════════════════════════════════════════════════════════════ */
const MAN_GEOCODE=EPC_GEOCODE; // reuse world geocoder
const MAN_BBOX="-104.940,38.830,-104.890,38.870";
const MAN_ZONING="https://services6.arcgis.com/JvLU4FaQtqrjGWfU/arcgis/rest/services/Manitou_Springs_Zoning_Districts_April_2025/FeatureServer/0/query";
const MAN_ZMAP="https://comsgov.maps.arcgis.com/apps/instant/interactivelegend/index.html?appid=a352048fe74549378e417e5b0aa3f733";

const MAN_ZL=["GR","LDR","HDR","HLDR","DWTN","C","MUC","OS","P","PF"];
const MAN_ZG={
  "Residential":{list:["GR","LDR","HDR","HLDR"]},
  "Commercial / Mixed-Use":{list:["DWTN","C","MUC"]},
  "Public / Open Space":{list:["OS","P","PF"]}
};
const MAN_UT={};
function mZ(zones,ghSmall,ghLarge,ltc,ccrc,medOff,hcSup,medCare,boarding){
  zones.forEach(z=>{MAN_UT[z]={ghSmall,ghLarge,ltc,ccrc,medOff,hcSup,medCare,boarding}});
}
mZ(["GR"],          "P","C","N","N","N","N","N","C");
mZ(["LDR"],         "P","C","N","N","N","N","N","N");
mZ(["HDR"],         "P","P","P","P","N","N","N","N");
mZ(["HLDR"],        "P","C","N","N","N","N","N","N");
mZ(["DWTN"],        "P","P","N","N","P","N","N","P");
mZ(["C"],           "P","P","P","P","P","P","P","P");
mZ(["MUC"],         "P","P","P","P","P","C","C","P");
mZ(["OS","P","PF"], "N","N","N","N","N","N","N","N");

/* ── Manitou Springs Zone Helper Functions ──────────────────── */
const MAN_RES=new Set(["GR","LDR","HDR","HLDR"]);
const MAN_COMM=new Set(["DWTN","C","MUC"]);
function manIsRes(z){return MAN_RES.has(z)}
function manIsComm(z){return MAN_COMM.has(z)}
function manIsPublic(z){return z==="OS"||z==="P"||z==="PF"}

/* ── Manitou Springs Title 15 Occupancy Cap Calculator ──────── */
// Title 15 § 15.08.120 graduated table: [minSqft, maxOccupants]
const TITLE_15_TABLE=[[175,1],[250,2],[325,3],[400,4],[475,5],[535,6]];
function manTitle15Cap(sqft){
  if(sqft===null||sqft===undefined||sqft<=0)return null;
  for(const[threshold,cap] of TITLE_15_TABLE){if(sqft<=threshold)return cap}
  // Above 535 sf: 6 + floor((sqft - 475) / 60), capped at 850 sf per § 15.08.120
  return 6+Math.floor((Math.min(sqft,850)-475)/60);
}

/* ── GIS Phase Valid Transitions (state machine) ──────────────── */
/* ── Form Defaults (skip wizard pages for always-same answers) ── */
const FORM_DEFAULTS={
  licensing:"yes",
  correctional:"no",
  epcSexOffender:"no",
  epcNonprofit:"no",
  op24hr:"yes",
  overnight:"yes"
};

/* ── Engine Verification Dates (change monitoring) ─────────── */
const ENGINE_VERIFIED={
  denver:"2026-03-20",
  cos:"2026-03-20",
  epc:"2026-03-20",
  manitou:"2026-03-20"
};

/* ── Zone Code Citation URLs (F10) ─────────────────────────────── */
function citeURL(cite,jur){
  if(!cite)return null;
  // Denver Zoning Code — Municode
  if(jur==="denver"){
    const m=cite.match(/§\s*([\d]+\.[\d]+\.[\d]+)/);
    if(m){
      const art=m[1].split(".")[0];
      return"https://library.municode.com/co/denver/codes/code_of_ordinances?nodeId=TITIIREMUCO_CH59ZO_ARTII"+(art==="11"?"USSIRE":"GEPR");
    }
  }
  // COS UDC
  if(jur==="cos"){
    const m=cite.match(/§\s*([\d]+\.[\d]+)/);
    if(m)return"https://codelibrary.amlegal.com/codes/coloradospringsco/latest/coloradosprings_co/0-0-0-"+m[1].replace(".","");
  }
  // EPC LDC
  if(jur==="epc"){
    const m=cite.match(/§\s*([\d]+\.[\d]+)/);
    if(m)return"https://library.municode.com/co/el_paso_county/codes/land_development_code";
  }
  // Manitou Springs LUDC
  if(jur==="manitou"){
    if(cite.match(/§\s*1[58]\./))return"https://library.municode.com/co/manitou_springs/codes/code_of_ordinances";
    if(cite.match(/Title\s*15/))return"https://library.municode.com/co/manitou_springs/codes/code_of_ordinances";
  }
  // Colorado Revised Statutes
  const crs=cite.match(/C\.R\.S\.\s*§\s*([\d]+-[\d]+-[\d]+)/);
  if(crs)return"https://leg.colorado.gov/colorado-revised-statutes";
  return null;
}

/* ── Ancillary Costs (F8) ──────────────────────────────────────── */
const ANCILLARY_COSTS={
  architect:{label:"Architect / site plan preparation",min:2000,max:8000,when:"Required for all pathways needing a site plan or site development plan"},
  trafficStudy:{label:"Traffic impact study",min:5000,max:15000,when:"May be required for large facilities (16+ residents) or facilities on arterial roads"},
  neighborhoodMtg:{label:"Neighborhood meeting materials & venue",min:200,max:1000,when:"Required for ZPCIM (Denver), CUP (COS), or Special Use (EPC) pathways"},
  legalCounsel:{label:"Land use attorney consultation",min:1500,max:5000,when:"Recommended for any discretionary pathway (CUP, Special Use, ZPCIM)"},
  altaSurvey:{label:"ALTA survey",min:3000,max:7000,when:"May be required for site development plans or complex parcels"},
  stateLicense:{label:"State licensing fees (CDPHE/BHA)",min:300,max:2500,when:"Required for all licensed facilities — varies by facility type and bed count"},
  fireReview:{label:"Fire code review / sprinkler upgrade",min:1000,max:25000,when:"R-4 occupancy (typically 16+ residents) triggers sprinkler and fire alarm requirements"}
};

const GIS_TRANSITIONS={
  idle:      ["searching","skipped"],
  searching: ["error","disambig","querying"],
  disambig:  ["querying","idle"],
  querying:  ["done","error"],
  done:      ["idle"],
  error:     ["idle","skipped"],
  skipped:   ["idle"]
};
