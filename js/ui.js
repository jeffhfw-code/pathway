/* ═══════════════════════════════════════════════════════════════════
   UI MODULE — Rendering, wizard pages, and shared helpers
   Dependencies: config.js, state.js, gis.js, engine-*.js
   ═══════════════════════════════════════════════════════════════════ */
const APP=document.getElementById("app");

/* ── Shared Helpers ───────────────────────────────────────────── */
function setR(k,v){if(/^[a-zA-Z0-9_]+$/.test(k))ST.form[k]=v;render()}
function r2(k,v){return`<button class="radio-btn ${v==="yes"?"sel":""}" onclick="setR('${k}','yes')">Yes</button><button class="radio-btn ${v==="no"?"sel":""}" onclick="setR('${k}','no')">No</button>`}
function r3(k,v){return`<button class="radio-btn ${v==="yes"?"sel":""}" onclick="setR('${k}','yes')">Yes</button><button class="radio-btn ${v==="no"?"sel":""}" onclick="setR('${k}','no')">No</button><button class="radio-btn ${v==="unknown"?"sel":""}" onclick="setR('${k}','unknown')">Unknown</button>`}
function esc(s){return(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}
function citeLink(cite){const url=citeURL(cite,ST.jurisdiction);return url?`<a class="cite" href="${esc(url)}" target="_blank" rel="noopener">${cite}</a>`:`<span class="cite">${cite}</span>`}

/* ═══════════════════════════════════════════════════════════════════
   WIZARD PAGES
   ═══════════════════════════════════════════════════════════════════ */
function getPages(){
  if(!ST.jurisdiction)return[{id:"jurisdiction"}];
  if(ST.jurisdiction==="denver")return getDenverPages();
  if(ST.jurisdiction==="epc")return getEPCPages();
  if(ST.jurisdiction==="manitou")return getManitouPages();
  return getCOSPages();
}

/* Page-to-form-key map for skipping defaulted pages */
const PAGE_KEY_MAP={licensing:"licensing",correctional:"correctional",op24hr:"op24hr",overnight:"overnight",epcSexOffender:"epcSexOffender",epcNonprofit:"epcNonprofit"};
function skipPage(id){const k=PAGE_KEY_MAP[id];return k&&FORM_DEFAULTS[k]!==undefined}
function addIf(p,id){if(!skipPage(id))p.push({id})}

function getDenverPages(){
  const p=[{id:"addressLookup"},{id:"zone"}];const z=ST.form.zone;if(!z)return p;
  const ut=UT[z];if(!ut)return p;
  if(ut.t1==="NP"&&ut.t2==="NP"&&ut.t3==="NP"&&ut.t4==="NP"){p.push({id:"allNP"});return p}
  addIf(p,"licensing");addIf(p,"correctional");addIf(p,"op24hr");addIf(p,"overnight");
  if(ut.t1!=="NP")p.push({id:"religious"});
  p.push({id:"existingRC"});
  if(ST.form.existingRC==="yes")p.push({id:"maintained"});
  if(isSU_TU_anyRH(z))p.push({id:"lotSize"});
  if(isSU_TU_RH25(z)||ut.t4!=="NP")p.push({id:"rcWithin1mi"});
  if(ut.t4!=="NP")p.push({id:"rcType34within1mi"});
  if(ut.t3!=="NP"||ut.t4!=="NP")p.push({id:"distType34"});
  p.push({id:"review"});return p;
}

function getCOSPages(){
  const p=[{id:"cosAddressLookup"},{id:"cosZone"}];const z=ST.form.zone;if(!z)return p;
  const ut=COS_UT[z];if(!ut)return p;
  // Check if anything is permitted at all
  const allN=Object.values(ut).every(v=>v==="N");
  if(allN){p.push({id:"allNP"});return p}
  addIf(p,"licensing");addIf(p,"correctional");p.push({id:"cosFHA"});
  // If FBZ or PDZ, ask about plan
  if(z==="FBZ")p.push({id:"cosFBZ"});
  if(z==="PDZ")p.push({id:"cosPDZ"});
  addIf(p,"op24hr");
  // Population-specific questions
  p.push({id:"cosPopulation"});
  // Separation — only matters for GLR/Detox pathways
  const hasGLR=ut.glrS!=="N"||ut.glrM!=="N"||ut.glrL!=="N"||ut.detox!=="N";
  if(hasGLR)p.push({id:"cosDistance"});
  // Construction type
  p.push({id:"cosConstruction"});
  // Existing use
  p.push({id:"existingRC"});
  if(ST.form.existingRC==="yes")p.push({id:"maintained"});
  p.push({id:"review"});return p;
}

function getEPCPages(){
  const p=[{id:"epcAddress"},{id:"epcZone"}];const z=ST.form.zone;if(!z)return p;
  if(z==="PUD"){p.push({id:"epcPUD"});return p}
  const ut=EPC_UT[z];if(!ut)return p;
  const allN=Object.values(ut).every(v=>v==="N");
  if(allN){p.push({id:"allNP"});return p}
  // Site facts — engine tests all 16 pathways against these inputs
  addIf(p,"licensing");
  addIf(p,"correctional");
  addIf(p,"epcSexOffender");
  addIf(p,"op24hr");
  addIf(p,"overnight");
  // Nonprofit — gates philanthropic pathway
  if(ut.philanthropic!=="N"||ut.rehab!=="N")addIf(p,"epcNonprofit");
  // Separation — only relevant if GH permitted in this zone AND zone is not commercial
  if(ut.gh==="A4"&&!epcIsCommercial(z))p.push({id:"epcSeparation"});
  // CAD-O: auto-determined by GIS overlay query — no intake page needed
  // Existing use
  p.push({id:"existingRC"});
  if(ST.form.existingRC==="yes")p.push({id:"maintained"});
  p.push({id:"review"});return p;
}

function getManitouPages(){
  const p=[{id:"manAddress"},{id:"manZone"}];const z=ST.form.zone;if(!z)return p;
  const ut=MAN_UT[z];if(!ut)return p;
  const allN=Object.values(ut).every(v=>v==="N");
  if(allN){p.push({id:"allNP"});return p}
  p.push({id:"manTreatment"});
  p.push({id:"manPopulation"});
  p.push({id:"manOperations"});
  p.push({id:"manConstruction"});
  p.push({id:"existingRC"});
  if(ST.form.existingRC==="yes"){p.push({id:"maintained"});p.push({id:"manPreexisting"})}
  p.push({id:"review"});return p;
}

function advance(){const pages=getPages();if(ST.pg<pages.length-1)ST.pg++;render()}
function goBack(){if(ST.pg>0){ST.pg--;render()}}

/* ═══════════════════════════════════════════════════════════════════
   RENDER — MAIN ROUTER
   ═══════════════════════════════════════════════════════════════════ */
let _prevPg=-1;
function render(){
  if(ST.showSaved){renderSavedList();return}
  if(ST.showCompare){renderComparison();return}
  if(ST.showGlossary){renderGlossary();return}
  if(ST.results){renderRes();return}
  const pages=getPages();ST.pg=Math.min(ST.pg,pages.length-1);const pg=ST.pg;const page=pages[pg];const f=ST.form;
  // Progress dots (skip for jurisdiction page)
  let h="";
  if(page.id!=="jurisdiction"){
    h='<div class="pg-progress">';for(let i=0;i<pages.length;i++)h+=`<div class="pg-dot ${i<pg?"done":i===pg?"cur":""}"></div>`;
    h+=`<span class="pg-label">${pg+1} of ${pages.length}</span>`;
    h+=`<button class="btn-restart" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()" title="Start a new analysis">New Analysis</button>`;
    h+=`</div>`;
  }
  const bk=pg>0?`<button class="btn-secondary" onclick="goBack()">Back</button>`:"";
  const nx=`<button class="btn-primary" onclick="advance()">Next</button>`;

  /* ── Jurisdiction selector ─────────────────────────────────── */
  if(page.id==="jurisdiction"){
    h+=`<p class="q-title">Property address</p>`;
    h+=`<p class="q-sub">Enter the street address and the tool will automatically detect which jurisdiction applies.</p>`;
    if(ST.autoDetectPhase==="searching"){
      h+=`<div class="addr-row"><input type="text" id="auto-addr" class="addr-input" aria-label="Enter property address" value="${esc(ST.form.address||"")}" placeholder="e.g. 1680 Sherman St, 123 Manitou Ave" disabled /><button class="btn-primary addr-btn" disabled>Looking up\u2026</button></div>`;
      h+=`<div class="lookup-status"><span class="spinner"></span>Searching all jurisdictions\u2026</div>`;
    }else{
      h+=`<div class="addr-row"><input type="text" id="auto-addr" class="addr-input" aria-label="Enter property address" value="${esc(ST.form.address||"")}" placeholder="e.g. 1680 Sherman St, 123 Manitou Ave" /><button class="btn-primary addr-btn" onclick="autoDetectStart()">Look up</button></div>`;
      if(ST.autoDetectPhase==="error"){h+=`<div class="lookup-error">${esc(ST.autoDetectError)}</div>`}
    }
    h+=`<div class="jur-divider"><span>or select jurisdiction manually</span></div>`;
    h+=`<div class="jur-card ${ST.jurisdiction==="denver"?"sel":""}" role="button" tabindex="0" aria-label="Select Denver" onclick="ST.autoDetectPhase=null;ST.jurisdiction='denver';resetState(true);ST.pg=0;render()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><p class="jur-name">Denver</p><p class="jur-desc">Denver Zoning Code — Residential Care Types 1–4 (DZC Art. 11, §§ 11.2.8–11.2.12)</p></div>`;
    h+=`<div class="jur-card ${ST.jurisdiction==="cos"?"sel":""}" role="button" tabindex="0" aria-label="Select Colorado Springs" onclick="ST.autoDetectPhase=null;ST.jurisdiction='cos';resetState(true);ST.pg=0;render()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><p class="jur-name">Colorado Springs</p><p class="jur-desc">Unified Development Code — Group Living / Human Services Establishment (UDC Ch. 7, § 7.3.301E)</p></div>`;
    h+=`<div class="jur-card ${ST.jurisdiction==="epc"?"sel":""}" role="button" tabindex="0" aria-label="Select El Paso County" onclick="ST.autoDetectPhase=null;ST.jurisdiction='epc';resetState(true);ST.pg=0;render()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><p class="jur-name">El Paso County</p><p class="jur-desc">Land Development Code — Group Home / Institutional BH Pathways (LDC Ch. 5, § 5.2.17) · SP-05 enforcement policy active</p></div>`;
    h+=`<div class="jur-card ${ST.jurisdiction==="manitou"?"sel":""}" role="button" tabindex="0" aria-label="Select Manitou Springs" onclick="ST.autoDetectPhase=null;ST.jurisdiction='manitou';resetState(true);ST.pg=0;render()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}"><p class="jur-name">Manitou Springs</p><p class="jur-desc">Land Use &amp; Development Code — Group Home, LTC, Medical &amp; Boarding Pathways (LUDC Title 18)</p></div>`;
    if(ST.jurisdiction){h+=`<div class="btn-row"><button class="btn-primary" onclick="advance()">Next</button></div>`}
    APP.innerHTML=h;
    const autoInput=document.getElementById("auto-addr");
    if(autoInput&&ST.autoDetectPhase!=="searching"){autoInput.focus();autoInput.addEventListener("keydown",e=>{if(e.key==="Enter")autoDetectStart()})}
    return;
  }

  /* ── DENVER INTAKE PAGES (unchanged from v12) ──────────────── */
  if(ST.jurisdiction==="denver"){
    if(page.id==="addressLookup"){
      h+=`<p class="q-title">Property address</p>`;
      h+=`<p class="q-sub">Enter a Denver address. The tool will query city data layers to auto-populate zone district, lot size, and RC facility counts.</p>`;
      if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped"){
        h+=`<div class="addr-row"><input type="text" id="gis-addr" class="addr-input" aria-label="Enter address for Denver GIS lookup" value="${esc(f.address||"")}" placeholder="e.g. 1680 Sherman St, 2901 Blake St" /><button class="btn-primary addr-btn" onclick="gisStartLookup()">Look up</button></div>`;
        if(ST.gisPhase==="error"){h+=`<div class="lookup-error">${esc(ST.gisError)}</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="gisSkip()">Skip lookup — enter manually</button></div>`}
        else if(ST.gisPhase==="skipped"){h+=`<div style="margin-top:12px;font-size:13px;color:#9B9BA7;">Lookup skipped. You'll enter zone, lot size, and RC data manually in later steps.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="ST.form.address=document.getElementById('gis-addr').value||null;advance()">Next</button></div>`}
        else{h+=`<div class="field-help">Press "Look up" to query Denver's ArcGIS layers, or leave blank and click Next to enter all data manually.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.form.address=document.getElementById('gis-addr').value||null;setGisPhase('skipped');advance()">Skip — enter manually</button></div>`}
      }
      else if(ST.gisPhase==="searching"){h+=`<div class="lookup-status"><span class="spinner"></span>Searching Denver address points\u2026</div>`}
      else if(ST.gisPhase==="disambig"){
        h+=`<div style="margin:12px 0;"><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">Multiple addresses matched. Select the correct one:</p><ul class="disambig-list">`;
        ST.gisAddresses.forEach((a,i)=>{h+=`<li class="disambig-item" onclick="gisSelectAddress(${i})"><span class="disambig-addr">${esc(a.FULL_ADDRESS)}</span></li>`});
        h+=`</ul></div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="setGisPhase('idle');render()">Try a different address</button></div>`;
      }
      else if(ST.gisPhase==="querying"){h+=`<div class="lookup-status"><span class="spinner"></span>Querying parcel, zoning, and RC facility layers\u2026</div>`}
      else if(ST.gisPhase==="done"){
        const gd=ST.gisData;const resolvedZone=ST.gisAutoZone;const knownZone=resolvedZone&&ZL.includes(resolvedZone);
        h+=`<div class="lookup-success"><div class="lk-title">${esc(gd.matchedAddr)}</div><div style="margin-top:8px;">`;
        h+=`<div class="auto-field"><span class="auto-label">Zone district</span><span class="auto-val">${resolvedZone?esc(resolvedZone):"Not found"}`;
        if(resolvedZone&&!knownZone)h+=` <span style="color:#FBBF24;font-size:11px;">(not in Use Table)</span>`;
        h+=`<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Lot size</span><span class="auto-val">${ST.gisAutoLot?ST.gisAutoLot.toLocaleString()+" sf":"Not found"}<span class="auto-badge api">API</span></span></div>`;
        if(ST.gisAutoLot){
          h+=`<div style="font-size:11px;color:#6B6B78;padding:2px 0 4px;line-height:1.5;">Source: assessor LAND_AREA field. <a href="${ASSR}" target="_blank" rel="noopener" style="color:#6EA4E8;font-weight:500;">Verify</a> if precision matters.</div>`;
          if(ST.gisAutoLot>=11500&&ST.gisAutoLot<=12500){h+=`<div style="font-size:11px;color:#F09595;padding:2px 0 4px;line-height:1.5;font-weight:500;">\u26a0 Lot size is within 500 sf of the 12,000 sf Type 2 threshold (§ 11.2.10.1.C). Verify exact lot size with the assessor.</div>`}
        }
        h+=`<div class="auto-field"><span class="auto-label">RC facilities within 1 mi</span><span class="auto-val">${ST.gisAutoRC}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Type 3/4 within 1 mi</span><span class="auto-val">${ST.gisAutoRC34}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Distance to nearest 3/4</span><span class="auto-val">${ST.gisAutoDist34!=null?ST.gisAutoDist34.toLocaleString()+" ft":"None within 1 mi"}<span class="auto-badge api">API</span></span></div>`;
        h+=`</div></div>`;
        h+=`<details class="override-row"><summary>Override auto-populated values</summary><div class="override-grid">`;
        h+=`<div class="override-item"><label>Zone district</label><select id="ov-zone" onchange="ST.gisOverrides.zone=this.value"><option value="">— Use API value —</option>`;
        for(const[gn,gd2] of Object.entries(ZG)){const zz=gd2.p?ZL.filter(z=>z.startsWith(gd2.p)):ZL.filter(z=>z==="MHC"||z==="O-1");if(!zz.length)continue;h+=`<optgroup label="${gn}">`;zz.forEach(z=>{h+=`<option value="${z}"${ST.gisOverrides.zone===z?" selected":""}>${z}</option>`});h+=`</optgroup>`}
        h+=`</select></div>`;
        h+=`<div class="override-item"><label>Lot size (sf)</label><input type="number" id="ov-lot" value="${ST.gisOverrides.lotSize||""}" placeholder="${ST.gisAutoLot||"Enter value"}" onchange="ST.gisOverrides.lotSize=this.value"></div>`;
        h+=`<div class="override-item"><label>RC within 1 mi</label><input type="number" id="ov-rc" value="${ST.gisOverrides.rcWithin1mi!=null?ST.gisOverrides.rcWithin1mi:""}" placeholder="${ST.gisAutoRC}" onchange="ST.gisOverrides.rcWithin1mi=this.value"></div>`;
        h+=`<div class="override-item"><label>Type 3/4 within 1 mi</label><input type="number" id="ov-rc34" value="${ST.gisOverrides.rcType34within1mi!=null?ST.gisOverrides.rcType34within1mi:""}" placeholder="${ST.gisAutoRC34}" onchange="ST.gisOverrides.rcType34within1mi=this.value"></div>`;
        h+=`<div class="override-item"><label>Dist. to nearest 3/4 (ft)</label><input type="number" id="ov-d34" value="${ST.gisOverrides.distType34||""}" placeholder="${ST.gisAutoDist34!=null?ST.gisAutoDist34:"None found"}" onchange="ST.gisOverrides.distType34=this.value"></div>`;
        h+=`</div></details>`;
        h+=`<div class="data-caveats">Distances are straight-line Haversine from address points \u2014 DZC § 13.1.11.1 measures from the nearest building point, which may differ. RC layer (~159 records) may not reflect recent approvals or closures. Always verify with Denver CPD.</div>`;
        h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="gisApplyAndContinue()">Accept and continue</button></div>`;
      }
      APP.innerHTML=h;
      const addrInput=document.getElementById("gis-addr");
      if(addrInput){if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped")addrInput.focus();addrInput.addEventListener("keydown",e=>{if(e.key==="Enter")gisStartLookup()})}
      return;
    }
    else if(page.id==="zone"){
      const autoSrc=ST.gisPhase==="done"&&ST.gisAutoZone&&ZL.includes(f.zone||"")&&!ST.gisOverrides.zone;
      h+=`<p class="q-title">Zone district</p><p class="q-sub">`;
      if(autoSrc)h+=`Auto-populated from ArcGIS. Confirm or change the zone district.`;else h+=`Select the zone district for this property.`;
      h+=`</p><select class="zs" aria-label="Select Denver zone district" onchange="ST.form.zone=this.value||null;ST.pg=${pg};render()"><option value="">— Select —</option>`;
      for(const[gn,gd] of Object.entries(ZG)){const zz=gd.p?ZL.filter(z=>z.startsWith(gd.p)):ZL.filter(z=>z==="MHC"||z==="O-1");if(!zz.length)continue;h+=`<optgroup label="${gn}">`;zz.forEach(z=>{h+=`<option value="${z}" ${f.zone===z?"selected":""}>${z}</option>`});h+=`</optgroup>`}
      h+=`</select>`;
      if(autoSrc)h+=`<div class="field-help" style="color:#4ADE80;">Source: Denver zoning layer (ODC_ZONE_ZONING_A) <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      else h+=`<a class="gis-link" href="${ZMAP}" target="_blank" rel="noopener">Open Denver zoning map &#8599;</a>`;
      if(!autoSrc){h+=`<div class="info-box"><strong>How to find your zone district:</strong><ol><li>Click the link above to open Denver's official zoning map.</li><li>Search for the property address.</li><li>Click the parcel — the zone district code appears in the popup.</li><li>Select the matching code above.</li></ol></div>`}
      h+=`<div class="btn-row">${bk}${f.zone?nx:""}</div>`;
    }
    else if(page.id==="allNP"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.5rem;"><p style="font-size:18px;font-weight:600;color:#F09595;margin:0 0 8px;">&#9940; Analysis Stopped — Absolute Prohibition</p><p style="font-size:14px;color:#D87070;margin:0 0 12px;">${ST.jurisdiction==="denver"?"Residential Care is not permitted in any form":"No group living or human services uses are permitted"} in the <strong>${esc(f.zone)}</strong> zone district.</p><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">The intended use is prohibited under the applicable zoning rules. No viable pathway exists in this zone, and continuing the analysis is unnecessary because this result is dispositive.</p><p style="font-size:12px;color:#6B6B78;margin:0;">To proceed, consider: (1) a different property in a permissive zone, or (2) a rezoning application (if available).</p></div><div class="btn-row"><button class="btn-primary" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()">New Analysis</button><button class="btn-secondary" onclick="ST.form.zone=null;ST.pg=1;render()">Select different zone</button></div>`}
    else if(page.id==="licensing"){h+=`<p class="q-title">Licensing and certification</p><p class="q-sub">Can the operator obtain all required state and City licensing or certification?</p><div class="radio-row">${r3("licensing",f.licensing)}</div><div class="btn-row">${bk}${f.licensing!==null?nx:""}</div>`}
    else if(page.id==="correctional"){h+=`<p class="q-title">Correctional supervision population</p><p class="q-sub">Will the facility serve non-paroled persons placed by a court, corrections department, or supervised transition program?</p><div class="radio-row">${r2("correctional",f.correctional)}</div><div class="field-help">Does not include parolees or voluntary participants.</div><div class="btn-row">${bk}${f.correctional!==null?nx:""}</div>`}
    else if(page.id==="op24hr"){h+=`<p class="q-title">24-hour operation</p><p class="q-sub">Will the facility operate 24 hours per day?</p><div class="radio-row">${r2("op24hr",f.op24hr)}</div><div class="btn-row">${bk}${f.op24hr!==null?nx:""}</div>`}
    else if(page.id==="overnight"){h+=`<p class="q-title">Overnight stays</p><p class="q-sub">Are overnight stays part of the operational model?</p><div class="radio-row">${r2("overnight",f.overnight)}</div><div class="btn-row">${bk}${f.overnight!==null?nx:""}</div>`}
    else if(page.id==="religious"){h+=`<p class="q-title">Religious assembly operator</p><p class="q-sub">Is a Religious Assembly use operating on the same lot?</p><div class="radio-row">${r2("religious",f.religious)}</div><div class="field-help">If "Yes," Type 1 may operate without a zoning permit (§ 11.2.9.1).</div><div class="btn-row">${bk}${f.religious!==null?nx:""}</div>`}
    else if(page.id==="existingRC"){h+=`<p class="q-title">Existing ${ST.jurisdiction==="denver"?"Residential Care":"group living/RC"} use</p><p class="q-sub">Is there an existing ${ST.jurisdiction==="denver"?"Residential Care":"group living or human services"} use on this lot?</p><div class="radio-row">${r3("existingRC",f.existingRC)}</div><div class="btn-row">${bk}${f.existingRC!==null?nx:""}</div>`}
    else if(page.id==="maintained"){h+=`<p class="q-title">Continuously maintained?</p><p class="q-sub">Has the existing use been continuously maintained since legally established?</p><div class="radio-row">${r3("maintained",f.maintained)}</div><div class="btn-row">${bk}${f.maintained!==null?nx:""}</div>`}
    else if(page.id==="lotSize"){
      const autoLot=ST.gisPhase==="done"&&ST.gisAutoLot&&!ST.gisOverrides.lotSize;
      h+=`<p class="q-title">Lot size</p><p class="q-sub">${f.zone} is an ${isSU(f.zone)?"SU":isTU(f.zone)?"TU":"RH"} zone where Type 2 requires a minimum 12,000 sf lot (§ 11.2.10.1.C).`;
      if(autoLot)h+=` <span style="color:#4ADE80;">Auto-populated from ArcGIS.</span>`;
      h+=`</p><input type="number" id="lot" value="${f.lotSize||""}" placeholder="e.g. 15000" style="width:220px;">`;
      if(!autoLot)h+=`<a class="gis-link" href="${ASSR}" target="_blank" rel="noopener">Look up on Denver Property Records &#8599;</a>`;
      else h+=`<div class="field-help" style="color:#4ADE80;">Source: Denver assessor layer (LAND_AREA) <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      h+=`<div class="field-help">If unknown, skip — the engine will flag it as a caveat.</div><div class="btn-row">${bk}<button class="btn-primary" onclick="var v=document.getElementById('lot').value;ST.form.lotSize=v?Number(v):null;advance()">Next</button></div>`;
    }
    else if(page.id==="rcWithin1mi"){
      const autoRC=ST.gisPhase==="done"&&ST.gisAutoRC!=null&&ST.gisOverrides.rcWithin1mi===undefined;
      h+=`<p class="q-title">RC facilities within 1 mile</p><p class="q-sub">How many Residential Care facilities of any type are within a 1-mile radius?`;
      if(autoRC)h+=` <span style="color:#4ADE80;">Auto-populated from ArcGIS (${ST.gisAutoRC} found).</span>`;
      h+=`</p><input type="number" id="rc1" value="${f.rcWithin1mi===null?"":f.rcWithin1mi}" placeholder="e.g. 2" style="width:160px;">`;
      if(!autoRC)h+=`<a class="gis-link" href="${RC_MAP}" target="_blank" rel="noopener">Open Denver RC facility map &#8599;</a>`;
      else h+=`<div class="field-help" style="color:#4ADE80;">Source: Denver RC facility layer (ODC_SVCS_RESCAREFACILITY_P) <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="var v=document.getElementById('rc1').value;ST.form.rcWithin1mi=v===''?null:Number(v);advance()">Next</button></div>`;
    }
    else if(page.id==="rcType34within1mi"){
      const autoRC34=ST.gisPhase==="done"&&ST.gisAutoRC34!=null&&ST.gisOverrides.rcType34within1mi===undefined;
      h+=`<p class="q-title">Type 3/4 facilities within 1 mile</p><p class="q-sub">Of those RC facilities, how many are Type 3 (41–100 guests) or Type 4 (101+)?`;
      if(autoRC34)h+=` <span style="color:#4ADE80;">Auto-populated (${ST.gisAutoRC34} found).</span>`;
      h+=`</p><input type="number" id="rc34" value="${f.rcType34within1mi===null?"":f.rcType34within1mi}" placeholder="e.g. 0" style="width:160px;">`;
      if(!autoRC34)h+=`<a class="gis-link" href="${RC_MAP}" target="_blank" rel="noopener">Open Denver RC facility map &#8599;</a>`;
      else h+=`<div class="field-help" style="color:#4ADE80;">Source: Denver RC facility layer <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="var v=document.getElementById('rc34').value;ST.form.rcType34within1mi=v===''?null:Number(v);advance()">Next</button></div>`;
    }
    else if(page.id==="distType34"){
      const autoDist=ST.gisPhase==="done"&&ST.gisAutoDist34!=null&&ST.gisOverrides.distType34===undefined;
      h+=`<p class="q-title">Distance to nearest Type 3 or Type 4</p><p class="q-sub">Straight-line distance in feet to the nearest Type 3 or Type 4 RC facility.`;
      if(autoDist)h+=` <span style="color:#4ADE80;">Auto-populated (${ST.gisAutoDist34.toLocaleString()} ft).</span>`;
      else if(ST.gisPhase==="done"&&ST.gisAutoDist34==null)h+=` <span style="color:#4ADE80;">No Type 3/4 found within 1 mile.</span>`;
      h+=`</p><input type="number" id="d34" value="${f.distType34===null?"":f.distType34}" placeholder="e.g. 2500" style="width:220px;">`;
      h+=`<div class="field-help">Straight-line per § 13.1.11.1. If none nearby, enter 99999 or leave blank.</div><div class="btn-row">${bk}<button class="btn-primary" onclick="var v=document.getElementById('d34').value;ST.form.distType34=v===''?null:Number(v);advance()">Next</button></div>`;
    }
    else if(page.id==="review"){h+=`<p class="q-title">Review and run</p><p class="q-sub">Confirm your inputs, then run the analysis.</p>`;h+=rFacts();h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="go()">Run analysis</button></div>`}
  }

  /* ── COS INTAKE PAGES ──────────────────────────────────────── */
  if(ST.jurisdiction==="cos"){
    if(page.id==="cosAddressLookup"){
      h+=`<p class="q-title">Property address</p>`;
      h+=`<p class="q-sub">Enter a Colorado Springs address. The tool will query COS ArcGIS and CDPHE layers to auto-populate zone, overlays, lot size, and nearby facilities.</p>`;
      if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped"){
        h+=`<div class="addr-row"><input type="text" id="cos-addr" class="addr-input" aria-label="Enter address for Colorado Springs GIS lookup" value="${esc(f.address||"")}" placeholder="e.g. 1215 N Nevada Ave, 955 E Colorado Ave" /><button class="btn-primary addr-btn" onclick="cosGisStart()">Look up</button></div>`;
        if(ST.gisPhase==="error"){h+=`<div class="lookup-error">${esc(ST.gisError)}</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="gisSkip()">Skip — enter manually</button></div>`}
        else if(ST.gisPhase==="skipped"){h+=`<div style="margin-top:12px;font-size:13px;color:#9B9BA7;">Lookup skipped.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="ST.form.address=document.getElementById('cos-addr')?.value||null;advance()">Next</button></div>`}
        else{h+=`<div class="field-help">Press "Look up" to query Colorado Springs GIS layers, or skip to enter data manually.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.form.address=document.getElementById('cos-addr')?.value||null;setGisPhase('skipped');advance()">Skip — enter manually</button></div>`}
      }
      else if(ST.gisPhase==="searching"){h+=`<div class="lookup-status"><span class="spinner"></span>Searching Colorado Springs address points\u2026</div>`}
      else if(ST.gisPhase==="disambig"){
        h+=`<div style="margin:12px 0;"><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">Multiple addresses matched:</p><ul class="disambig-list">`;
        ST.gisAddresses.forEach((a,i)=>{h+=`<li class="disambig-item" onclick="cosGisSelect(${i})"><span class="disambig-addr">${esc(a.FullAddress)}</span></li>`});
        h+=`</ul></div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="setGisPhase('idle');render()">Try a different address</button></div>`;
      }
      else if(ST.gisPhase==="querying"){h+=`<div class="lookup-status"><span class="spinner"></span>Querying parcel, zoning, overlay, and facility layers\u2026</div>`}
      else if(ST.gisPhase==="done"){
        const gd=ST.gisData;
        h+=`<div class="lookup-success"><div class="lk-title">${esc(gd.matchedAddr)}</div><div style="margin-top:8px;">`;
        h+=`<div class="auto-field"><span class="auto-label">Zone district</span><span class="auto-val">${ST.gisAutoZone?esc(ST.gisAutoZone):"Not found"}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Lot size</span><span class="auto-val">${ST.gisAutoLot?ST.gisAutoLot.toLocaleString()+" sf":"Not found"}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Overlays</span><span class="auto-val">${ST.cosAutoOverlays.length?ST.cosAutoOverlays.join(", "):"None"}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">CDPHE facilities within 1 mi</span><span class="auto-val">${ST.cosAutoFacilities.length}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Assisted living within 1 mi</span><span class="auto-val">${ST.cosAutoALR}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Nearest ALR/nursing facility</span><span class="auto-val">${ST.cosAutoNearestFacDist!=null?ST.cosAutoNearestFacDist.toLocaleString()+" ft":"None within 1 mi"}<span class="auto-badge api">API</span></span></div>`;
        if(ST.cosAutoCUP.length)h+=`<div class="auto-field"><span class="auto-label">Existing CUP records</span><span class="auto-val">${ST.cosAutoCUP.join(", ")}<span class="auto-badge api">API</span></span></div>`;
        h+=`</div></div>`;
        h+=`<details class="override-row"><summary>Override auto-populated values</summary><div class="override-grid">`;
        h+=`<div class="override-item"><label>Zone district</label><select onchange="ST.gisOverrides.zone=this.value"><option value="">— Use API value —</option>`;
        for(const[gn,gd2] of Object.entries(COS_ZG)){gd2.list.forEach(z=>{h+=`<option value="${z}"${ST.gisOverrides.zone===z?" selected":""}>${z}</option>`})}
        h+=`</select></div>`;
        h+=`<div class="override-item"><label>Lot size (sf)</label><input type="number" value="${ST.gisOverrides.lotSize||""}" placeholder="${ST.gisAutoLot||""}" onchange="ST.gisOverrides.lotSize=this.value"></div>`;
        h+=`</div></details>`;
        h+=`<div class="data-caveats">COS ArcGIS + CDPHE statewide health facility layer. CDPHE shows state-licensed facilities only \u2014 does not identify UDC Group Living Residences. Distances are Haversine. Verify with COS Planning.</div>`;
        h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="cosGisApply()">Accept and continue</button></div>`;
      }
      APP.innerHTML=h;
      const ci=document.getElementById("cos-addr");
      if(ci){if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped")ci.focus();ci.addEventListener("keydown",e=>{if(e.key==="Enter")cosGisStart()})}
      return;
    }
    else if(page.id==="cosZone"){
      const autoSrc=ST.gisPhase==="done"&&ST.gisAutoZone&&COS_ZL.includes(f.zone||"")&&!ST.gisOverrides.zone;
      h+=`<p class="q-title">Zone district</p><p class="q-sub">`;
      if(autoSrc)h+=`Auto-populated from ArcGIS. Confirm or change.`;else h+=`Select the zone district.`;
      h+=`</p><select class="zs" aria-label="Select Colorado Springs zone district" onchange="ST.form.zone=this.value||null;ST.pg=${pg};render()"><option value="">— Select —</option>`;
      for(const[gn,gd] of Object.entries(COS_ZG)){h+=`<optgroup label="${gn}">`;gd.list.forEach(z=>{h+=`<option value="${z}" ${f.zone===z?"selected":""}>${z}</option>`});h+=`</optgroup>`}
      h+=`</select>`;
      if(autoSrc)h+=`<div class="field-help" style="color:#4ADE80;">Source: COS zoning layer <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      else h+=`<a class="gis-link" href="${COS_ZMAP}" target="_blank" rel="noopener">Open Colorado Springs zoning map &#8599;</a>`;
      h+=`<div class="btn-row">${bk}${f.zone?nx:""}</div>`;
    }
    else if(page.id==="allNP"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.5rem;"><p style="font-size:18px;font-weight:600;color:#F09595;margin:0 0 8px;">&#9940; Analysis Stopped — Absolute Prohibition</p><p style="font-size:14px;color:#D87070;margin:0 0 12px;">No group living or human services uses are permitted in the <strong>${esc(f.zone)}</strong> zone district.</p><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">The intended use is prohibited under the applicable zoning rules. No viable pathway exists in this zone, and continuing the analysis is unnecessary because this result is dispositive.</p><p style="font-size:12px;color:#6B6B78;margin:0;">To proceed, consider: (1) a different property in a permissive zone, or (2) a rezoning application (if available).</p></div><div class="btn-row"><button class="btn-primary" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()">New Analysis</button><button class="btn-secondary" onclick="ST.form.zone=null;ST.pg=1;render()">Select different zone</button></div>`}
    else if(page.id==="licensing"){h+=`<p class="q-title">Licensing and certification</p><p class="q-sub">Can the operator obtain all required state licensing or certification? (§ 7.3.107)</p><div class="radio-row">${r3("licensing",f.licensing)}</div><div class="btn-row">${bk}${f.licensing!==null?nx:""}</div>`}
    else if(page.id==="correctional"){h+=`<p class="q-title">Correctional supervision population</p><p class="q-sub">Will the facility serve persons under correctional supervision (parolees, probationers, court-ordered placement)?</p><div class="radio-row">${r2("correctional",f.correctional)}</div><div class="field-help">Correctional populations are NOT FHA-protected \u2014 facility must use GLR pathway, not HSE. (§ 7.6.301)</div><div class="btn-row">${bk}${f.correctional!==null?nx:""}</div>`}
    else if(page.id==="cosFHA"){
      if(f.correctional==="yes"){h+=`<p class="q-title">FHA-protected population</p><p class="q-sub">Correctional supervision populations are not FHA-protected. The facility will use Group Living Residence (GLR) pathways only.</p>`;h+=`<div class="info-box">GLR pathway auto-selected. HSE pathways will be marked not viable.</div>`;h+=`<div class="btn-row">${bk}${nx}</div>`}
      else{h+=`<p class="q-title">FHA-protected population</p><p class="q-sub">Are all residents members of a Fair Housing Act protected class? (developmentally disabled, mentally ill, elderly, physically disabled/handicapped, or persons in drug/alcohol treatment)</p><div class="radio-row">${r3("fhaProtected",f.fhaProtected)}</div>`;h+=`<div class="field-help">FHA-protected \u2192 Human Services Establishment (HSE). Not protected \u2192 Group Living Residence (GLR). Different zone eligibility. (§ 7.6.301)</div>`;h+=`<div class="btn-row">${bk}${f.fhaProtected!==null?nx:""}</div>`}
    }
    else if(page.id==="cosFBZ"){h+=`<p class="q-title">FBZ regulating plan</p><p class="q-sub">Does the FBZ regulating plan permit group living or human services establishment uses?</p><div class="radio-row">${r3("fbzPermits",f.fbzPermits)}</div><div class="field-help">FBZ eligibility is per the applicable regulating plan (§ 7.3.102E).</div><div class="btn-row">${bk}${f.fbzPermits!==null?nx:""}</div>`}
    else if(page.id==="cosPDZ"){h+=`<p class="q-title">PDZ Land Use Plan</p><p class="q-sub">Does the approved PDZ Land Use Plan include group living or HSE uses? Note: HSE Small is permitted in all PDZ residential/mixed-use portions. (§ 7.2.704(3))</p><div class="radio-row">${r3("pdzPermits",f.pdzPermits)}</div><div class="btn-row">${bk}${f.pdzPermits!==null?nx:""}</div>`}
    else if(page.id==="op24hr"){h+=`<p class="q-title">24-hour operation</p><p class="q-sub">Will the facility operate 24 hours per day?</p><div class="radio-row">${r2("op24hr",f.op24hr)}</div><div class="btn-row">${bk}${f.op24hr!==null?nx:""}</div>`}
    else if(page.id==="cosPopulation"){
      h+=`<p class="q-title">Target population</p><p class="q-sub">Select any that apply to determine eligibility for specialized use categories.</p>`;
      h+=`<div style="margin-bottom:12px;"><label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 0;cursor:pointer;"><input type="checkbox" ${f.targetOver60==="yes"?"checked":""} onchange="ST.form.targetOver60=this.checked?'yes':'no';render()"> Residents exclusively over age 60 (Long-term Care Facility eligibility)</label>`;
      h+=`<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 0;cursor:pointer;"><input type="checkbox" ${f.targetTerminal==="yes"?"checked":""} onchange="ST.form.targetTerminal=this.checked?'yes':'no';render()"> ≥ 9 terminally ill residents, life expectancy &lt; 6 months (Hospice eligibility)</label>`;
      h+=`<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 0;cursor:pointer;"><input type="checkbox" ${f.tempShelter==="yes"?"checked":""} onchange="ST.form.tempShelter=this.checked?'yes':'no';render()"> Temporary shelter model, generally unlicensed (Human Services Shelter)</label></div>`;
      h+=`<div class="btn-row">${bk}${nx}</div>`;
    }
    else if(page.id==="cosDistance"){
      const autoFac=ST.gisPhase==="done"&&ST.cosAutoNearestFacDist!=null;
      h+=`<p class="q-title">Distance to nearest GLR or Detox Center</p><p class="q-sub">The 1,000-ft separation rule (§ 7.3.301E.1.a) applies to GLR and Detoxification Center uses. Enter distance in feet, or leave blank if unknown.`;
      if(autoFac)h+=` <span style="color:#4ADE80;">Auto-populated from CDPHE (nearest: ${esc(ST.cosAutoNearestFacName)}, ${ST.cosAutoNearestFacDist.toLocaleString()} ft).</span>`;
      else if(ST.gisPhase==="done"&&ST.cosAutoNearestFacDist==null)h+=` <span style="color:#4ADE80;">No CDPHE-licensed residential facilities found within 1 mile.</span>`;
      h+=`</p>`;
      h+=`<input type="number" id="cos-dist" value="${f.distGLRDetox===null?"":f.distGLRDetox}" placeholder="e.g. 1500" style="width:220px;">`;
      if(autoFac)h+=`<div class="field-help" style="color:#4ADE80;">Source: CDPHE statewide health facility layer <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      h+=`<div style="margin-top:12px;"><label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;"><input type="checkbox" ${f.nearestAL==="yes"?"checked":""} onchange="ST.form.nearestAL=this.checked?'yes':'no';render()"> Nearest GLR/Detox is licensed as assisted living (§ 7.3.301E.1.b exception)</label></div>`;
      h+=`<div class="field-help">Exception: separation rule does not apply between two establishments both licensed as assisted living.</div>`;
      h+=`<div class="field-help" style="margin-top:8px;color:#555568;">Note: CDPHE data shows state-licensed health facilities (ALR, nursing). This does not map 1:1 to UDC Group Living Residences or Detox Centers. Verify classification with COS Planning.</div>`;
      h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="var v=document.getElementById('cos-dist').value;ST.form.distGLRDetox=v===''?null:Number(v);advance()">Next</button></div>`;
    }
    else if(page.id==="cosConstruction"){
      h+=`<p class="q-title">Construction type</p><p class="q-sub">This determines whether a Development Plan is required. (§ 7.5.515B)</p>`;
      h+=`<div class="radio-row">`;
      ["new","conversion","existing"].forEach(v=>{
        const label=v==="new"?"New construction":v==="conversion"?"Conversion of existing structure":"Existing structure — no change";
        h+=`<button class="radio-btn ${f.constructionType===v?"sel":""}" onclick="ST.form.constructionType='${v}';render()">${label}</button>`;
      });
      h+=`</div>`;
      h+=`<div class="field-help">Conversion of existing single-family/two-family on a platted lot is exempt from Dev Plan (§ 7.5.515B.2.a).</div>`;
      h+=`<div class="btn-row">${bk}${f.constructionType?nx:""}</div>`;
    }
    else if(page.id==="existingRC"){h+=`<p class="q-title">Existing group living use</p><p class="q-sub">Is there an existing group living or human services use on this lot?</p><div class="radio-row">${r3("existingRC",f.existingRC)}</div><div class="btn-row">${bk}${f.existingRC!==null?nx:""}</div>`}
    else if(page.id==="maintained"){h+=`<p class="q-title">Continuously maintained?</p><p class="q-sub">Has the existing use been continuously maintained? Discontinuance for 12+ months loses nonconforming status. (§ 7.5.804E)</p><div class="radio-row">${r3("maintained",f.maintained)}</div><div class="btn-row">${bk}${f.maintained!==null?nx:""}</div>`}
    else if(page.id==="review"){h+=`<p class="q-title">Review and run</p><p class="q-sub">Confirm your inputs, then run the analysis.</p>`;h+=rFacts();h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="go()">Run analysis</button></div>`}
  }

  /* ── EPC INTAKE PAGES — site facts only; engine does classification ── */
  if(ST.jurisdiction==="epc"){
    if(page.id==="epcAddress"){
      h+=`<p class="q-title">Property address</p>`;
      h+=`<p class="q-sub">Enter an El Paso County (unincorporated) address. The tool will query county zoning and parcel layers to auto-populate zone district and lot size.</p>`;
      if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped"){
        h+=`<div class="addr-row"><input type="text" id="epc-addr" class="addr-input" aria-label="Enter address for El Paso County GIS lookup" value="${esc(f.address||"")}" placeholder="e.g. 7250 Campus Dr, 11525 Ridgeline Dr" /><button class="btn-primary addr-btn" onclick="epcGisStart()">Look up</button></div>`;
        if(ST.gisPhase==="error"){h+=`<div class="lookup-error">${esc(ST.gisError)}</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="gisSkip()">Skip — enter manually</button></div>`}
        else if(ST.gisPhase==="skipped"){h+=`<div style="margin-top:12px;font-size:13px;color:#9B9BA7;">Lookup skipped.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="ST.form.address=document.getElementById('epc-addr')?.value||null;advance()">Next</button></div>`}
        else{h+=`<div class="field-help">Press "Look up" to query EPC zoning and parcel layers, or skip to enter manually.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.form.address=document.getElementById('epc-addr')?.value||null;setGisPhase('skipped');advance()">Skip — enter manually</button></div>`}
      }
      else if(ST.gisPhase==="searching"){h+=`<div class="lookup-status"><span class="spinner"></span>Geocoding address\u2026</div>`}
      else if(ST.gisPhase==="disambig"){
        h+=`<div style="margin:12px 0;"><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">Multiple addresses matched. Select the correct one:</p><ul class="disambig-list">`;
        ST.gisAddresses.forEach((a,i)=>{h+=`<li class="disambig-item" onclick="epcGisSelect(${i})"><span class="disambig-addr">${esc(a.addr)}</span></li>`});
        h+=`</ul></div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="setGisPhase('idle');render()">Try a different address</button></div>`;
      }
      else if(ST.gisPhase==="querying"){h+=`<div class="lookup-status"><span class="spinner"></span>Querying zoning, parcel, and overlay layers\u2026</div>`}
      else if(ST.gisPhase==="done"){
        const gd=ST.gisData;const knownZone=gd.autoZone&&EPC_ZL.includes(gd.autoZone);
        // City cross-validation warning
        if(gd.cityWarning){
          const isFatal=gd.cityName&&!gd.autoZone; // inside city, no EPC zone = wrong jurisdiction
          h+=`<div style="background:${isFatal?"#2E1010":"#2E2410"};border:1px solid ${isFatal?"#5A2020":"#5A4A20"};border-radius:10px;padding:1rem 1.25rem;margin-bottom:12px;">`;
          h+=`<p style="font-size:13px;font-weight:500;color:${isFatal?"#F09595":"#FBBF24"};margin:0 0 4px;">${isFatal?"\u26d4 Incorporated City Detected":"\u26a0 Jurisdiction Verification Needed"}</p>`;
          h+=`<p style="font-size:12px;color:${isFatal?"#D87070":"#C4A840"};margin:0;">${esc(gd.cityWarning)}</p></div>`;
        }
        h+=`<div class="lookup-success"><div class="lk-title">${esc(gd.matchedAddr)}</div><div style="margin-top:8px;">`;
        h+=`<div class="auto-field"><span class="auto-label">Jurisdiction</span><span class="auto-val">${gd.cityName?esc(gd.cityName)+" (incorporated)":"Unincorporated El Paso County"}<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Zone district</span><span class="auto-val">${gd.autoZone?esc(gd.autoZone):"Not found"}`;
        if(gd.autoZone&&!knownZone)h+=` <span style="color:#FBBF24;font-size:11px;">(not in Use Table)</span>`;
        h+=`<span class="auto-badge api">API</span></span></div>`;
        h+=`<div class="auto-field"><span class="auto-label">Lot size</span><span class="auto-val">${gd.autoLot?gd.autoLot.toLocaleString()+" sf":"Not found"}<span class="auto-badge api">API</span></span></div>`;
        if(gd.parcelId)h+=`<div class="auto-field"><span class="auto-label">Parcel</span><span class="auto-val">${gd.parcelId}${gd.assessorLink?` <a href="${gd.assessorLink}" target="_blank" rel="noopener" style="color:#6EA4E8;font-size:11px;">Assessor &#8599;</a>`:""}</span></div>`;
        if(gd.autoOverlay)h+=`<div class="auto-field"><span class="auto-label">Overlay</span><span class="auto-val">${esc(gd.autoOverlay)}<span class="auto-badge api">API</span></span></div>`;
        // Spatialest building data
        if(gd.epcBuilding){
          const eb=gd.epcBuilding;
          if(eb.sqft)h+=`<div class="auto-field"><span class="auto-label">Building sqft</span><span class="auto-val">${eb.sqft.toLocaleString()} sf<span class="auto-badge api">Assessor</span></span></div>`;
          if(eb.yearBuilt)h+=`<div class="auto-field"><span class="auto-label">Year built</span><span class="auto-val">${eb.yearBuilt}<span class="auto-badge api">Assessor</span></span></div>`;
          if(eb.beds)h+=`<div class="auto-field"><span class="auto-label">Bedrooms</span><span class="auto-val">${eb.beds}<span class="auto-badge api">Assessor</span></span></div>`;
          if(eb.buildingUse)h+=`<div class="auto-field"><span class="auto-label">Building use</span><span class="auto-val">${esc(String(eb.buildingUse))}<span class="auto-badge api">Assessor</span></span></div>`;
        }
        // Water/sewer infrastructure check row
        if(ST.epcInfraChecking){
          h+=`<div class="auto-field"><span class="auto-label">Water &amp; sewer</span><span class="auto-val"><span class="spinner"></span> Checking infrastructure…</span></div>`;
        } else if(ST.epcInfraStatus==="district"){
          h+=`<div class="auto-field"><span class="auto-label">Water &amp; sewer</span><span class="auto-val" style="color:#4ADE80;">&#10003; District-served — ${esc(ST.epcInfraDistrict)}<span class="auto-badge api">API</span></span></div>`;
        } else if(ST.epcInfraStatus==="well-septic"){
          h+=`<div class="auto-field"><span class="auto-label">Water &amp; sewer</span><span class="auto-val" style="color:#FBBF24;">&#9888; Private well &amp; septic — water/wastewater capacity limits apply<span class="auto-badge api">API</span></span></div>`;
        } else if(ST.epcInfraStatus==="unknown"){
          h+=`<div class="auto-field"><span class="auto-label">Water &amp; sewer</span><span class="auto-val" style="color:#9B9BA7;">Unknown — ${esc(ST.epcInfraDistrict||"confirm with El Paso County Assessor")}<span class="auto-badge api">API</span></span></div>`;
        }
        // CDPHE licensed facilities within 1 mile
        if(ST.epcAutoFacilities.length>0){
          h+=`<div class="auto-field"><span class="auto-label">Licensed facilities within 1 mi</span><span class="auto-val">${ST.epcAutoFacilities.length}<span class="auto-badge api">CDPHE</span></span></div>`;
          if(ST.epcAutoNearestFacName)h+=`<div class="auto-field"><span class="auto-label">Nearest licensed facility</span><span class="auto-val">${esc(ST.epcAutoNearestFacName)} — ${ST.epcAutoNearestFacDist.toLocaleString()} ft<span class="auto-badge api">CDPHE</span></span></div>`;
        } else {
          h+=`<div class="auto-field"><span class="auto-label">Licensed facilities within 1 mi</span><span class="auto-val">None found<span class="auto-badge api">CDPHE</span></span></div>`;
        }
        h+=`</div></div>`;
        h+=`<details class="override-row"><summary>Override auto-populated values</summary><div class="override-grid">`;
        h+=`<div class="override-item"><label>Zone district</label><select id="ov-zone" onchange="ST.gisOverrides.zone=this.value"><option value="">— Use API value —</option>`;
        for(const[gn,gd2] of Object.entries(EPC_ZG)){h+=`<optgroup label="${gn}">`;gd2.list.forEach(z=>{h+=`<option value="${z}"${ST.gisOverrides.zone===z?" selected":""}>${z}</option>`});h+=`</optgroup>`}
        h+=`</select></div>`;
        h+=`<div class="override-item"><label>Lot size (sf)</label><input type="number" id="ov-lot" value="${ST.gisOverrides.lotSize||""}" placeholder="${gd.autoLot||"Enter value"}" onchange="ST.gisOverrides.lotSize=this.value"></div>`;
        h+=`</div></details>`;
        h+=`<div class="data-caveats">Zone from EPC ZoningAreas layer; lot size from Parcels layer (Shape.STArea in CO State Plane ft²); jurisdiction from IncorporatedCities layer. CDPHE layer shows state-licensed facilities only — the 500 ft separation rule (§ 5.2.17(A)) measures to group homes, family care homes, and child care centers, not all of which appear in CDPHE data. Verify with PCD.</div>`;
        h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="epcGisApply()">Accept and continue</button></div>`;
      }
      APP.innerHTML=h;
      const addrInput=document.getElementById("epc-addr");
      if(addrInput){if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped")addrInput.focus();addrInput.addEventListener("keydown",e=>{if(e.key==="Enter")epcGisStart()})}
      return;
    }
    else if(page.id==="epcZone"){
      const autoSrc=ST.gisPhase==="done"&&ST.gisAutoZone&&EPC_ZL.includes(f.zone||"")&&!ST.gisOverrides.zone;
      h+=`<p class="q-title">Zone district</p><p class="q-sub">`;
      if(autoSrc)h+=`Auto-populated from EPC zoning layer. Confirm or change.`;else h+=`Select the zone district for this property.`;
      h+=`</p><select class="zs" aria-label="Select El Paso County zone district" onchange="ST.form.zone=this.value||null;ST.pg=${pg};render()"><option value="">— Select —</option>`;
      for(const[gn,gd] of Object.entries(EPC_ZG)){h+=`<optgroup label="${gn}">`;gd.list.forEach(z=>{h+=`<option value="${z}" ${f.zone===z?"selected":""}>${z}</option>`});h+=`</optgroup>`}
      h+=`</select>`;
      if(autoSrc)h+=`<div class="field-help" style="color:#4ADE80;">Source: EPC ZoningAreas layer <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      else h+=`<a class="gis-link" href="${EPC_ZMAP}" target="_blank" rel="noopener">Open El Paso County zoning map &#8599;</a>`;
      h+=`<div class="btn-row">${bk}${f.zone?nx:""}</div>`;
    }
    else if(page.id==="epcPUD"){
      h+=`<div style="background:#1C1C2A;border:1px solid #2A2A3A;border-radius:10px;padding:1.25rem;">`;
      h+=`<p style="font-size:16px;font-weight:500;color:#FBBF24;margin:0 0 6px;">PUD District — Use Table Not Applicable</p>`;
      h+=`<p style="font-size:13px;color:#9B9BA7;margin:0 0 10px;">Uses are governed by the approved PUD development plan and development guide (§ 3.2.5(F)(2)), not Table 5-1. Variance of use is <strong>not available</strong> in PUD districts (§ 5.3.3(B)(1)).</p>`;
      h+=`<p style="font-size:12px;color:#6B6B78;margin:0;">Contact El Paso County PCD to obtain the PUD plan for this property.</p></div>`;
      h+=`<div class="btn-row"><button class="btn-secondary" onclick="ST.form.zone=null;ST.pg=1;render()">Select different zone</button></div>`;
    }
    else if(page.id==="allNP"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.5rem;"><p style="font-size:18px;font-weight:600;color:#F09595;margin:0 0 8px;">&#9940; Analysis Stopped — Absolute Prohibition</p><p style="font-size:14px;color:#D87070;margin:0 0 12px;">No behavioral health or residential care uses are permitted in the <strong>${esc(f.zone)}</strong> zone district.</p><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">The intended use is prohibited under the applicable zoning rules. No viable pathway exists in this zone, and continuing the analysis is unnecessary because this result is dispositive.</p><p style="font-size:12px;color:#6B6B78;margin:0;">To proceed, consider: (1) a different property in a permissive zone, or (2) a Special Use application (if available for this use type).</p></div><div class="btn-row"><button class="btn-primary" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()">New Analysis</button><button class="btn-secondary" onclick="ST.form.zone=null;ST.pg=1;render()">Select different zone</button></div>`}
    else if(page.id==="licensing"){h+=`<p class="q-title">Licensing and certification</p><p class="q-sub">Can the operator obtain all required state licensing or certification?</p><div class="radio-row">${r3("licensing",f.licensing)}</div><div class="info-box">State licensing is required for mental illness and DD group homes (C.R.S. § 30-28-115). CARR certification is voluntary for recovery residences. The PCD Director memo (SP-05) does not waive state licensing requirements.</div><div class="btn-row">${bk}${f.licensing!==null?nx:""}</div>`}
    else if(page.id==="correctional"){h+=`<p class="q-title">Correctional supervision</p><p class="q-sub">Will the facility serve persons on probation or parole?</p><div class="radio-row">${r2("correctional",f.correctional)}</div><div class="field-help">Affects Half-Way House pathway eligibility and mental illness group home exclusion rules.</div><div class="btn-row">${bk}${f.correctional!==null?nx:""}</div>`}
    else if(page.id==="epcSexOffender"){h+=`<p class="q-title">Sex offender population</p><p class="q-sub">Will the facility include any person required to register as a sex offender (C.R.S. § 18-3-412.5)?</p><div class="radio-row">${r3("epcSexOffender",f.epcSexOffender)}</div><div class="field-help">Group homes may not include registered sex offenders unless related by blood, marriage, adoption, or in foster care (§ 5.2.17(C)(2)).</div><div class="btn-row">${bk}${f.epcSexOffender!==null?nx:""}</div>`}
    else if(page.id==="op24hr"){h+=`<p class="q-title">24-hour operation</p><p class="q-sub">Will the facility operate 24 hours per day?</p><div class="radio-row">${r2("op24hr",f.op24hr)}</div><div class="info-box">The SP-05 enforcement policy suspension applies to group homes providing <strong>24-hour care or permanent living</strong>. If the operation is not 24-hour, the code-text rules may apply even under SP-05.</div><div class="btn-row">${bk}${f.op24hr!==null?nx:""}</div>`}
    else if(page.id==="overnight"){h+=`<p class="q-title">Overnight stays</p><p class="q-sub">Are overnight stays part of the operational model?</p><div class="radio-row">${r2("overnight",f.overnight)}</div><div class="field-help">If "No," the Medical Clinic (outpatient only) pathway may be viable. If "Yes," the engine tests residential and inpatient pathways.</div><div class="btn-row">${bk}${f.overnight!==null?nx:""}</div>`}
    else if(page.id==="epcNonprofit"){h+=`<p class="q-title">Nonprofit operator</p><p class="q-sub">Is the facility operated by a not-for-profit organization?</p><div class="radio-row">${r2("epcNonprofit",f.epcNonprofit)}</div><div class="field-help">Enables the Institution, Philanthropic pathway — a not-for-profit establishment whose purpose is to increase the well-being of mankind (§ 1.15).</div><div class="btn-row">${bk}${f.epcNonprofit!==null?nx:""}</div>`}
    else if(page.id==="epcSeparation"){
      h+=`<p class="q-title">Separation distance</p><p class="q-sub">Distance to the nearest existing group home, family care home, or child care center <strong>along the same road</strong> (lot boundary to lot boundary)?</p>`;
      h+=`<input type="number" id="epc-sep" value="${f.epcSeparation===null?"":f.epcSeparation}" placeholder="e.g. 600" style="width:220px;">`;
      h+=`<div class="field-help">Code text: 500 ft along the same road (§ 5.2.17(A)). Leave blank if unknown.</div>`;
      h+=`<div class="info-box"><strong>SP-05 enforcement policy:</strong> Separation is NOT currently enforced for group homes with 24-hour care or permanent living. This input is for the code-text contingency layer.</div>`;
      h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="var v=document.getElementById('epc-sep').value;ST.form.epcSeparation=v===''?null:Number(v);advance()">Next</button></div>`;
    }
    else if(page.id==="existingRC"){h+=`<p class="q-title">Existing group home or BH use</p><p class="q-sub">Is there an existing group home or behavioral health use on this property?</p><div class="radio-row">${r3("existingRC",f.existingRC)}</div><div class="btn-row">${bk}${f.existingRC!==null?nx:""}</div>`}
    else if(page.id==="maintained"){h+=`<p class="q-title">Continuously maintained?</p><p class="q-sub">Has the existing use been continuously maintained? Abandonment for 1 year means only conforming uses may resume (§ 5.6.3).</p><div class="radio-row">${r3("maintained",f.maintained)}</div><div class="btn-row">${bk}${f.maintained!==null?nx:""}</div>`}
    else if(page.id==="review"){h+=`<p class="q-title">Review and run</p><p class="q-sub">Confirm your inputs, then run the analysis.</p>`;h+=rFacts();h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="go()">Run analysis</button></div>`}
  }

  /* ── MANITOU SPRINGS INTAKE PAGES ─────────────────────────────── */
  if(ST.jurisdiction==="manitou"){
    if(page.id==="manAddress"){
      h+=`<p class="q-title">Property address</p>`;
      h+=`<p class="q-sub">Enter a Manitou Springs address. The tool will query county assessor records, FEMA flood maps, and historic district data to auto-populate zone, building details, and site characteristics.</p>`;
      if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped"){
        h+=`<div class="addr-row"><input type="text" id="manAddrInput" class="addr-input" aria-label="Enter address for Manitou Springs GIS lookup" value="${esc(f.address||"")}" placeholder="e.g. 606 Manitou Ave, 10 Old Man's Trail" /><button class="btn-primary addr-btn" onclick="manGisStart()">Look up</button></div>`;
        if(ST.gisPhase==="error"){h+=`<div class="lookup-error">${esc(ST.gisError)}</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="gisSkip()">Skip — enter manually</button></div>`}
        else if(ST.gisPhase==="skipped"){h+=`<div style="margin-top:12px;font-size:13px;color:#9B9BA7;">Lookup skipped.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="ST.form.address=document.getElementById('manAddrInput')?.value||null;advance()">Next</button></div>`}
        else{h+=`<div class="field-help">Press "Look up" to geocode, or skip to enter all data manually.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.form.address=document.getElementById('manAddrInput')?.value||null;setGisPhase('skipped');advance()">Skip — enter manually</button></div>`}
      }
      else if(ST.gisPhase==="searching"){h+=`<div class="lookup-status"><span class="spinner"></span>Geocoding address\u2026</div>`}
      else if(ST.gisPhase==="disambig"){
        h+=`<div style="margin:12px 0;"><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">Multiple addresses matched. Select the correct one:</p><ul class="disambig-list">`;
        ST.gisAddresses.forEach((a,i)=>{h+=`<li class="disambig-item" onclick="manGisSelect(${i})"><span class="disambig-addr">${esc(a.attributes?a.attributes.Match_addr:a.addr||"Unknown")}</span></li>`});
        h+=`</ul></div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="setGisPhase('idle');render()">Try a different address</button></div>`;
      }
      else if(ST.gisPhase==="querying"){h+=`<div class="lookup-status"><span class="spinner"></span>Looking up property data\u2026</div>`}
      else if(ST.gisPhase==="done"){
        const gd=ST.gisData;
        h+=`<div class="lookup-success"><div class="lk-title">${esc(gd.matchedAddr)}</div><div style="margin-top:8px;">`;
        h+=`<div class="auto-field"><span class="auto-label">Zone district</span><span class="auto-val">${ST.manAutoZone?esc(ST.manAutoZone):"Not found"}${ST.manAutoZone&&MAN_ZL.includes(ST.manAutoZone)?'<span class="auto-badge api">Assessor</span>':'<span class="auto-badge" style="background:#5A4A20;color:#FBBF24;">Manual</span>'}</span></div>`;
        if(ST.manAutoBuildingSqft)h+=`<div class="auto-field"><span class="auto-label">Building sqft (finished)</span><span class="auto-val">${ST.manAutoBuildingSqft.toLocaleString()} sf<span class="auto-badge api">Assessor</span></span></div>`;
        if(ST.manAutoYearBuilt)h+=`<div class="auto-field"><span class="auto-label">Year built</span><span class="auto-val">${ST.manAutoYearBuilt}<span class="auto-badge api">Assessor</span></span></div>`;
        if(ST.manAutoBeds)h+=`<div class="auto-field"><span class="auto-label">Bedrooms</span><span class="auto-val">${ST.manAutoBeds}<span class="auto-badge api">Assessor</span></span></div>`;
        if(ST.manAutoLotSize)h+=`<div class="auto-field"><span class="auto-label">Lot size</span><span class="auto-val">${ST.manAutoLotSize.toLocaleString()} sf<span class="auto-badge api">Assessor</span></span></div>`;
        if(ST.manAutoParcelId)h+=`<div class="auto-field"><span class="auto-label">Parcel</span><span class="auto-val">${ST.manAutoParcelId}${ST.manAutoAssessorLink?' <a href="'+ST.manAutoAssessorLink+'" target="_blank" rel="noopener" style="color:#6EA4E8;font-size:11px;">Assessor &#8599;</a>':''}</span></div>`;
        // FEMA flood hazard
        const hazLabel=ST.manAutoHazard==="yes"?"&#9888; Flood hazard zone":ST.manAutoHazard==="no"?"No flood hazard":"Unknown";
        const hazColor=ST.manAutoHazard==="yes"?"#FBBF24":ST.manAutoHazard==="no"?"#4ADE80":"#9B9BA7";
        h+=`<div class="auto-field"><span class="auto-label">FEMA flood status</span><span class="auto-val" style="color:${hazColor};">${hazLabel}<span class="auto-badge api">FEMA</span></span></div>`;
        // Historic district
        const histLabel=ST.manAutoHistoric==="yes"?"Historic District":ST.manAutoHistoric==="no"?"Not in Historic District":"Unknown";
        const histColor=ST.manAutoHistoric==="yes"?"#FBBF24":ST.manAutoHistoric==="no"?"#4ADE80":"#9B9BA7";
        h+=`<div class="auto-field"><span class="auto-label">Historic district</span><span class="auto-val" style="color:${histColor};">${histLabel}<span class="auto-badge api">NPS</span></span></div>`;
        // Title 15 cap calculation
        if(ST.manAutoBuildingSqft){
          const cap=manTitle15Cap(ST.manAutoBuildingSqft);
          h+=`<div class="auto-field"><span class="auto-label">Title 15 occupancy cap</span><span class="auto-val">${cap} persons (based on ${ST.manAutoBuildingSqft.toLocaleString()} sf)<span class="auto-badge" style="background:#1A3D28;color:#4ADE80;">Calculated</span></span></div>`;
        }
        h+=`</div></div>`;
        h+=`<div class="data-caveats">Zone and building data from El Paso County Assessor via Spatialest. Building sqft is total finished living area (assessor proxy for IBC gross floor area — may differ from actual GFA). Flood data from FEMA NFHL. Historic district from NPS National Register. Verify all values with the City of Manitou Springs Planning Department.</div>`;
        h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="advance()">Accept and continue</button></div>`;
      }
      APP.innerHTML=h;
      const addrInput=document.getElementById("manAddrInput");
      if(addrInput){if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped")addrInput.focus();addrInput.addEventListener("keydown",e=>{if(e.key==="Enter")manGisStart()})}
      return;
    }
    else if(page.id==="manZone"){
      const autoSrc=ST.gisPhase==="done"&&ST.manAutoZone&&MAN_ZL.includes(f.zone||"");
      h+=`<p class="q-title">Zone district</p><p class="q-sub">`;
      if(autoSrc)h+=`Auto-populated from assessor records. Confirm or change.`;else h+=`Select the zone district for this property.`;
      h+=`</p><select class="zs" aria-label="Select Manitou Springs zone district" onchange="ST.form.zone=this.value||null;ST.pg=${pg};render()"><option value="">— Select —</option>`;
      for(const[gn,gd] of Object.entries(MAN_ZG)){h+=`<optgroup label="${gn}">`;gd.list.forEach(z=>{h+=`<option value="${z}" ${f.zone===z?"selected":""}>${z}</option>`});h+=`</optgroup>`}
      h+=`</select>`;
      if(autoSrc)h+=`<div class="field-help" style="color:#4ADE80;">Source: El Paso County Assessor (Spatialest) <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      else h+=`<a class="gis-link" href="${MAN_ZMAP}" target="_blank" rel="noopener">Open Manitou Springs zoning map &#8599;</a>`;
      h+=`<div class="btn-row">${bk}${f.zone?nx:""}</div>`;
    }
    else if(page.id==="allNP"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.5rem;"><p style="font-size:18px;font-weight:600;color:#F09595;margin:0 0 8px;">&#9940; Analysis Stopped — Absolute Prohibition</p><p style="font-size:14px;color:#D87070;margin:0 0 12px;">No behavioral health or residential care uses are permitted in the <strong>${esc(f.zone)}</strong> zone district. Open Space, Parks, and Public Facilities zones do not allow residential or institutional uses.</p><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">The intended use is prohibited under the applicable zoning rules. No viable pathway exists in this zone, and continuing the analysis is unnecessary because this result is dispositive.</p><p style="font-size:12px;color:#6B6B78;margin:0;">To proceed, consider: (1) a different property in a permissive zone, or (2) a rezoning application ($1,090).</p></div><div class="btn-row"><button class="btn-primary" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()">New Analysis</button><button class="btn-secondary" onclick="ST.form.zone=null;ST.pg=1;render()">Select different zone</button></div>`}
    else if(page.id==="manTreatment"){
      h+=`<p class="q-title">On-site treatment</p><p class="q-sub">Will the facility provide on-site medical treatment for substance use disorders (SUD)?</p>`;
      h+=`<div class="radio-row">${r3("manOnSiteTreatment",f.manOnSiteTreatment)}</div>`;
      h+=`<div class="field-help">On-site treatment (e.g. MAT, detox protocols) disqualifies the Group Home — Small classification, routing to larger or institutional pathways. (G-01)</div>`;
      h+=`<div class="btn-row">${bk}${f.manOnSiteTreatment!==null?nx:""}</div>`;
    }
    else if(page.id==="manPopulation"){
      h+=`<p class="q-title">Population type</p><p class="q-sub">Select the primary population served.</p>`;
      h+=`<div class="radio-row">`;
      ["behavioral","elderly","disabled","mixed"].forEach(v=>{
        const label=v==="behavioral"?"Behavioral health / SUD":v==="elderly"?"Elderly (age 60+)":v==="disabled"?"Persons with disabilities":"Mixed / other";
        h+=`<button class="radio-btn ${f.manPopulationType===v?"sel":""}" onclick="ST.form.manPopulationType='${v}';render()">${label}</button>`;
      });
      h+=`</div>`;
      h+=`<div class="field-help">Elderly population enables CCRC pathway. FHA-protected populations (elderly, disabled) have reasonable accommodation rights that may relax certain land-use restrictions. (G-02)</div>`;
      h+=`<div class="btn-row">${bk}${f.manPopulationType?nx:""}</div>`;
    }
    else if(page.id==="manOperations"){
      h+=`<p class="q-title">Operational characteristics</p><p class="q-sub">These details determine which pathways are available.</p>`;
      h+=`<div style="margin-bottom:14px;"><label class="field-label">Overnight beds?</label><div class="radio-row">${r2("manOvernightBeds",f.manOvernightBeds)}</div></div>`;
      h+=`<div style="margin-bottom:14px;"><label class="field-label">Provides medical care?</label><div class="radio-row">${r2("manProvidesMedCare",f.manProvidesMedCare)}</div></div>`;
      h+=`<div style="margin-bottom:14px;"><label class="field-label">Provides personal care (bathing, dressing, ADLs)?</label><div class="radio-row">${r2("manProvidesPersonalCare",f.manProvidesPersonalCare)}</div></div>`;
      h+=`<div style="margin-bottom:14px;"><label class="field-label">Full-time nursing staff?</label><div class="radio-row">${r2("manFullTimeNursing",f.manFullTimeNursing)}</div></div>`;
      h+=`<div class="field-help">Medical care gates the Medical Care Facility pathway. Personal care gates the Boarding House pathway (excluded if personal care provided). Full-time nursing is required for LTC pathway.</div>`;
      const allAnswered=f.manOvernightBeds!==null&&f.manProvidesMedCare!==null&&f.manProvidesPersonalCare!==null&&f.manFullTimeNursing!==null;
      h+=`<div class="btn-row">${bk}${allAnswered?nx:""}</div>`;
    }
    else if(page.id==="manConstruction"){
      h+=`<p class="q-title">Construction scope</p><p class="q-sub">Select the scope of physical work planned for this property. This determines whether a Development Plan is required and which review level applies. (§ 18.06.4.12–13)</p>`;
      h+=`<div class="radio-row">`;
      ["none","minor","major"].forEach(v=>{
        const label=v==="none"?"None — change of use only; no exterior construction, additions, or site work"
          :v==="minor"?"Minor — additions up to 1,000 sf; parking or landscaping changes; fa\u00e7ade modifications; interior renovation with exterior impact (§ 18.06.4.12)"
          :"Major — new building construction; additions over 1,000 sf; site layout changes affecting drainage or access; or new subdivision (§ 18.06.4.13)";
        h+=`<button class="radio-btn ${f.manConstructionScope===v?"sel":""}" onclick="ST.form.manConstructionScope='${v}';render()">${label}</button>`;
      });
      h+=`</div>`;
      h+=`<div class="field-help"><strong>None:</strong> No development plan required. <strong>Minor:</strong> Minor Development Plan — Planning Commission review. <strong>Major:</strong> Major Development Plan — Planning Commission + City Council hearings. The 1,000 sf threshold is the boundary between minor and major.</div>`;
      h+=`<div class="btn-row">${bk}${f.manConstructionScope?nx:""}</div>`;
    }
    else if(page.id==="existingRC"){h+=`<p class="q-title">Existing group home or BH use</p><p class="q-sub">Is there an existing group home, boarding house, or behavioral health use on this property?</p><div class="radio-row">${r3("existingRC",f.existingRC)}</div><div class="btn-row">${bk}${f.existingRC!==null?nx:""}</div>`}
    else if(page.id==="maintained"){h+=`<p class="q-title">Continuously maintained?</p><p class="q-sub">Has the existing use been continuously maintained? Discontinuance for 12+ months terminates nonconforming status. (§ 18.40)</p><div class="radio-row">${r3("maintained",f.maintained)}</div><div class="btn-row">${bk}${f.maintained!==null?nx:""}</div>`}
    else if(page.id==="manPreexisting"){
      h+=`<p class="q-title">Nonconforming use details</p><p class="q-sub">These determine the nonconforming use pathway analysis.</p>`;
      h+=`<div style="margin-bottom:14px;"><label class="field-label">Months since use discontinued (if any)</label><input type="number" id="man-months" value="${f.manMonthsDiscontinued===null?"":f.manMonthsDiscontinued}" placeholder="0 if currently operating" min="0" style="width:180px;"></div>`;
      h+=`<div style="margin-bottom:14px;"><label class="field-label">Proposing expansion of use?</label><div class="radio-row">${r2("manProposedExpansion",f.manProposedExpansion)}</div></div>`;
      h+=`<div class="field-help">G-03: Discontinuance for 12+ months terminates nonconforming status. G-04: Expansion of a nonconforming use is prohibited.</div>`;
      h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="var m=document.getElementById('man-months').value;ST.form.manMonthsDiscontinued=m===''?null:Number(m);advance()">Next</button></div>`;
    }
    else if(page.id==="review"){h+=`<p class="q-title">Review and run</p><p class="q-sub">Confirm your inputs, then run the analysis.</p>`;h+=rFacts();h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="go()">Run analysis</button></div>`}
  }

  APP.innerHTML=h;
  if(pg!==_prevPg){_prevPg=pg;requestAnimationFrame(()=>{const el=APP.querySelector(".q-title, .addr-input, select.zs");if(el){el.setAttribute("tabindex","-1");el.focus({preventScroll:true})}})}
}

/* ── Review Facts Helper ──────────────────────────────────────── */
function rFacts(){
  const f=ST.form;
  const jurName=ST.jurisdiction==="denver"?"Denver":ST.jurisdiction==="cos"?"Colorado Springs":ST.jurisdiction==="manitou"?"Manitou Springs":"El Paso County";
  const items=[["Jurisdiction",jurName],["Address",esc(f.address)||"\u2014"],["Zone",f.zone||"\u2014"]];
  if(f.lotSize!=null)items.push(["Lot size",f.lotSize.toLocaleString()+" sf"]);
  items.push(["Licensing",f.licensing||"\u2014"]);
  if(ST.jurisdiction==="denver"){
    items.push(["Correctional",f.correctional||"\u2014"],["24-hour",f.op24hr||"\u2014"],["Overnight",f.overnight||"\u2014"]);
    if(f.religious!=null)items.push(["Religious assembly",f.religious]);
    items.push(["Existing RC",f.existingRC||"\u2014"]);
    if(f.existingRC==="yes")items.push(["Maintained",f.maintained||"\u2014"]);
    if(f.rcWithin1mi!=null)items.push(["RC within 1 mi",String(f.rcWithin1mi)]);
    if(f.rcType34within1mi!=null)items.push(["Type 3/4 within 1 mi",String(f.rcType34within1mi)]);
    if(f.distType34!=null)items.push(["Dist. to nearest 3/4",f.distType34.toLocaleString()+" ft"]);
  } else if(ST.jurisdiction==="epc"){
    items.push(["Correctional",f.correctional||"\u2014"]);
    items.push(["Sex offender",f.epcSexOffender||"\u2014"]);
    items.push(["24-hour",f.op24hr||"\u2014"]);
    items.push(["Overnight",f.overnight||"\u2014"]);
    if(f.epcNonprofit!=null)items.push(["Nonprofit",f.epcNonprofit]);
    if(f.epcSeparation!=null)items.push(["Separation (along road)",f.epcSeparation.toLocaleString()+" ft"]);
    if(f.epcCadO==="cado")items.push(["CAD-O overlay","Yes — sub-zone TBD"]);
    items.push(["Existing use",f.existingRC||"\u2014"]);
    if(f.existingRC==="yes")items.push(["Maintained",f.maintained||"\u2014"]);
    // Water/sewer infrastructure
    const infraVal=ST.epcInfraStatus==="district"?"District-served"+(ST.epcInfraDistrict?" — "+ST.epcInfraDistrict:""):ST.epcInfraStatus==="well-septic"?"Private well & septic":ST.epcInfraStatus==="unknown"?"Unknown — verify with Assessor":"Not checked";
    items.push(["Water & sewer",infraVal]);
  } else if(ST.jurisdiction==="manitou"){
    if(f.manDwellingUnitSqft!=null){items.push(["Building sqft",f.manDwellingUnitSqft.toLocaleString()+" sf"]);const cap=manTitle15Cap(f.manDwellingUnitSqft);if(cap!==null)items.push(["Title 15 cap",cap+" persons"])}
    if(ST.manAutoYearBuilt)items.push(["Year built",String(ST.manAutoYearBuilt)]);
    if(ST.manAutoBeds)items.push(["Bedrooms",String(ST.manAutoBeds)]);
    items.push(["On-site treatment",f.manOnSiteTreatment||"\u2014"]);
    items.push(["Population",f.manPopulationType||"\u2014"]);
    items.push(["Overnight beds",f.manOvernightBeds||"\u2014"]);
    items.push(["Medical care",f.manProvidesMedCare||"\u2014"]);
    items.push(["Personal care",f.manProvidesPersonalCare||"\u2014"]);
    items.push(["Full-time nursing",f.manFullTimeNursing||"\u2014"]);
    items.push(["Flood hazard",f.manNaturalHazard==="yes"?"Yes (FEMA)":f.manNaturalHazard==="no"?"No (FEMA)":"Unknown"]);
    items.push(["Historic district",f.manHistoricDistrict==="yes"?"Yes (NPS)":f.manHistoricDistrict==="no"?"No (NPS)":"Unknown"]);
    items.push(["Construction",f.manConstructionScope||"\u2014"]);
    items.push(["Existing use",f.existingRC||"\u2014"]);
    if(f.existingRC==="yes"){
      items.push(["Maintained",f.maintained||"\u2014"]);
      if(f.manMonthsDiscontinued!=null)items.push(["Months discontinued",String(f.manMonthsDiscontinued)]);
      items.push(["Proposed expansion",f.manProposedExpansion||"\u2014"]);
    }
  } else {
    items.push(["Correctional",f.correctional||"\u2014"],["FHA-protected",f.fhaProtected||"\u2014"],["24-hour",f.op24hr||"\u2014"]);
    if(f.targetOver60==="yes")items.push(["Over 60 population","Yes"]);
    if(f.targetTerminal==="yes")items.push(["Terminal/hospice","Yes"]);
    if(f.tempShelter==="yes")items.push(["Temporary shelter","Yes"]);
    items.push(["Construction",f.constructionType||"\u2014"]);
    if(f.distGLRDetox!=null)items.push(["Dist. to GLR/Detox",f.distGLRDetox.toLocaleString()+" ft"]);
    if(f.nearestAL==="yes")items.push(["Nearest is AL","Yes"]);
    items.push(["Existing use",f.existingRC||"\u2014"]);
    if(f.existingRC==="yes")items.push(["Maintained",f.maintained||"\u2014"]);
    if(f.cosOverlays?.length)items.push(["Overlays",f.cosOverlays.join(", ")]);
  }
  items.push(["Engine verified",ENGINE_VERIFIED[ST.jurisdiction]||"\u2014"]);
  let h=`<div class="facts-grid">`;items.forEach(([l,v])=>{h+=`<div class="fact-item"><div class="fact-label">${l}</div><div class="fact-val">${v}</div></div>`});return h+`</div>`;
}

/* ── Go (run engine with validation) ──────────────────────────── */
function go(){
  const errors=validateFormBeforeEngine();
  if(errors.length){
    alert("Please fix the following:\n\n"+errors.join("\n"));
    return;
  }
  if(ST.jurisdiction==="denver")ST.results=runEngine(ST.form);
  else if(ST.jurisdiction==="epc")ST.results=runEPCEngine(ST.form);
  else if(ST.jurisdiction==="manitou")ST.results=runManitouEngine(ST.form);
  else ST.results=runCOSEngine(ST.form);
  ST.activeTab="dashboard";ST.expanded={};ST.checklistState={};
  history.replaceState(null,"",stateToHash());
  render();
}

/* ═══════════════════════════════════════════════════════════════════
   RESULTS RENDERER (shared — handles all jurisdictions)
   ═══════════════════════════════════════════════════════════════════ */
function renderRes(){
  const R=ST.results;if(R.error){APP.innerHTML=`<div style="padding:1rem 0;"><div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.5rem;"><p style="font-size:18px;font-weight:600;color:#F09595;margin:0 0 8px;">&#9940; Analysis Stopped — Absolute Prohibition</p><p style="font-size:14px;color:#D87070;margin:0 0 12px;">${esc(R.error)}</p><p style="font-size:13px;color:#9B9BA7;margin:0;">The intended use is prohibited under the applicable rules. No viable pathway exists, and continuing the analysis is unnecessary because this result is dispositive.</p></div><div class="btn-row" style="margin-top:16px;"><button class="btn-primary" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()">New Analysis</button><button class="btn-secondary" onclick="ST.results=null;ST.pg=0;render()">Back to inputs</button></div></div>`;return}
  const vi=R.results.filter(r=>r.v==="yes"||r.v==="conditional"),nv=R.results.filter(r=>r.v==="no");
  let best=0;vi.forEach(r=>{const n=r.mg===999?9999:(r.mg||0);if(n>best)best=n});
  const bL=best===9999?"No UDC cap":best===0?"\u2014":String(best);
  const viCo=vi; // vi already includes conditional (merged per Bug 7)
  const allC=[];viCo.forEach(r=>r.cav.forEach(c=>{if(!allC.find(x=>x.msg===c.msg))allC.push({...c,paths:viCo.filter(r2=>r2.cav.find(c2=>c2.msg===c.msg)).map(r2=>r2.nm)})}));
  const blk=allC.filter(c=>c.blocking).length;
  const jurLabel=ST.jurisdiction==="denver"?"Denver":ST.jurisdiction==="cos"?"Colorado Springs":ST.jurisdiction==="manitou"?"Manitou Springs":"El Paso County";
  let h=`<div class="dash-header"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;"><div><p class="dash-title">${esc(ST.form.address)||"Analysis"}</p><p class="dash-sub">${R.zone}${ST.form.lotSize?" · "+ST.form.lotSize.toLocaleString()+" sf":""} · ${jurLabel}</p></div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn-secondary" onclick="shareURL()" style="padding:6px 12px;font-size:12px;">Share</button><button class="btn-secondary" onclick="doSave()" style="padding:6px 12px;font-size:12px;">Save</button><button class="btn-secondary" onclick="window.print()" style="padding:6px 12px;font-size:12px;">Print / PDF</button><button class="btn-secondary" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()" style="padding:6px 12px;font-size:12px;">New analysis</button></div></div></div>`;
  // Change monitoring banner
  const _vd=ENGINE_VERIFIED[ST.jurisdiction];if(_vd){const _ds=Math.floor((Date.now()-new Date(_vd).getTime())/864e5);if(_ds>90)h+=`<div style="background:#2E2410;border:1px solid #5A4A20;border-radius:8px;padding:10px 14px;margin-bottom:1rem;font-size:12px;color:#FBBF24;">&#9888; Engine rules last verified ${_ds} days ago (${_vd}). Code changes may have occurred. Review before relying on results.</div>`}
  if(R.p2==="fail"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;"><p style="font-size:14px;font-weight:500;color:#F09595;margin:0 0 4px;">All pathways blocked</p><p style="font-size:13px;color:#D87070;margin:0;">${R.gS.map(s=>esc(s.msg)+" "+citeLink(s.cite)).join("; ")}</p></div><div class="btn-row" style="margin-bottom:1.5rem;"><button class="btn-primary" onclick="resetState();ST.pg=0;history.replaceState(null,'',location.pathname);render()">New Analysis</button><button class="btn-secondary" onclick="ST.results=null;ST.pg=0;render()">Back to inputs</button></div>`;h+=rFacts();APP.innerHTML=h;return}
  h+=`<div class="summary-row"><div class="stat-card"><p class="stat-label">Viable pathways</p><p class="stat-val green">${vi.length}</p></div><div class="stat-card"><p class="stat-label">Highest viable count</p><p class="stat-val">${bL}</p></div><div class="stat-card"><p class="stat-label">Open caveats</p><p class="stat-val ${blk>0?"amber":""}">${allC.length}${blk?" ("+blk+" blocking)":""}</p></div></div>`;
  h+=`<div class="tab-row" role="tablist" aria-label="Results tabs"><button class="tab-btn ${ST.activeTab==="dashboard"?"active":""}" role="tab" aria-selected="${ST.activeTab==="dashboard"}" aria-controls="panel-pathways" onclick="ST.activeTab='dashboard';render()">Pathways</button><button class="tab-btn ${ST.activeTab==="caveats"?"active":""}" role="tab" aria-selected="${ST.activeTab==="caveats"}" aria-controls="panel-caveats" onclick="ST.activeTab='caveats';render()">Caveats (${allC.length})</button><button class="tab-btn ${ST.activeTab==="costs"?"active":""}" role="tab" aria-selected="${ST.activeTab==="costs"}" aria-controls="panel-costs" onclick="ST.activeTab='costs';render()">Costs</button><button class="tab-btn ${ST.activeTab==="checklist"?"active":""}" role="tab" aria-selected="${ST.activeTab==="checklist"}" aria-controls="panel-checklist" onclick="ST.activeTab='checklist';render()">Checklist</button><button class="tab-btn ${ST.activeTab==="facts"?"active":""}" role="tab" aria-selected="${ST.activeTab==="facts"}" aria-controls="panel-facts" onclick="ST.activeTab='facts';render()">Site facts</button></div>`;
  // All tab panels always rendered; CSS hides inactive on screen, shows all for print
  h+=`<div class="tab-panel${ST.activeTab==="dashboard"?" active":""}" data-tab="Pathways" role="tabpanel" id="panel-pathways">`;
  // EPC: show infrastructure card above pathways
  if(ST.jurisdiction==="epc"&&ST.epcInfraStatus){
    const isDistrict=ST.epcInfraStatus==="district";
    const isWell=ST.epcInfraStatus==="well-septic";
    const borderColor=isDistrict?"#1A3D28":isWell?"#5A4A20":"#2A2A3A";
    const bgColor=isDistrict?"#0E1E14":isWell?"#2E2410":"#151520";
    const iconColor=isDistrict?"#4ADE80":isWell?"#FBBF24":"#9B9BA7";
    const icon=isDistrict?"&#10003;":isWell?"&#9888;":"&#8263;";
    const label=isDistrict?"District Water &amp; Sewer":isWell?"Private Well &amp; Septic":"Water &amp; Sewer: Unknown";
    const detail=isDistrict?(ST.epcInfraDistrict||"District-served"):isWell?"Property is on private well and septic system. Infrastructure capacity constraints apply — see water/wastewater analysis.":"Could not auto-determine infrastructure type. Verify with El Paso County Assessor or call the property's utility district directly.";
    h+=`<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:10px;padding:12px 16px;margin-bottom:1.25rem;display:flex;align-items:flex-start;gap:10px;">`;
    h+=`<span style="font-size:16px;color:${iconColor};flex-shrink:0;margin-top:1px;">${icon}</span>`;
    h+=`<div><div style="font-size:13px;font-weight:500;color:${iconColor};margin-bottom:2px;">${label}</div>`;
    h+=`<div style="font-size:12px;color:#9B9BA7;line-height:1.5;">${esc(detail)}</div>`;
    if(isWell)h+=`<div style="font-size:11px;color:#555568;margin-top:4px;">Water supply and OWTS capacity may limit max bed count independent of zoning approval. Run water/wastewater analysis for this address.</div>`;
    h+=`</div></div>`;
  }
  if(!vi.length&&!nv.length)h+=`<p style="font-size:13px;color:#9B9BA7;padding:1rem 0;">No pathways returned by engine.</p>`;
  else{if(vi.length)h+=`<p class="section-label">Viable</p>`+vi.map(pwC).join("");if(nv.length)h+=`<p class="section-label">Not Viable</p>`+nv.map(pwC).join("")}
  h+=`</div>`;
  h+=`<div class="tab-panel${ST.activeTab==="caveats"?" active":""}" data-tab="Caveats" role="tabpanel" id="panel-caveats">`;
  if(!allC.length)h+=`<p style="font-size:13px;color:#9B9BA7;padding:1rem 0;">No open caveats on viable pathways.</p>`;else allC.forEach(c=>{h+=`<div class="caveat-card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span class="stop-pill ${c.blocking?"stop-hard":"stop-caveat"}">${c.blocking?"Blocking":"Info"}</span>${citeLink(c.cite)}</div><p class="caveat-title">${esc(c.msg)}</p><p class="caveat-meta"><strong>Affects:</strong> ${c.paths.map(esc).join(", ")}</p>${c.resolve?`<p class="caveat-meta"><strong>Resolve:</strong> ${esc(c.resolve)}</p>`:""}</div>`});
  h+=`</div>`;
  h+=`<div class="tab-panel${ST.activeTab==="costs"?" active":""}" data-tab="Costs" role="tabpanel" id="panel-costs">`;
  h+=`<p class="section-label">Cost Estimates by Viable Pathway</p>`;
  if(!viCo.length)h+=`<p style="font-size:13px;color:#9B9BA7;padding:1rem 0;">No viable or conditional pathways.</p>`;
  else{
    viCo.forEach(r=>{
      h+=`<div style="background:#151520;border:1px solid #2A2A3A;border-radius:10px;padding:14px 16px;margin-bottom:10px;">`;
      h+=`<div style="font-size:14px;font-weight:500;color:#E8E8EC;margin-bottom:8px;">${esc(r.nm)}</div>`;
      h+=`<table style="width:100%;border-collapse:collapse;font-size:12px;">`;
      const fee=r.rsk.fee;
      if(fee){
        h+=`<tr><td style="padding:4px 0;color:#9B9BA7;">Application fee</td><td style="padding:4px 0;text-align:right;color:#E8E8EC;">${fee}</td></tr>`;
      }
      const tl=r.rsk.timeline;
      if(tl){
        h+=`<tr><td style="padding:4px 0;color:#9B9BA7;">Estimated timeline</td><td style="padding:4px 0;text-align:right;color:#E8E8EC;">${tl}</td></tr>`;
      }
      h+=`</table></div>`;
    });
    h+=`<p class="section-label" style="margin-top:16px;">Ancillary Costs (may apply)</p>`;
    h+=`<table style="width:100%;border-collapse:collapse;font-size:12px;">`;
    Object.values(ANCILLARY_COSTS).forEach(c=>{
      h+=`<tr style="border-bottom:1px solid #1E1E2E;"><td style="padding:8px 0;color:#9B9BA7;">${c.label}</td><td style="padding:8px 0;text-align:right;color:#E8E8EC;white-space:nowrap;">$${c.min.toLocaleString()} – $${c.max.toLocaleString()}</td></tr>`;
    });
    h+=`</table>`;
    h+=`<div style="margin-top:12px;font-size:11px;color:#555568;line-height:1.5;">Estimates are approximate ranges based on published fee schedules and typical professional service costs. Actual costs vary by project scope, site conditions, and jurisdiction requirements. Always confirm current fees with the applicable planning department.</div>`;
  }
  h+=`</div>`;
  h+=`<div class="tab-panel${ST.activeTab==="checklist"?" active":""}" data-tab="Checklist" role="tabpanel" id="panel-checklist">`;
  h+=`<p class="section-label">Application Checklist by Viable Pathway</p>`;
  if(!viCo.length)h+=`<p style="font-size:13px;color:#9B9BA7;padding:1rem 0;">No viable or conditional pathways.</p>`;
  else{
    viCo.forEach(r=>{
      const docs=getPathwayDocs(r);
      h+=`<div style="background:#151520;border:1px solid #2A2A3A;border-radius:10px;padding:14px 16px;margin-bottom:10px;">`;
      h+=`<div style="font-size:14px;font-weight:500;color:#E8E8EC;margin-bottom:8px;">${esc(r.nm)} <span style="font-size:11px;color:#6B6B78;">(${r.proc})</span></div>`;
      docs.forEach((d,i)=>{
        const ck=ST.checklistState[r.id+"_"+i]||false;
        h+=`<label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;padding:4px 0;cursor:pointer;color:${ck?"#555568":"#E8E8EC"};${ck?"text-decoration:line-through":""};">`;
        h+=`<input type="checkbox" ${ck?"checked":""} onchange="ST.checklistState['${r.id}_${i}']=this.checked;render()" style="margin-top:2px;">`;
        h+=`<span>${d.name}${d.required?"":" <em style='color:#6B6B78;'>(if applicable)</em>"}</span></label>`;
      });
      h+=`</div>`;
    });
    h+=`<div style="margin-top:12px;font-size:11px;color:#555568;line-height:1.5;">Checklist items are based on standard submittal requirements. Specific jurisdictions may require additional documents. Confirm with the applicable planning department before filing.</div>`;
  }
  h+=`</div>`;
  h+=`<div class="tab-panel${ST.activeTab==="facts"?" active":""}" data-tab="Site Facts" role="tabpanel" id="panel-facts">`;
  h+=rFacts();
  h+=`</div>`;
  APP.innerHTML=h;document.querySelectorAll(".pw-card-head").forEach(el=>{el.onclick=()=>{const id=el.getAttribute("data-id");ST.expanded[id]=!ST.expanded[id];el.nextElementSibling.classList.toggle("open");el.querySelector(".pw-arrow").classList.toggle("open")}});
}

function pwC(r){
  const bc=r.v==="no"?"badge-no":r.v==="conditional"?"badge-cond":"badge-yes",bt=r.v==="no"?"Not Viable":r.v==="conditional"?"Conditional":"Viable";
  let ct="";if(r.v!=="no"){if(r.mg===999)ct="no cap";else if(!r.mg)ct="TBD";else ct="up to "+r.mg+" residents"}
  const isO=ST.expanded[r.id]||false;let d="";
  if(r.v!=="no"){
    d+=`<div class="detail-section"><div class="detail-heading">Why viable</div><p class="detail-text">${esc(r.rat)}</p></div>`;
    if(r.wf.length){d+=`<div class="detail-section"><div class="detail-heading">Workflow</div>`;r.wf.forEach((w,i)=>{d+=`<div class="wf-step"><div class="wf-num">${i+1}</div><div class="wf-text">${esc(w.t)}</div></div>`});d+=`</div>`}
    d+=`<div class="detail-section"><div class="detail-heading">Risk</div><div class="risk-row">`;
    const rl={nimby:"NIMBY",escalation:"Escalation",timeline:"Timeline",discretion:"Discretion",approval:"Approval",clock:"Review clock",fee:"Fee"};
    Object.entries(r.rsk).forEach(([k,v])=>{d+=`<div class="risk-item"><div class="risk-label">${rl[k]||k}</div><div class="risk-val">${esc(v)}</div></div>`});
    d+=`</div></div>`;
    if(r.cav.length){d+=`<div class="detail-section"><div class="detail-heading">Caveats (${r.cav.length})</div>`;r.cav.forEach(c=>{d+=`<div style="margin-bottom:6px;"><span class="stop-pill ${c.blocking?"stop-hard":"stop-caveat"}">${c.blocking?"Blocking":"Info"}</span> <span style="font-size:13px;color:#9B9BA7;">${esc(c.msg)}</span> ${citeLink(c.cite)}</div>`});d+=`</div>`}
    d+=`<div class="detail-section"><div class="detail-heading">Assessment</div><p class="detail-text"><strong>${esc(r.rank)}</strong>${r.proc?" · "+esc(r.proc):""}</p></div>`;
  } else {d+=`<div class="detail-section"><div class="detail-heading">Why not viable</div>`;r.stops.forEach(s=>{d+=`<div style="margin-bottom:6px;"><span class="stop-pill stop-hard">Hard stop</span> <span style="font-size:13px;color:#9B9BA7;">${esc(s.msg)}</span> ${citeLink(s.cite)}</div>`});d+=`</div>`}
  return`<div class="pw-card"><div class="pw-card-head" data-id="${r.id}"><span class="pw-badge ${bc}">${bt}</span><span class="pw-name">${r.nm}</span><span class="pw-count">${ct}</span><span class="pw-arrow ${isO?"open":""}">&#9654;</span></div><div class="pw-detail ${isO?"open":""}">${d}</div></div>`;
}

/* ═══════════════════════════════════════════════════════════════════
   CHECKLIST DOCUMENTS (F9)
   ═══════════════════════════════════════════════════════════════════ */
function getPathwayDocs(r){
  const docs=[];const jur=ST.jurisdiction;const proc=r.proc||"";
  // Common to all
  docs.push({name:"Completed application form",required:true});
  if(jur==="denver"){
    docs.push({name:"Zoning permit application",required:true});
    if(proc.includes("ZPCIM")){
      docs.push({name:"Community Information Meeting summary & sign-in sheet",required:true});
      docs.push({name:"CIM notification proof (21-day, 400-ft radius)",required:true});
    }
    docs.push({name:"Site plan / floor plan",required:true});
    docs.push({name:"Copy of state license or certification",required:true});
    docs.push({name:"Operational plan (staffing, hours, population served)",required:true});
    if(ST.form.correctional==="yes")docs.push({name:"DPS referral documentation",required:true});
    if(r.id==="P3"||r.id==="P4")docs.push({name:"Agency referral response documentation (DOTI, DPS, Parks, etc.)",required:false});
    docs.push({name:"Property ownership documentation",required:true});
    docs.push({name:"Proof of insurance",required:false});
  } else if(jur==="cos"){
    if(proc.includes("CUP")){
      docs.push({name:"Conditional Use Permit application ($1,445)",required:true});
      docs.push({name:"Development Plan (if new construction or conversion)",required:proc.includes("Dev Plan")});
      docs.push({name:"Site posting photo documentation",required:true});
      docs.push({name:"Neighbor notification postcards proof",required:true});
    } else {
      docs.push({name:"HSE / GLR administrative application ($175)",required:true});
    }
    docs.push({name:"Vicinity map",required:true});
    docs.push({name:"Site plan with dimensions",required:true});
    docs.push({name:"Written description of proposed use",required:true});
    docs.push({name:"Copy of state license or certification",required:true});
    docs.push({name:"Floor plan showing bed count and common areas",required:true});
    docs.push({name:"Proof of property ownership or lease",required:true});
  } else if(jur==="epc"){
    if(proc.includes("Special Use")){
      docs.push({name:"Special Use application ($6,401)",required:true});
      docs.push({name:"Adjacent owner notification documentation",required:true});
      docs.push({name:"Agency referral response documentation",required:false});
      docs.push({name:"FHAA reasonable accommodation documentation",required:r.id.startsWith("GH")});
    } else {
      docs.push({name:"Group Home Permit application ($192)",required:r.id.startsWith("GH")});
      docs.push({name:"Site Development Plan application ($1,685–$3,955)",required:!r.id.startsWith("GH")});
    }
    docs.push({name:"Residential site plan ($165)",required:r.id.startsWith("GH")});
    if(r.id.startsWith("GH"))docs.push({name:"SP-05 enforcement policy confirmation from PCD",required:false});
    docs.push({name:"Copy of all applicable state licenses",required:true});
    docs.push({name:"Floor plan showing bedrooms and common areas",required:true});
    docs.push({name:"Written description of proposed operations",required:true});
    docs.push({name:"Vicinity / location map",required:true});
    docs.push({name:"Proof of property ownership or lease",required:true});
    docs.push({name:"Fire code compliance documentation",required:false});
    docs.push({name:"Water/wastewater capacity documentation (if well/septic)",required:ST.epcInfraStatus==="well-septic"});
  } else if(jur==="manitou"){
    if(proc.includes("CUP")){
      docs.push({name:"Conditional Use Permit application ($1,090)",required:true});
      docs.push({name:"Public notice: sign on property + mail to owners within 300 ft",required:true});
    }
    if(proc.includes("Major")||proc.includes("MJR")){
      docs.push({name:"Major Development Plan application ($1,200–$1,450 + $1,000 deposit)",required:true});
    } else if(proc.includes("Minor")||proc.includes("MNR")){
      docs.push({name:"Minor Development Plan application ($600–$700 + $950 deposit)",required:true});
    }
    docs.push({name:"Site plan with dimensions",required:true});
    docs.push({name:"Written description of proposed use and operational plan",required:true});
    docs.push({name:"Copy of state license or certification",required:true});
    docs.push({name:"Floor plan showing bed count and common areas",required:true});
    docs.push({name:"Proof of property ownership or lease",required:true});
    docs.push({name:"Business license application",required:true});
    docs.push({name:"Fire code compliance / sprinkler documentation (if > 16 persons)",required:false});
    if(ST.manAutoHistoric==="yes")docs.push({name:"MCAC application for exterior modifications (Title 17)",required:true});
  }
  return docs;
}

/* ═══════════════════════════════════════════════════════════════════
   SAVE ANALYSIS (F5)
   ═══════════════════════════════════════════════════════════════════ */
function doSave(){
  if(!ST.results||ST.results.error)return;
  const R=ST.results;
  const vi=R.results.filter(r=>r.v==="yes"||r.v==="conditional");
  let best=0;vi.forEach(r=>{const n=r.mg===999?9999:(r.mg||0);if(n>best)best=n});
  const allC=[];vi.forEach(r=>r.cav.forEach(c=>{if(!allC.find(x=>x.msg===c.msg))allC.push(c)}));
  const blk=allC.filter(c=>c.blocking).length;
  saveAnalysis({viableCount:vi.length,maxBeds:best,blockerCount:blk});
  const t=document.createElement("div");
  t.textContent="Analysis saved!";
  t.style.cssText="position:fixed;top:16px;right:16px;background:#1A3D28;color:#4ADE80;padding:8px 16px;border-radius:8px;font-size:13px;z-index:9999;";
  document.body.appendChild(t);setTimeout(()=>t.remove(),2000);
}

function renderSavedList(){
  const list=savedAnalyses();
  let h=`<p class="q-title">Saved Analyses</p>`;
  if(!list.length){h+=`<p style="font-size:13px;color:#9B9BA7;">No saved analyses yet. Run an analysis and click "Save" to store it.</p>`;h+=`<div class="btn-row"><button class="btn-secondary" onclick="ST.showSaved=false;render()">Back to analysis</button></div>`;APP.innerHTML=h;return}
  if(!ST.compareIds)ST.compareIds=[];
  const canCompare=ST.compareIds.length>=2&&ST.compareIds.length<=4;
  h+=`<p style="font-size:13px;color:#9B9BA7;margin-bottom:12px;">Select 2\u20134 analyses to compare side by side.</p>`;
  if(canCompare)h+=`<div style="margin-bottom:12px;"><button class="btn-primary" onclick="ST.showSaved=false;ST.showCompare=true;render()" style="padding:8px 20px;">Compare (${ST.compareIds.length})</button></div>`;
  list.forEach(a=>{
    const d=new Date(a.ts);const ds=d.toLocaleDateString()+" "+d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    const jurN=a.jurisdiction==="denver"?"Denver":a.jurisdiction==="cos"?"COS":a.jurisdiction==="manitou"?"Manitou":"EPC";
    const isChecked=ST.compareIds.includes(a.id);
    h+=`<div style="background:#151520;border:1px solid #2A2A3A;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">`;
    h+=`<input type="checkbox" ${isChecked?"checked":""} onchange="toggleCompare('${a.id}')" style="flex-shrink:0;width:18px;height:18px;cursor:pointer;">`;
    h+=`<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:500;color:#E8E8EC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(a.address||"No address")}</div>`;
    h+=`<div style="font-size:12px;color:#9B9BA7;margin-top:2px;">${a.zone||"\u2014"} \u00b7 ${jurN} \u00b7 ${ds}</div></div>`;
    h+=`<div style="text-align:right;flex-shrink:0;"><span style="font-size:18px;font-weight:600;color:${a.summary.viableCount>0?"#4ADE80":"#F09595"};">${a.summary.viableCount}</span><span style="font-size:11px;color:#6B6B78;display:block;">viable</span></div>`;
    h+=`<div style="display:flex;gap:4px;flex-shrink:0;"><button class="btn-secondary" onclick="ST.showSaved=false;loadAnalysis('${a.id}')" style="padding:4px 10px;font-size:11px;">Load</button>`;
    h+=`<button class="btn-secondary" onclick="deleteAnalysis('${a.id}');render()" style="padding:4px 10px;font-size:11px;color:#F09595;">Del</button></div></div>`;
  });
  h+=`<div class="btn-row" style="margin-top:12px;"><button class="btn-secondary" onclick="ST.showSaved=false;ST.compareIds=[];render()">Back to analysis</button></div>`;
  APP.innerHTML=h;
}

function toggleCompare(id){
  if(!ST.compareIds)ST.compareIds=[];
  const idx=ST.compareIds.indexOf(id);
  if(idx>=0)ST.compareIds.splice(idx,1);else if(ST.compareIds.length<4)ST.compareIds.push(id);
  render();
}

/* ═══════════════════════════════════════════════════════════════════
   COMPARATIVE VIEW (F6)
   ═══════════════════════════════════════════════════════════════════ */
function renderComparison(){
  const list=savedAnalyses();
  const selected=ST.compareIds.map(id=>list.find(a=>a.id===id)).filter(Boolean);
  if(selected.length<2){ST.showCompare=false;ST.showSaved=true;render();return}
  const results=selected.map(a=>{
    const form=Object.assign(createDefaultForm(),a.form);
    let R;
    if(a.jurisdiction==="denver")R=runEngine(form);
    else if(a.jurisdiction==="epc")R=runEPCEngine(form);
    else if(a.jurisdiction==="manitou")R=runManitouEngine(form);
    else R=runCOSEngine(form);
    return{analysis:a,results:R};
  });
  let h=`<p class="q-title">Comparative Analysis</p>`;
  h+=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">`;
  h+=`<thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #2A2A3A;color:#9B9BA7;">Property</th>`;
  results.forEach(r=>{h+=`<th style="text-align:center;padding:8px;border-bottom:1px solid #2A2A3A;color:#E8E8EC;min-width:150px;">${esc(r.analysis.address||"No address")}</th>`});
  h+=`</tr></thead><tbody>`;
  const rows=[
    ["Jurisdiction",r=>({denver:"Denver",cos:"Colorado Springs",epc:"El Paso County",manitou:"Manitou Springs"})[r.analysis.jurisdiction]],
    ["Zone",r=>r.analysis.zone||"\u2014"],
    ["Viable",r=>{const n=r.results.error?0:r.results.results.filter(x=>x.v==="yes"||x.v==="conditional").length;return`<span style="color:${n>0?"#4ADE80":"#F09595"};font-weight:600;">${n}</span>`}],
    ["Max beds",r=>{if(r.results.error)return"\u2014";const vi=r.results.results.filter(x=>x.v==="yes"||x.v==="conditional");let best=0;vi.forEach(x=>{const n=x.mg===999?9999:(x.mg||0);if(n>best)best=n});return best===9999?"No cap":best===0?"\u2014":String(best)}],
    ["Conditional",r=>r.results.error?"\u2014":String(r.results.results.filter(x=>x.v==="conditional").length)],
    ["Blockers",r=>{if(r.results.error)return esc(r.results.error);const stops=r.results.gS||[];return stops.length?stops.map(s=>s.msg).join("; "):"None"}]
  ];
  rows.forEach(([label,fn])=>{
    h+=`<tr><td style="padding:8px;border-bottom:1px solid #1E1E2E;color:#9B9BA7;">${label}</td>`;
    results.forEach(r=>{h+=`<td style="padding:8px;border-bottom:1px solid #1E1E2E;text-align:center;color:#E8E8EC;">${fn(r)}</td>`});
    h+=`</tr>`;
  });
  h+=`<tr><td style="padding:8px;border-bottom:1px solid #1E1E2E;color:#9B9BA7;vertical-align:top;">Viable pathways</td>`;
  results.forEach(r=>{
    if(r.results.error){h+=`<td style="padding:8px;border-bottom:1px solid #1E1E2E;text-align:center;color:#9B9BA7;">\u2014</td>`;return}
    const vi=r.results.results.filter(x=>x.v==="yes"||x.v==="conditional").map(x=>x.nm);
    h+=`<td style="padding:8px;border-bottom:1px solid #1E1E2E;text-align:center;color:#E8E8EC;font-size:11px;">${vi.length?vi.join("<br>"):"\u2014"}</td>`;
  });
  h+=`</tr></tbody></table></div>`;
  h+=`<div class="btn-row" style="margin-top:16px;"><button class="btn-secondary" onclick="ST.showCompare=false;ST.showSaved=true;render()">Back to saved</button><button class="btn-secondary" onclick="ST.showCompare=false;ST.compareIds=[];render()">New analysis</button></div>`;
  APP.innerHTML=h;
}

/* ═══════════════════════════════════════════════════════════════════
   GLOSSARY (F11 \u2014 populated by glossary.js)
   ═══════════════════════════════════════════════════════════════════ */
function renderGlossary(){
  let h=`<p class="q-title">Glossary</p><p style="font-size:13px;color:#9B9BA7;margin-bottom:16px;">Abbreviations and terminology used in the Pathway Analyzer.</p>`;
  if(typeof GLOSSARY==="undefined"){h+=`<p style="color:#F09595;">Glossary data not loaded.</p>`;APP.innerHTML=h;return}
  const entries=Object.entries(GLOSSARY).sort((a,b)=>a[0].localeCompare(b[0]));
  const filterJur=ST.glossaryFilter||"all";
  h+=`<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">`;
  ["all","denver","cos","epc","manitou"].forEach(j=>{
    const label=j==="all"?"All":j==="denver"?"Denver":j==="cos"?"COS":j==="manitou"?"Manitou":"EPC";
    h+=`<button class="btn-secondary" onclick="ST.glossaryFilter='${j}';render()" style="padding:4px 12px;font-size:12px;${filterJur===j?"background:#2A2A4A;color:#8AA8D8;":""}">${label}</button>`;
  });
  h+=`</div>`;
  entries.forEach(([abbr,g])=>{
    if(filterJur!=="all"&&g.jur!=="all"&&g.jur!==filterJur)return;
    h+=`<div style="background:#151520;border:1px solid #2A2A3A;border-radius:8px;padding:10px 14px;margin-bottom:6px;">`;
    h+=`<span style="font-weight:600;color:#8AA8D8;font-family:'IBM Plex Mono',monospace;font-size:13px;">${esc(abbr)}</span>`;
    h+=` <span style="color:#E8E8EC;font-size:13px;">\u2014 ${esc(g.term)}</span>`;
    h+=`<p style="font-size:12px;color:#9B9BA7;margin:4px 0 0;">${esc(g.def)}</p></div>`;
  });
  h+=`<div class="btn-row" style="margin-top:16px;"><button class="btn-secondary" onclick="ST.showGlossary=false;render()">Back</button></div>`;
  APP.innerHTML=h;
}

/* ═══════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════ */
if(hydrateFromHash()){go()}else{render()}
