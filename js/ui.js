/* ═══════════════════════════════════════════════════════════════════
   UI MODULE — Rendering, wizard pages, and shared helpers
   Dependencies: config.js, state.js, gis.js, engine-*.js
   ═══════════════════════════════════════════════════════════════════ */
const APP=document.getElementById("app");

/* ── Shared Helpers ───────────────────────────────────────────── */
function setR(k,v){ST.form[k]=v;render()}
function r2(k,v){return`<button class="radio-btn ${v==="yes"?"sel":""}" onclick="setR('${k}','yes')">Yes</button><button class="radio-btn ${v==="no"?"sel":""}" onclick="setR('${k}','no')">No</button>`}
function r3(k,v){return`<button class="radio-btn ${v==="yes"?"sel":""}" onclick="setR('${k}','yes')">Yes</button><button class="radio-btn ${v==="no"?"sel":""}" onclick="setR('${k}','no')">No</button><button class="radio-btn ${v==="unknown"?"sel":""}" onclick="setR('${k}','unknown')">Unknown</button>`}
function esc(s){return(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}

/* ═══════════════════════════════════════════════════════════════════
   WIZARD PAGES
   ═══════════════════════════════════════════════════════════════════ */
function getPages(){
  if(!ST.jurisdiction)return[{id:"jurisdiction"}];
  if(ST.jurisdiction==="denver")return getDenverPages();
  if(ST.jurisdiction==="epc")return getEPCPages();
  return getCOSPages();
}

function getDenverPages(){
  const p=[{id:"addressLookup"},{id:"zone"}];const z=ST.form.zone;if(!z)return p;
  const ut=UT[z];if(!ut)return p;
  if(ut.t1==="NP"&&ut.t2==="NP"&&ut.t3==="NP"&&ut.t4==="NP"){p.push({id:"allNP"});return p}
  p.push({id:"licensing"},{id:"correctional"},{id:"op24hr"},{id:"overnight"});
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
  p.push({id:"licensing"},{id:"correctional"},{id:"cosFHA"});
  // If FBZ or PDZ, ask about plan
  if(z==="FBZ")p.push({id:"cosFBZ"});
  if(z==="PDZ")p.push({id:"cosPDZ"});
  p.push({id:"op24hr"});
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
  p.push({id:"licensing"});
  p.push({id:"correctional"});
  p.push({id:"epcSexOffender"});
  p.push({id:"op24hr"});
  p.push({id:"overnight"});
  // Nonprofit — gates philanthropic pathway
  if(ut.philanthropic!=="N"||ut.rehab!=="N")p.push({id:"epcNonprofit"});
  // Separation — only relevant if GH permitted in this zone AND zone is not commercial
  if(ut.gh==="A4"&&!epcIsCommercial(z))p.push({id:"epcSeparation"});
  // CAD-O: auto-determined by GIS overlay query — no intake page needed
  // Existing use
  p.push({id:"existingRC"});
  if(ST.form.existingRC==="yes")p.push({id:"maintained"});
  p.push({id:"review"});return p;
}

function advance(){const pages=getPages();if(ST.pg<pages.length-1)ST.pg++;render()}
function goBack(){if(ST.pg>0){ST.pg--;render()}}

/* ═══════════════════════════════════════════════════════════════════
   RENDER — MAIN ROUTER
   ═══════════════════════════════════════════════════════════════════ */
function render(){
  if(ST.results){renderRes();return}
  const pages=getPages();ST.pg=Math.min(ST.pg,pages.length-1);const pg=ST.pg;const page=pages[pg];const f=ST.form;
  // Progress dots (skip for jurisdiction page)
  let h="";
  if(page.id!=="jurisdiction"){
    h='<div class="pg-progress">';for(let i=0;i<pages.length;i++)h+=`<div class="pg-dot ${i<pg?"done":i===pg?"cur":""}"></div>`;
    h+=`<span class="pg-label">${pg+1} of ${pages.length}</span></div>`;
  }
  const bk=pg>0?`<button class="btn-secondary" onclick="goBack()">Back</button>`:"";
  const nx=`<button class="btn-primary" onclick="advance()">Next</button>`;

  /* ── Jurisdiction selector ─────────────────────────────────── */
  if(page.id==="jurisdiction"){
    h+=`<p class="q-title">Select jurisdiction</p>`;
    h+=`<p class="q-sub">Choose the city for this property analysis.</p>`;
    h+=`<div class="jur-card ${ST.jurisdiction==="denver"?"sel":""}" onclick="ST.jurisdiction='denver';resetState(true);ST.pg=0;render()"><p class="jur-name">Denver</p><p class="jur-desc">Denver Zoning Code — Residential Care Types 1–4 (DZC Art. 11, §§ 11.2.8–11.2.12)</p></div>`;
    h+=`<div class="jur-card ${ST.jurisdiction==="cos"?"sel":""}" onclick="ST.jurisdiction='cos';resetState(true);ST.pg=0;render()"><p class="jur-name">Colorado Springs</p><p class="jur-desc">Unified Development Code — Group Living / Human Services Establishment (UDC Ch. 7, § 7.3.301E)</p></div>`;
    h+=`<div class="jur-card ${ST.jurisdiction==="epc"?"sel":""}" onclick="ST.jurisdiction='epc';resetState(true);ST.pg=0;render()"><p class="jur-name">El Paso County</p><p class="jur-desc">Land Development Code — Group Home / Institutional BH Pathways (LDC Ch. 5, § 5.2.17) · SP-05 enforcement policy active</p></div>`;
    if(ST.jurisdiction){h+=`<div class="btn-row"><button class="btn-primary" onclick="advance()">Next</button></div>`}
    APP.innerHTML=h;return;
  }

  /* ── DENVER INTAKE PAGES (unchanged from v12) ──────────────── */
  if(ST.jurisdiction==="denver"){
    if(page.id==="addressLookup"){
      h+=`<p class="q-title">Property address</p>`;
      h+=`<p class="q-sub">Enter a Denver address. The tool will query city data layers to auto-populate zone district, lot size, and RC facility counts.</p>`;
      if(ST.gisPhase==="idle"||ST.gisPhase==="error"||ST.gisPhase==="skipped"){
        h+=`<div class="addr-row"><input type="text" id="gis-addr" class="addr-input" value="${esc(f.address||"")}" placeholder="e.g. 1680 Sherman St, 2901 Blake St" /><button class="btn-primary addr-btn" onclick="gisStartLookup()">Look up</button></div>`;
        if(ST.gisPhase==="error"){h+=`<div class="lookup-error">${esc(ST.gisError)}</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="gisSkip()">Skip lookup — enter manually</button></div>`}
        else if(ST.gisPhase==="skipped"){h+=`<div style="margin-top:12px;font-size:13px;color:#9B9BA7;">Lookup skipped. You'll enter zone, lot size, and RC data manually in later steps.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="ST.form.address=document.getElementById('gis-addr').value||null;advance()">Next</button></div>`}
        else{h+=`<div class="field-help">Press "Look up" to query Denver's ArcGIS layers, or leave blank and click Next to enter all data manually.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.form.address=document.getElementById('gis-addr').value||null;ST.gisPhase='skipped';advance()">Skip — enter manually</button></div>`}
      }
      else if(ST.gisPhase==="searching"){h+=`<div class="lookup-status"><span class="spinner"></span>Searching Denver address points\u2026</div>`}
      else if(ST.gisPhase==="disambig"){
        h+=`<div style="margin:12px 0;"><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">Multiple addresses matched. Select the correct one:</p><ul class="disambig-list">`;
        ST.gisAddresses.forEach((a,i)=>{h+=`<li class="disambig-item" onclick="gisSelectAddress(${i})"><span class="disambig-addr">${esc(a.FULL_ADDRESS)}</span></li>`});
        h+=`</ul></div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.gisPhase='idle';render()">Try a different address</button></div>`;
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
    if(page.id==="zone"){
      const autoSrc=ST.gisPhase==="done"&&ST.gisAutoZone&&ZL.includes(f.zone||"")&&!ST.gisOverrides.zone;
      h+=`<p class="q-title">Zone district</p><p class="q-sub">`;
      if(autoSrc)h+=`Auto-populated from ArcGIS. Confirm or change the zone district.`;else h+=`Select the zone district for this property.`;
      h+=`</p><select class="zs" onchange="ST.form.zone=this.value||null;ST.pg=${pg};render()"><option value="">— Select —</option>`;
      for(const[gn,gd] of Object.entries(ZG)){const zz=gd.p?ZL.filter(z=>z.startsWith(gd.p)):ZL.filter(z=>z==="MHC"||z==="O-1");if(!zz.length)continue;h+=`<optgroup label="${gn}">`;zz.forEach(z=>{h+=`<option value="${z}" ${f.zone===z?"selected":""}>${z}</option>`});h+=`</optgroup>`}
      h+=`</select>`;
      if(autoSrc)h+=`<div class="field-help" style="color:#4ADE80;">Source: Denver zoning layer (ODC_ZONE_ZONING_A) <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      else h+=`<a class="gis-link" href="${ZMAP}" target="_blank" rel="noopener">Open Denver zoning map &#8599;</a>`;
      if(!autoSrc){h+=`<div class="info-box"><strong>How to find your zone district:</strong><ol><li>Click the link above to open Denver's official zoning map.</li><li>Search for the property address.</li><li>Click the parcel — the zone district code appears in the popup.</li><li>Select the matching code above.</li></ol></div>`}
      h+=`<div class="btn-row">${bk}${f.zone?nx:""}</div>`;
    }
    else if(page.id==="allNP"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.25rem;"><p style="font-size:16px;font-weight:500;color:#F09595;margin:0 0 6px;">No pathways available</p><p style="font-size:13px;color:#F09595;margin:0;">${ST.jurisdiction==="denver"?"Residential Care is not permitted in any form":"No group living or human services uses are permitted"} in ${f.zone}.</p></div><div class="btn-row"><button class="btn-secondary" onclick="ST.pg=0;render()">Start over</button></div>`}
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
        h+=`<div class="addr-row"><input type="text" id="cos-addr" class="addr-input" value="${esc(f.address||"")}" placeholder="e.g. 1215 N Nevada Ave, 955 E Colorado Ave" /><button class="btn-primary addr-btn" onclick="cosGisStart()">Look up</button></div>`;
        if(ST.gisPhase==="error"){h+=`<div class="lookup-error">${esc(ST.gisError)}</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="gisSkip()">Skip — enter manually</button></div>`}
        else if(ST.gisPhase==="skipped"){h+=`<div style="margin-top:12px;font-size:13px;color:#9B9BA7;">Lookup skipped.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="ST.form.address=document.getElementById('cos-addr')?.value||null;advance()">Next</button></div>`}
        else{h+=`<div class="field-help">Press "Look up" to query Colorado Springs GIS layers, or skip to enter data manually.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.form.address=document.getElementById('cos-addr')?.value||null;ST.gisPhase='skipped';advance()">Skip — enter manually</button></div>`}
      }
      else if(ST.gisPhase==="searching"){h+=`<div class="lookup-status"><span class="spinner"></span>Searching Colorado Springs address points\u2026</div>`}
      else if(ST.gisPhase==="disambig"){
        h+=`<div style="margin:12px 0;"><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">Multiple addresses matched:</p><ul class="disambig-list">`;
        ST.gisAddresses.forEach((a,i)=>{h+=`<li class="disambig-item" onclick="cosGisSelect(${i})"><span class="disambig-addr">${esc(a.FullAddress)}</span></li>`});
        h+=`</ul></div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.gisPhase='idle';render()">Try a different address</button></div>`;
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
    if(page.id==="cosZone"){
      const autoSrc=ST.gisPhase==="done"&&ST.gisAutoZone&&COS_ZL.includes(f.zone||"")&&!ST.gisOverrides.zone;
      h+=`<p class="q-title">Zone district</p><p class="q-sub">`;
      if(autoSrc)h+=`Auto-populated from ArcGIS. Confirm or change.`;else h+=`Select the zone district.`;
      h+=`</p><select class="zs" onchange="ST.form.zone=this.value||null;ST.pg=${pg};render()"><option value="">— Select —</option>`;
      for(const[gn,gd] of Object.entries(COS_ZG)){h+=`<optgroup label="${gn}">`;gd.list.forEach(z=>{h+=`<option value="${z}" ${f.zone===z?"selected":""}>${z}</option>`});h+=`</optgroup>`}
      h+=`</select>`;
      if(autoSrc)h+=`<div class="field-help" style="color:#4ADE80;">Source: COS zoning layer <span class="auto-badge api" style="vertical-align:middle;">API</span></div>`;
      else h+=`<a class="gis-link" href="${COS_ZMAP}" target="_blank" rel="noopener">Open Colorado Springs zoning map &#8599;</a>`;
      h+=`<div class="btn-row">${bk}${f.zone?nx:""}</div>`;
    }
    else if(page.id==="allNP"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.25rem;"><p style="font-size:16px;font-weight:500;color:#F09595;margin:0 0 6px;">No pathways available</p><p style="font-size:13px;color:#F09595;margin:0;">No group living or human services uses are permitted in ${f.zone}.</p></div><div class="btn-row"><button class="btn-secondary" onclick="ST.pg=0;render()">Start over</button></div>`}
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
      h+=`<div style="margin-bottom:12px;"><label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 0;cursor:pointer;"><input type="checkbox" ${f.targetOver60?"checked":""} onchange="ST.form.targetOver60=this.checked;render()"> Residents exclusively over age 60 (Long-term Care Facility eligibility)</label>`;
      h+=`<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 0;cursor:pointer;"><input type="checkbox" ${f.targetTerminal?"checked":""} onchange="ST.form.targetTerminal=this.checked;render()"> ≥ 9 terminally ill residents, life expectancy &lt; 6 months (Hospice eligibility)</label>`;
      h+=`<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 0;cursor:pointer;"><input type="checkbox" ${f.tempShelter?"checked":""} onchange="ST.form.tempShelter=this.checked;render()"> Temporary shelter model, generally unlicensed (Human Services Shelter)</label></div>`;
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
        h+=`<div class="addr-row"><input type="text" id="epc-addr" class="addr-input" value="${esc(f.address||"")}" placeholder="e.g. 7250 Campus Dr, 11525 Ridgeline Dr" /><button class="btn-primary addr-btn" onclick="epcGisStart()">Look up</button></div>`;
        if(ST.gisPhase==="error"){h+=`<div class="lookup-error">${esc(ST.gisError)}</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="gisSkip()">Skip — enter manually</button></div>`}
        else if(ST.gisPhase==="skipped"){h+=`<div style="margin-top:12px;font-size:13px;color:#9B9BA7;">Lookup skipped.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-primary" onclick="ST.form.address=document.getElementById('epc-addr')?.value||null;advance()">Next</button></div>`}
        else{h+=`<div class="field-help">Press "Look up" to query EPC zoning and parcel layers, or skip to enter manually.</div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.form.address=document.getElementById('epc-addr')?.value||null;ST.gisPhase='skipped';advance()">Skip — enter manually</button></div>`}
      }
      else if(ST.gisPhase==="searching"){h+=`<div class="lookup-status"><span class="spinner"></span>Geocoding address\u2026</div>`}
      else if(ST.gisPhase==="disambig"){
        h+=`<div style="margin:12px 0;"><p style="font-size:13px;color:#9B9BA7;margin:0 0 8px;">Multiple addresses matched. Select the correct one:</p><ul class="disambig-list">`;
        ST.gisAddresses.forEach((a,i)=>{h+=`<li class="disambig-item" onclick="epcGisSelect(${i})"><span class="disambig-addr">${esc(a.addr)}</span></li>`});
        h+=`</ul></div>`;h+=`<div class="btn-row">${bk}<button class="btn-secondary" onclick="ST.gisPhase='idle';render()">Try a different address</button></div>`;
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
        h+=`</div></div>`;
        h+=`<details class="override-row"><summary>Override auto-populated values</summary><div class="override-grid">`;
        h+=`<div class="override-item"><label>Zone district</label><select id="ov-zone" onchange="ST.gisOverrides.zone=this.value"><option value="">— Use API value —</option>`;
        for(const[gn,gd2] of Object.entries(EPC_ZG)){h+=`<optgroup label="${gn}">`;gd2.list.forEach(z=>{h+=`<option value="${z}"${ST.gisOverrides.zone===z?" selected":""}>${z}</option>`});h+=`</optgroup>`}
        h+=`</select></div>`;
        h+=`<div class="override-item"><label>Lot size (sf)</label><input type="number" id="ov-lot" value="${ST.gisOverrides.lotSize||""}" placeholder="${gd.autoLot||"Enter value"}" onchange="ST.gisOverrides.lotSize=this.value"></div>`;
        h+=`</div></details>`;
        h+=`<div class="data-caveats">Zone from EPC ZoningAreas layer; lot size from Parcels layer (Shape.STArea in CO State Plane ft\u00B2); jurisdiction from IncorporatedCities layer. Verify with PCD.</div>`;
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
      h+=`</p><select class="zs" onchange="ST.form.zone=this.value||null;ST.pg=${pg};render()"><option value="">— Select —</option>`;
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
    else if(page.id==="allNP"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1.25rem;"><p style="font-size:16px;font-weight:500;color:#F09595;margin:0 0 6px;">No pathways available</p><p style="font-size:13px;color:#F09595;margin:0;">No behavioral health or residential care uses are permitted in ${f.zone}.</p></div><div class="btn-row"><button class="btn-secondary" onclick="ST.pg=0;render()">Start over</button></div>`}
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
  APP.innerHTML=h;
}

/* ── Review Facts Helper ──────────────────────────────────────── */
function rFacts(){
  const f=ST.form;
  const jurName=ST.jurisdiction==="denver"?"Denver":ST.jurisdiction==="cos"?"Colorado Springs":"El Paso County";
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
  } else {
    items.push(["Correctional",f.correctional||"\u2014"],["FHA-protected",f.fhaProtected||"\u2014"],["24-hour",f.op24hr||"\u2014"]);
    if(f.targetOver60)items.push(["Over 60 population","Yes"]);
    if(f.targetTerminal)items.push(["Terminal/hospice","Yes"]);
    if(f.tempShelter)items.push(["Temporary shelter","Yes"]);
    items.push(["Construction",f.constructionType||"\u2014"]);
    if(f.distGLRDetox!=null)items.push(["Dist. to GLR/Detox",f.distGLRDetox.toLocaleString()+" ft"]);
    if(f.nearestAL==="yes")items.push(["Nearest is AL","Yes"]);
    items.push(["Existing use",f.existingRC||"\u2014"]);
    if(f.existingRC==="yes")items.push(["Maintained",f.maintained||"\u2014"]);
    if(f.cosOverlays?.length)items.push(["Overlays",f.cosOverlays.join(", ")]);
  }
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
  else ST.results=runCOSEngine(ST.form);
  ST.activeTab="dashboard";ST.expanded={};render();
}

/* ═══════════════════════════════════════════════════════════════════
   RESULTS RENDERER (shared — handles all jurisdictions)
   ═══════════════════════════════════════════════════════════════════ */
function renderRes(){
  const R=ST.results;if(R.error){APP.innerHTML=`<div><p style="color:#F09595;font-weight:500;">${R.error}</p><div class="btn-row"><button class="btn-secondary" onclick="ST.results=null;ST.pg=0;render()">Back</button></div></div>`;return}
  const vi=R.results.filter(r=>r.v==="yes"),co=R.results.filter(r=>r.v==="conditional"),nv=R.results.filter(r=>r.v==="no");
  let best=0;vi.forEach(r=>{const n=r.mg===999?9999:(r.mg||0);if(n>best)best=n});
  const bL=best===9999?"No UDC cap":best===0?"\u2014":String(best);
  const viCo=R.results.filter(r=>r.v==="yes"||r.v==="conditional");
  const allC=[];viCo.forEach(r=>r.cav.forEach(c=>{if(!allC.find(x=>x.msg===c.msg))allC.push({...c,paths:viCo.filter(r2=>r2.cav.find(c2=>c2.msg===c.msg)).map(r2=>r2.nm)})}));
  const blk=allC.filter(c=>c.blocking).length;
  const jurLabel=ST.jurisdiction==="denver"?"Denver":ST.jurisdiction==="cos"?"Colorado Springs":"El Paso County";
  let h=`<div class="dash-header"><div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;"><div><p class="dash-title">${esc(ST.form.address)||"Analysis"}</p><p class="dash-sub">${R.zone}${ST.form.lotSize?" · "+ST.form.lotSize.toLocaleString()+" sf":""} · ${jurLabel}</p></div><button class="btn-secondary" onclick="resetState();ST.pg=0;render()" style="padding:6px 16px;font-size:12px;">New analysis</button></div></div>`;
  if(R.p2==="fail"){h+=`<div style="background:#2E1010;border:1px solid #5A2020;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem;"><p style="font-size:14px;font-weight:500;color:#F09595;margin:0 0 4px;">All pathways blocked</p><p style="font-size:13px;color:#D87070;margin:0;">${R.gS.map(s=>s.msg+' <span class="cite">'+s.cite+"</span>").join("; ")}</p></div>`;h+=rFacts();APP.innerHTML=h;return}
  h+=`<div class="summary-row"><div class="stat-card"><p class="stat-label">Viable pathways</p><p class="stat-val green">${vi.length}</p></div><div class="stat-card"><p class="stat-label">Highest viable count</p><p class="stat-val">${bL}</p></div><div class="stat-card"><p class="stat-label">Open caveats</p><p class="stat-val ${blk>0?"amber":""}">${allC.length}${blk?" ("+blk+" blocking)":""}</p></div></div>`;
  h+=`<div class="tab-row"><button class="tab-btn ${ST.activeTab==="dashboard"?"active":""}" onclick="ST.activeTab='dashboard';render()">Pathways</button><button class="tab-btn ${ST.activeTab==="caveats"?"active":""}" onclick="ST.activeTab='caveats';render()">Caveats (${allC.length})</button><button class="tab-btn ${ST.activeTab==="facts"?"active":""}" onclick="ST.activeTab='facts';render()">Site facts</button></div>`;
  if(ST.activeTab==="dashboard"){
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
    if(vi.length)h+=`<p class="section-label">Viable</p>`+vi.map(pwC).join("");if(co.length)h+=`<p class="section-label">Conditional</p>`+co.map(pwC).join("");if(nv.length)h+=`<p class="section-label">Not viable</p>`+nv.map(pwC).join("")}
  else if(ST.activeTab==="caveats"){if(!allC.length)h+=`<p style="font-size:13px;color:#9B9BA7;padding:1rem 0;">No open caveats on viable pathways.</p>`;else allC.forEach(c=>{h+=`<div class="caveat-card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span class="stop-pill ${c.blocking?"stop-hard":"stop-caveat"}">${c.blocking?"Blocking":"Info"}</span><span class="cite">${c.cite}</span></div><p class="caveat-title">${c.msg}</p><p class="caveat-meta"><strong>Affects:</strong> ${c.paths.join(", ")}</p>${c.resolve?`<p class="caveat-meta"><strong>Resolve:</strong> ${c.resolve}</p>`:""}</div>`})}
  else if(ST.activeTab==="facts")h+=rFacts();
  APP.innerHTML=h;document.querySelectorAll(".pw-card-head").forEach(el=>{el.onclick=()=>{const id=el.getAttribute("data-id");ST.expanded[id]=!ST.expanded[id];el.nextElementSibling.classList.toggle("open");el.querySelector(".pw-arrow").classList.toggle("open")}});
}

function pwC(r){
  const bc=r.v==="yes"?"badge-yes":r.v==="conditional"?"badge-cond":"badge-no",bt=r.v==="yes"?"Viable":r.v==="conditional"?"Conditional":"Not viable";
  let ct="";if(r.v!=="no"){if(r.mg===999)ct="no cap";else if(!r.mg)ct="TBD";else ct="up to "+r.mg+" residents"}
  const isO=ST.expanded[r.id]||false;let d="";
  if(r.v!=="no"){
    d+=`<div class="detail-section"><div class="detail-heading">Why viable</div><p class="detail-text">${r.rat}</p></div>`;
    if(r.wf.length){d+=`<div class="detail-section"><div class="detail-heading">Workflow</div>`;r.wf.forEach((w,i)=>{d+=`<div class="wf-step"><div class="wf-num">${i+1}</div><div class="wf-text">${w.t}</div></div>`});d+=`</div>`}
    d+=`<div class="detail-section"><div class="detail-heading">Risk</div><div class="risk-row">`;
    const rl={nimby:"NIMBY",escalation:"Escalation",timeline:"Timeline",discretion:"Discretion",approval:"Approval",clock:"Review clock",fee:"Fee"};
    Object.entries(r.rsk).forEach(([k,v])=>{d+=`<div class="risk-item"><div class="risk-label">${rl[k]||k}</div><div class="risk-val">${v}</div></div>`});
    d+=`</div></div>`;
    if(r.cav.length){d+=`<div class="detail-section"><div class="detail-heading">Caveats (${r.cav.length})</div>`;r.cav.forEach(c=>{d+=`<div style="margin-bottom:6px;"><span class="stop-pill ${c.blocking?"stop-hard":"stop-caveat"}">${c.blocking?"Blocking":"Info"}</span> <span style="font-size:13px;color:#9B9BA7;">${c.msg}</span> <span class="cite">${c.cite}</span></div>`});d+=`</div>`}
    d+=`<div class="detail-section"><div class="detail-heading">Assessment</div><p class="detail-text"><strong>${r.rank}</strong>${r.proc?" · "+r.proc:""}</p></div>`;
  } else {d+=`<div class="detail-section"><div class="detail-heading">Why not viable</div>`;r.stops.forEach(s=>{d+=`<div style="margin-bottom:6px;"><span class="stop-pill stop-hard">Hard stop</span> <span style="font-size:13px;color:#9B9BA7;">${s.msg}</span> <span class="cite">${s.cite}</span></div>`});d+=`</div>`}
  return`<div class="pw-card"><div class="pw-card-head" data-id="${r.id}"><span class="pw-badge ${bc}">${bt}</span><span class="pw-name">${r.nm}</span><span class="pw-count">${ct}</span><span class="pw-arrow ${isO?"open":""}">&#9654;</span></div><div class="pw-detail ${isO?"open":""}">${d}</div></div>`;
}

render();
