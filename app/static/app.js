window.loginUserInfo=null;

async function exportSourceExcel(id){
  try{
    if(!id)throw new Error("ไม่พบ Record ID");
    if(!window.currentPersonAccess?.person_key){
      throw new Error("เซสชันหมดอายุ กรุณาล็อกอินใหม่");
    }
    return await exportExcel(`/api/source-forms/record/${id}/excel`);
  }catch(e){
    console.error("exportSourceExcel failed",e);
    toast("ดาวน์โหลด Excel ไม่สำเร็จ: "+(e?.message||e));
    throw e;
  }
}

async function exportPurchaseDocExcel(id){
  try{
    if(!id)throw new Error("ไม่พบ Record ID");
    return await exportExcel(`/api/purchase-docs/record/${id}/excel`);
  }catch(e){
    console.error("exportPurchaseDocExcel failed",e);
    toast("ดาวน์โหลด Excel ไม่สำเร็จ: "+(e?.message||e));
    throw e;
  }
}

let token = localStorage.getItem("token") || ""; window.loginUserInfo=JSON.parse(localStorage.getItem("loginUserInfo")||"{}");
let me = null;
let currentPage = "dashboard";
let cache = {projects:[], materials:[], suppliers:[], formulas:[], revisions:[], productionOrders:[]};

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));

function money(v){ if(v===undefined || v===null || v==="") return "-"; return Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4});}
function currentYearMonth(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
function monthLabel(ym){
  if(!ym)return "ไม่ระบุเดือน";
  const [y,m]=ym.split("-");
  const names=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  return `${names[Number(m)]||m} ${y}`;
}
function statusBadge(s){
  const x=String(s||"-");
  let c=""; if(["APPROVED","DELIVERED","CLOSED","READY","OK","SENT"].includes(x))c="ok";
  else if(["REJECTED","SHORTAGE","OVERDUE"].includes(x))c="bad";
  else if(["DRAFT","PENDING","REQUESTED","WAITING_SALES","NOT_SENT","IN_PROGRESS"].includes(x))c="warn";
  return `<span class="badge ${c}">${esc(x)}</span>`;
}
function toast(msg){ const d=document.createElement("div");d.className="toast";d.textContent=msg;$("toast").appendChild(d);setTimeout(()=>d.remove(),2600);}

async function api(url, options={}){
  const headers = {...(options.headers||{})};
  if(token) headers.Authorization = "Bearer "+token;
  if(window.currentPersonAccess?.person_key){
    headers["X-Person-Key"]=window.currentPersonAccess.person_key;
  }
  if(options.body && typeof options.body !== "string"){ headers["Content-Type"]="application/json"; options.body=JSON.stringify(options.body); }
  const r=await fetch(url,{...options,headers});

  // Response body can only be consumed once.
  // Read as text once, then parse JSON from that text when possible.
  const raw=await r.text();
  let data=null;
  if(raw){
    try{ data=JSON.parse(raw); }
    catch{ data=raw; }
  }

  if(r.status===401){ logout(); throw new Error("Session expired"); }
  if(!r.ok){
    const message=(data && typeof data==="object")
      ? (data.detail || data.message || JSON.stringify(data))
      : (data || `HTTP ${r.status}`);
    throw new Error(message);
  }
  return data;
}

async function login(){
  $("loginError").textContent="";
  try{
    const d=await api("/api/auth/login",{method:"POST",body:{username:$("loginUsername").value.trim().toLowerCase(),password:$("loginPassword").value}});
    token=d.access_token; localStorage.setItem("token",token); window.loginUserInfo=d.user||null; localStorage.setItem("loginUserInfo",JSON.stringify(d.user||{})); await bootstrap();
   }catch(e){
    $("loginError").textContent = e.message==="Invalid username/password"
      ? "Username หรือ Password ไม่ถูกต้อง"
      : e.message;
  }
}
function logout(){localStorage.removeItem("token");localStorage.removeItem("loginUserInfo");token="";me=null;window.loginUserInfo=null;window.currentPersonAccess=null;window.formWorkspace=null;$("appShell").classList.add("hidden");$("departmentPortal")?.classList.add("hidden");$("loginPage").classList.remove("hidden");}

async function bootstrap(){
  try{
    me=await api("/api/ui/me");
    $("userName").textContent=me.full_name;
    $("userRole").textContent=me.role;
    if($("adminNav")) $("adminNav").classList.toggle("hidden",me.role!=="ADMIN" && me.role!=="RD_HEAD");
    $("loginPage").classList.add("hidden");

    // Logging in as a real employee IS the identity check now -- no more
    // "choose department PIN" / "choose คนที่ 1-4 + PIN" gate on top of it.
    window.currentPersonAccess={person_key:`USER-${me.id}`};
    window.formWorkspace={
      workspace_user_id:me.id,
      display_name:me.full_name,
      slot_no:1,
      workspace_token:"account-owner"
    };

    const allowed=allowedDepartments();
    if(allowed.length===1){
      // Only one department available to this account -- skip the picker
      // grid entirely and go straight in.
      $("departmentPortal").classList.add("hidden");
      $("appShell").classList.remove("hidden");
      await enterDepartment(allowed[0]);
    }else{
      $("appShell").classList.add("hidden");
      $("departmentPortal").classList.remove("hidden");
      renderDepartmentPortal();
      if(currentDepartment && allowed.includes(currentDepartment))await enterDepartment(currentDepartment);
    }
  }catch(e){
    console.error("Bootstrap error:", e);
    const box=$("loginError");
    if(box) box.textContent="เปิดระบบไม่สำเร็จ: "+(e?.message||e);
    // Do not erase a valid token automatically for a frontend rendering error.
    $("loginPage")?.classList.remove("hidden");
  }
}

const pageMeta={
 originalForms:["Original 5 Forms","แบบฟอร์มต้นฉบับของบริษัท ใช้เป็นแม่แบบหลักของ Workflow"],
 customers:["Customers","ข้อมูลลูกค้า — ช่องที่ยังไม่มีข้อมูลจะแสดง ให้ใส่ Data"],
 dashboard:["Dashboard","ภาพรวมงาน R&D, Tester, Rate และ Production"],
 projects:["Product Development","Customer Requirement และโครงการพัฒนาผลิตภัณฑ์"],
 formulas:["R&D Formula","Formula, Revision, Costing และการเปลี่ยนแปลงสูตร"],
 testers:["Tester Requests","ติดตามสินค้าทดลอง SLA 7–14 วัน"],
 rates:["Rate / Costing","คำนวณราคา กำไร และลำดับการอนุมัติ"],
 materials:["Raw Materials","ฐานวัตถุดิบและเอกสาร Specification / FDA"],
 suppliers:["Suppliers","Supplier และประเทศต้นทาง"],
 inventory:["Inventory","Stock, Reserved และ Available"],
 registration:["Registration / FDA","สูตรขึ้นทะเบียน อย. และสถานะส่ง Admin / มัดจำ 50%"],
 production:["Production / MRP","สูตรผลิต, Production Order, MRP และ Planning"],
 ai:["AI Insights","สรุปสถานะและจุดที่ควรติดตามจาก ERP"],
 admin:["Admin","Users และ Audit Log"],
 workInbox:["งานที่ส่งมา","งานที่แผนกอื่นส่งมาให้แผนกนี้ และงานที่แผนกนี้ส่งออกไป"]
};
async function openPage(page){
  currentPage=page;
  document.querySelectorAll(".nav[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("pageTitle").textContent=pageMeta[page][0];$("pageSubtitle").textContent=pageMeta[page][1];
  $("pageContent").innerHTML='<div class="card">Loading...</div>';
  try{ await renderers[page](); }catch(e){$("pageContent").innerHTML=`<div class="card error">${esc(e.message)}</div>`;}
}
function refreshCurrent(){if(String(currentPage).startsWith("source:")) return openSourceForm(String(currentPage).slice(7)); return openPage(currentPage)}

function table(headers, rows){
  if(!rows.length)return '<div class="empty">ยังไม่มีข้อมูล</div>';
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

async function renderDashboard(){
  const d=await api("/api/dashboard");
  const i=d.insights||{};
  $("pageContent").innerHTML=`
  <div class="kpis">
   ${[["Customers",d.customers],["Projects",d.projects],["Formulas",d.formulas],["Testers",d.testers],
      ["Rate Requests",d.rate_requests],["Production Orders",d.production_orders],["Raw Materials",d.materials],["Suppliers",d.suppliers]]
      .map(([a,b])=>`<div class="kpi"><small>${a}</small><div class="value">${b??0}</div></div>`).join("")}
  </div>
  <div class="grid2">
   <div class="card"><h3>AI / System Alerts</h3>
      <div class="insight ${i.tester_overdue?.length?'bad':''}">Tester overdue: <b>${i.tester_overdue?.length||0}</b></div>
      <div class="insight ${i.tester_due_within_3_days?.length?'warn':''}">Tester due within 3 days: <b>${i.tester_due_within_3_days?.length||0}</b></div>
      <div class="insight">Pending rates: <b>${i.pending_rate_requests||0}</b></div>
      <div class="insight">Draft formula revisions: <b>${i.draft_formula_revisions||0}</b></div>
      <div class="insight">Not sent to planning: <b>${i.production_orders_not_sent_to_planning||0}</b></div>
   </div>
   <div class="card"><h3>Workflow</h3>
     <p>Requirement → Formula → Tester / Rate → Approved Formula → Production Formula → Production Order → MRP → Planning</p>
     <button class="primary" onclick="openPage('projects')">เริ่ม Product Development</button>
   </div>
  </div>`;
}

async function renderProjects(){cache.projects=await api("/api/final/projects-full");const rows=cache.projects.map(x=>`<tr><td>${esc(x.project_no)}</td><td>${esc(x.customer)}</td><td>${esc(x.product_name)}</td><td>${(x.supplements||[]).map(v=>`<div><b>${esc(v.code)}</b> ${esc(v.name)} — ${v.amount} ${esc(v.unit)}</div>`).join("")||'<span class="need-data">ให้ใส่ Data</span>'}</td><td>${x.target_quantity??"-"}</td><td>${statusBadge(x.status)}</td></tr>`);$("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="Search project..." oninput="filterTable(this)"><div class="actions"><button class="secondary" onclick="exportExcel('/api/export/all.xlsx')">Export Excel</button><button class="primary" onclick="projectForm()">+ New Project</button></div></div>${table(["Project","Customer","Product","รหัสอาหารเสริม + ปริมาณ","Target Qty","Status"],rows)}</div>`}
async function exportExcel(path){
  try{
    const headers={Authorization:"Bearer "+token};
    if(window.currentPersonAccess?.person_key){
      headers["X-Person-Key"]=window.currentPersonAccess.person_key;
    }
    const r=await fetch(path,{headers});
    if(!r.ok){
      let msg="Export failed";
      try{
        const data=await r.json();
        msg=data?.detail||msg;
      }catch(_){}
      throw new Error(msg);
    }
    const b=await r.blob();
    const u=URL.createObjectURL(b);
    const a=document.createElement("a");
    a.href=u;
    const cd=r.headers.get("content-disposition")||"";
    const fm=/filename="?([^";]+)"?/i.exec(cd);
    a.download=fm?.[1]||"export.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),1500);
    toast("ดาวน์โหลด Excel สำเร็จ");
  }catch(e){
    console.error("Export Excel failed:",e);
    toast("ดาวน์โหลด Excel ไม่สำเร็จ: "+(e?.message||e));
  }
}
async function projectForm(){if(!window.supplementCodeData)window.supplementCodeData=await fetch("/static/supplement_codes.json").then(r=>r.json());openModal("New Product Development",`<div class="form-grid"><div><label>Project No.</label><input id="f_project_no" value="PD-${new Date().getFullYear()}-"></div><div><label>Customer</label><input id="f_customer_name" placeholder="พิมพ์ชื่อลูกค้าเอง"></div><div><label>จำนวนรหัสอาหารเสริมที่ต้องใช้</label><input id="f_supp_count" type="number" min="1" max="50" value="1" oninput="renderSupplementInputs()"></div><div><label>Product Name</label><input id="f_product" placeholder="ให้ใส่ Data"></div><div class="wide" id="supplementInputArea"></div><div><label>Product Type</label><select id="f_type"><option>Capsule</option><option>Tablet</option><option>Powder</option><option>Other</option></select></div><div><label>Target Quantity</label><input id="f_target_qty" type="number"></div><div class="wide"><button class="primary" onclick="saveProject()">Save Project</button></div></div>`);renderSupplementInputs()}
function renderSupplementInputs(){const n=Math.max(1,Math.min(50,Number($("f_supp_count").value||1))),opts=window.supplementCodeData.map(x=>`<option value="${esc(x.code)}">${esc(x.name)} — ${esc(x.vendor||"")}</option>`).join("");let h="<h3>รหัสอาหารเสริมและปริมาณสาร</h3>";for(let i=0;i<n;i++)h+=`<div class="supp-row"><div><label>รหัส #${i+1}</label><input class="supp-code" list="supplementCodes" placeholder="พิมพ์รหัสเพื่อค้นหา..."></div><div><label>ปริมาณสาร</label><input class="supp-amount" type="number" min="0" step="0.000001" placeholder="ให้ใส่ Data"></div><div><label>หน่วย</label><select class="supp-unit"><option>mg</option><option>g</option><option>kg</option><option>mcg</option><option>ml</option></select></div></div>`;h+=`<datalist id="supplementCodes">${opts}</datalist>`;$("supplementInputArea").innerHTML=h}
async function saveProject(){const cn=$("f_customer_name").value.trim(),rs=[...document.querySelectorAll(".supp-row")],supplements=rs.map(r=>{const code=r.querySelector(".supp-code").value.trim(),f=window.supplementCodeData.find(x=>x.code.toLowerCase()===code.toLowerCase());return{supplement_code:code,supplement_name:f?.name||null,amount:Number(r.querySelector(".supp-amount").value),unit:r.querySelector(".supp-unit").value}});if(!cn||supplements.some(x=>!x.supplement_code||x.amount<=0)){toast("กรอก Customer, รหัส และปริมาณสารให้ครบ");return}let cs=await api("/api/customers"),c=cs.find(x=>x.name.toLowerCase()===cn.toLowerCase());if(!c)c=await api("/api/customers",{method:"POST",body:{customer_code:"CUST-"+Date.now().toString().slice(-8),name:cn}});await api("/api/projects",{method:"POST",body:{project_no:$("f_project_no").value,customer_id:c.id,product_name:$("f_product").value,supplement_code:supplements[0].supplement_code,supplement_items:supplements,product_type:$("f_type").value,target_quantity:$("f_target_qty").value?Number($("f_target_qty").value):null}});closeModal();toast("บันทึกแล้ว");renderProjects()}

async function renderMaterials(){
  cache.materials=await api("/api/materials");
  const rows=cache.materials.map(x=>`<tr><td>${esc(x.material_code)}</td><td>${esc(x.trade_name)}</td><td>${esc(x.ingredient_name||"-")}</td><td>${x.halal?"Yes":"No"}</td><td>${esc(x.specification_ref||"-")}</td><td>${esc(x.fda_ref||"-")}</td></tr>`);
  $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="Search material..." oninput="filterTable(this)"><button class="primary" onclick="materialForm()">+ Raw Material</button></div>${table(["Code","Trade Name","Ingredient","Halal","Specification","FDA"],rows)}</div>`;
}
function materialForm(){openModal("New Raw Material",`
<div class="form-grid"><div><label>Material Code</label><input id="m_code" placeholder="ให้ใส่ Data"></div><div><label>Trade Name</label><input id="m_trade" placeholder="ให้ใส่ Data"></div>
<div><label>Ingredient Name</label><input id="m_ing"></div><div><label>Halal</label><select id="m_halal"><option value="false">No</option><option value="true">Yes</option></select></div>
<div class="wide"><label>Specification Ref</label><input id="m_spec"></div><div class="wide"><label>FDA Ref</label><input id="m_fda"></div>
<div class="wide"><button class="primary" onclick="saveMaterial()">Save</button></div></div>`);}
async function saveMaterial(){await api("/api/materials",{method:"POST",body:{material_code:$("m_code").value,trade_name:$("m_trade").value,ingredient_name:$("m_ing").value||null,halal:$("m_halal").value==="true",specification_ref:$("m_spec").value||null,fda_ref:$("m_fda").value||null}});closeModal();toast("เพิ่มวัตถุดิบแล้ว");renderMaterials();}

async function renderSuppliers(){
  cache.suppliers=await api("/api/suppliers");
  const rows=cache.suppliers.map(x=>`<tr><td>${esc(x.supplier_code)}</td><td>${esc(x.name)}</td><td>${esc(x.country||"-")}</td><td>${esc(x.contact_name||"-")}</td></tr>`);
  $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="Search supplier..." oninput="filterTable(this)"><button class="primary" onclick="supplierForm()">+ Supplier</button></div>${table(["Code","Supplier","Country","Contact"],rows)}</div>`;
}
function supplierForm(){openModal("New Supplier",`<div class="form-grid"><div><label>Supplier Code</label><input id="s_code" placeholder="ให้ใส่ Data"></div><div><label>Name</label><input id="s_name" placeholder="ให้ใส่ Data"></div><div><label>Country</label><input id="s_country"></div><div class="wide"><button class="primary" onclick="saveSupplier()">Save</button></div></div>`)}
async function saveSupplier(){await api("/api/suppliers",{method:"POST",body:{supplier_code:$("s_code").value,name:$("s_name").value,country:$("s_country").value||null}});closeModal();toast("เพิ่ม Supplier แล้ว");renderSuppliers();}

async function renderFormulas(){
  cache.formulas=await api("/api/ui/formulas");
  const rows=cache.formulas.map(x=>`<tr><td><span class="link" onclick="finalFormulaDetail(${x.latest_revision_id})">${esc(x.formula_no)}</span></td><td>${esc(x.formula_name||"-")}</td><td>${x.project_id}</td><td>Rev.${x.latest_revision_no??"-"}</td><td>${statusBadge(x.latest_revision_status||x.status)}</td><td>${me.can_view_pricing?money(x.latest_cost):"Restricted"}</td><td><button onclick="newRevision(${x.id})">+ Revision</button></td></tr>`);
  $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="Search formula..." oninput="filterTable(this)"><button class="primary" onclick="formulaForm()">+ Formula</button></div>${table(["Formula","Name","Project","Latest Rev","Status","Cost/Unit","Action"],rows)}</div>`;
}
async function formulaForm(){
  const projects=await api("/api/projects");
  openModal("New Formula",`<div class="form-grid"><div><label>Formula No.</label><input id="fm_no" placeholder="ให้ใส่ Data"></div><div><label>Project</label><select id="fm_project">${projects.map(p=>`<option value="${p.id}">${esc(p.project_no)} - ${esc(p.product_name)}</option>`)}</select></div><div class="wide"><label>Formula Name</label><input id="fm_name"></div><div class="wide"><button class="primary" onclick="saveFormula()">Create Formula</button></div></div>`);
}
async function saveFormula(){await api("/api/formulas",{method:"POST",body:{formula_no:$("fm_no").value,project_id:Number($("fm_project").value),formula_name:$("fm_name").value||null}});closeModal();toast("สร้าง Formula แล้ว");renderFormulas();}
function newRevision(id){openModal("New Formula Revision",`<div class="form-grid"><div><label>Revision No.</label><input id="rv_no" type="number" min="0"></div><div><label>Selling Price / Unit</label><input id="rv_sell" type="number" step="0.0001"></div><div class="wide"><label>Reason</label><textarea id="rv_reason"></textarea></div><div class="wide"><label>Customer Feedback</label><textarea id="rv_feedback"></textarea></div><div class="wide"><button class="primary" onclick="saveRevision(${id})">Create Revision</button></div></div>`)}
async function saveRevision(id){await api(`/api/formulas/${id}/revisions`,{method:"POST",body:{revision_no:Number($("rv_no").value),reason:$("rv_reason").value||null,customer_feedback:$("rv_feedback").value||null,selling_price_per_unit:$("rv_sell").value||0}});closeModal();toast("สร้าง Revision แล้ว");formulaDetail(id);}
async function formulaDetail(id){
  const f=cache.formulas.find(x=>x.id===id) || {formula_no:"Formula"};
  const revs=await api(`/api/ui/formulas/${id}/revisions`);
  const rows=revs.map(r=>`<tr><td>Rev.${r.revision_no}</td><td>${statusBadge(r.status)}</td><td>${r.total_weight_mg}</td><td>${me.can_view_pricing?money((Number(r.ingredient_cost_per_unit||0)+Number(r.packaging_cost_per_unit||0))):"Restricted"}</td><td>${(r.diff||[]).map(d=>`<div class="diff-red">${esc(d.change)} material #${d.material_id} ${(d.fields||[]).join(", ")}</div>`).join("")||"-"}</td><td class="mini-actions"><button onclick="addFormulaItem(${r.id})">+ Ingredient</button>${["RD_HEAD","ADMIN"].includes(me.role)&&r.status!=="APPROVED"?`<button onclick="approveRevision(${r.id},${id})">Approve</button>`:""}</td></tr>`);
  openModal(`${esc(f.formula_no)} — Revisions`,`${table(["Revision","Status","Weight mg","Cost/Unit","Changes","Action"],rows)}`);
}
async function addFormulaItem(revisionId){
  const [materials,suppliers]=await Promise.all([api("/api/materials"),api("/api/suppliers")]);
  openModal("Add Formula Ingredient",`<div class="form-grid">
  <div><label>Material</label><select id="fi_mat">${materials.map(m=>`<option value="${m.id}">${esc(m.material_code)} - ${esc(m.trade_name)}</option>`)}</select></div>
  <div><label>Supplier</label><select id="fi_sup"><option value="">ไม่ระบุ</option>${suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`)}</select></div>
  <div><label>Dose (mg)</label><input id="fi_dose" type="number" step="0.001"></div>
  <div><label>Price/kg</label><input id="fi_price" type="number" step="0.01" placeholder="ใช้เมื่อเชื่อม Supplier ใหม่"></div>
  <div class="wide"><label>Note</label><input id="fi_note"></div>
  <div class="wide"><button class="primary" onclick="saveFormulaItem(${revisionId})">Add Ingredient</button></div></div>`);
}
async function saveFormulaItem(revisionId){
  const materialId=Number($("fi_mat").value), supplierId=$("fi_sup").value?Number($("fi_sup").value):null;
  let linkId=null;
  if(supplierId){
    const link=await api("/api/material-suppliers",{method:"POST",body:{material_id:materialId,supplier_id:supplierId,price_per_kg:$("fi_price").value||0,currency:"THB",is_preferred:true}});
    linkId=link.id;
  }
  await api(`/api/revisions/${revisionId}/items`,{method:"POST",body:{material_id:materialId,material_supplier_id:linkId,dose_mg:$("fi_dose").value,note:$("fi_note").value||null}});
  closeModal();toast("เพิ่ม Ingredient แล้ว");renderFormulas();
}
async function approveRevision(rid,fid){await api(`/api/revisions/${rid}/approve`,{method:"POST"});toast("Approved");formulaDetail(fid);}

async function renderTesters(){
 const rowsData=await api("/api/ui/tester-requests");
 const rows=rowsData.map(x=>`<tr><td>${esc(x.tester_no)}</td><td>${esc(x.quotation_no||"-")}</td><td>${x.quantity}</td><td>${x.requested_date}</td><td>${x.delivery_date||"-"}</td><td>${statusBadge(x.delivery_status)}</td><td>${me.can_view_pricing?money(x.tester_cost):"Restricted"}</td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="Search tester..." oninput="filterTable(this)"><button class="primary" onclick="testerForm()">+ Tester Request</button></div>${table(["Tester","Quotation","Qty","Requested","Delivery","Status","Cost"],rows)}</div>`;
}
async function testerForm(){
 const [projects,formulas]=await Promise.all([api("/api/projects"),api("/api/ui/formulas")]);
 const revOptions=[];
 for(const f of formulas){ if(f.latest_revision_id) revOptions.push(`<option value="${f.latest_revision_id}" data-project="${f.project_id}">${esc(f.formula_no)} Rev.${f.latest_revision_no}</option>`); }
 openModal("New Tester Request",`<div class="form-grid">
 <div><label>Tester No.</label><input id="t_no" placeholder="ให้ใส่ Data"></div><div><label>Project</label><select id="t_project">${projects.map(p=>`<option value="${p.id}">${esc(p.project_no)} - ${esc(p.product_name)}</option>`)}</select></div>
 <div><label>Formula Revision</label><select id="t_rev">${revOptions.join("")}</select></div><div><label>Quotation No.</label><input id="t_quote"></div>
 <div><label>Quantity</label><input id="t_qty" type="number" value="1"></div><div><label>Tester Type</label><select id="t_type"><option>FREE</option><option>PAID</option></select></div>
 <div><label>Requested Date</label><input id="t_reqdate" type="date"></div><div><label>Delivery Date</label><input id="t_delivery" type="date"></div>
 <div><label>Packaging</label><input id="t_pack"></div><div><label>Receipt No.</label><input id="t_receipt"></div>
 <div class="wide"><label>Customer Need</label><textarea id="t_need"></textarea></div>
 <div class="wide"><button class="primary" onclick="saveTester()">Create Tester</button></div></div>`);
}
async function saveTester(){
 await api("/api/tester-requests",{method:"POST",body:{
 tester_no:$("t_no").value,project_id:Number($("t_project").value),formula_revision_id:Number($("t_rev").value),quotation_no:$("t_quote").value||null,
 receipt_no:$("t_receipt").value||null,customer_need:$("t_need").value||null,packaging:$("t_pack").value||null,quantity:Number($("t_qty").value),
 requested_date:$("t_reqdate").value||new Date().toISOString().slice(0,10),delivery_date:$("t_delivery").value||null,tester_type:$("t_type").value
 }});closeModal();toast("สร้าง Tester Request แล้ว");renderTesters();
}

async function renderRates(){
 const data=await api("/api/ui/rate-requests");
 const rows=data.map(x=>`<tr><td>${esc(x.rate_no)}</td><td>${esc(x.product_name||"-")}</td><td>${esc(x.quotation_no||"-")}</td><td>${statusBadge(x.status)}</td><td>${x.rd_head_approved?"✓":"-"}</td><td>${x.sales_approved?"✓":"-"}</td><td>${me.can_view_pricing?(x.tiers||[]).map(t=>`${t.quantity}: ${money(t.selling_price_per_unit)}`).join("<br>"):"Restricted"}</td><td class="mini-actions">${["RD_HEAD","ADMIN"].includes(me.role)&&!x.rd_head_approved?`<button onclick="approveRateRD(${x.id})">RD Approve</button>`:""}${["SALES","ADMIN"].includes(me.role)&&x.rd_head_approved&&!x.sales_approved?`<button onclick="approveRateSales(${x.id})">Sales Approve</button>`:""}</td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="Search rate..." oninput="filterTable(this)"><button class="primary" onclick="rateForm()">+ Rate Request</button></div>${table(["Rate","Product","Quotation","Status","RD","Sales","Selling Tiers","Action"],rows)}</div>`;
}
async function rateForm(){
 const [projects,formulas]=await Promise.all([api("/api/projects"),api("/api/ui/formulas")]);
 const rev=formulas.filter(f=>f.latest_revision_id).map(f=>`<option value="${f.latest_revision_id}">${esc(f.formula_no)} Rev.${f.latest_revision_no}</option>`);
 openModal("New Rate Request",`<div class="form-grid"><div><label>Rate No.</label><input id="r_no" placeholder="ให้ใส่ Data"></div><div><label>Project</label><select id="r_project">${projects.map(p=>`<option value="${p.id}">${esc(p.project_no)} - ${esc(p.product_name)}</option>`)}</select></div>
 <div><label>Formula Revision</label><select id="r_rev">${rev.join("")}</select></div><div><label>Quotation No.</label><input id="r_quote"></div><div><label>Product</label><input id="r_product"></div>
 <div><label>Margin %</label><input id="r_margin" type="number" value="30"></div><div class="wide"><label>Quantities (comma separated)</label><input id="r_qtys" value="1000,5000,10000"></div>
 <div class="wide"><button class="primary" onclick="saveRate()">Calculate & Create</button></div></div>`);
}
async function saveRate(){
 const tiers=$("r_qtys").value.split(",").map(x=>x.trim()).filter(Boolean).map(q=>({quantity:Number(q),margin_percent:Number($("r_margin").value||30)}));
 await api("/api/rate-requests",{method:"POST",body:{rate_no:$("r_no").value,project_id:Number($("r_project").value),formula_revision_id:Number($("r_rev").value),quotation_no:$("r_quote").value||null,product_name:$("r_product").value||null,tiers}});
 closeModal();toast("สร้าง Rate Request แล้ว");renderRates();
}
async function approveRateRD(id){await api(`/api/rate-requests/${id}/approve-rd`,{method:"POST"});toast("R&D approved");renderRates();}
async function approveRateSales(id){await api(`/api/rate-requests/${id}/approve-sales`,{method:"POST"});toast("Sales approved");renderRates();}

async function renderInventory(){
 const data=await api("/api/ui/stocks");
 const rows=data.map(x=>`<tr><td>${esc(x.material_code||"-")}</td><td>${esc(x.material_name||"-")}</td><td>${esc(x.warehouse)}</td><td>${x.on_hand_kg}</td><td>${x.reserved_kg}</td><td>${x.available_kg}</td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="Search stock..." oninput="filterTable(this)">${["ADMIN","PLANNING","RD_HEAD"].includes(me.role)?'<button class="primary" onclick="stockForm()">Set Stock</button>':""}</div>${table(["Code","Material","Warehouse","On Hand kg","Reserved kg","Available kg"],rows)}</div>`;
}
async function stockForm(){const mats=await api("/api/materials");openModal("Set Inventory Stock",`<div class="form-grid"><div><label>Material</label><select id="st_mat">${mats.map(m=>`<option value="${m.id}">${esc(m.material_code)} - ${esc(m.trade_name)}</option>`)}</select></div><div><label>Warehouse</label><input id="st_wh" value="MAIN"></div><div><label>On Hand kg</label><input id="st_on" type="number" step="0.001"></div><div><label>Reserved kg</label><input id="st_res" type="number" step="0.001" value="0"></div><div class="wide"><button class="primary" onclick="saveStock()">Save Stock</button></div></div>`)}
async function saveStock(){await api("/api/inventory/stock",{method:"POST",body:{material_id:Number($("st_mat").value),warehouse:$("st_wh").value,on_hand_kg:$("st_on").value||0,reserved_kg:$("st_res").value||0}});closeModal();toast("บันทึก Stock แล้ว");renderInventory();}

async function renderProduction(){
 const data=await api("/api/ui/production-orders");cache.productionOrders=data;
 const rows=data.map(x=>`<tr><td>${esc(x.production_order_no)}</td><td>${x.ordered_quantity}</td><td>${x.planned_quantity}</td><td>${x.waste_percent}%</td><td>${statusBadge(x.status)}</td><td>${statusBadge(x.planning_status)}</td><td class="mini-actions"><button onclick="showMRP(${x.id})">MRP</button>${["RD_HEAD","ADMIN"].includes(me.role)&&x.planning_status==="NOT_SENT"?`<button onclick="sendPlanning(${x.id})">Send Planning</button>`:""}</td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><div class="actions"><button class="primary" onclick="prodFormulaForm()">+ Production Formula</button><button class="secondary" onclick="productionOrderForm()">+ Production Order</button></div></div>${table(["PO","Order Qty","Planned Qty","Waste","Status","Planning","Action"],rows)}</div>`;
}
async function prodFormulaForm(){
 const fs=await api("/api/ui/formulas");const opts=fs.filter(f=>f.latest_revision_id&&f.latest_revision_status==="APPROVED").map(f=>`<option value="${f.latest_revision_id}">${esc(f.formula_no)} Rev.${f.latest_revision_no}</option>`);
 openModal("Create Production Formula",`<div class="form-grid"><div><label>Production Formula No.</label><input id="pf_no"></div><div><label>Approved Revision</label><select id="pf_rev">${opts.join("")}</select></div><div><label>Version</label><input id="pf_ver" type="number" value="1"></div><div class="wide"><button class="primary" onclick="saveProdFormula()">Create Locked Formula</button></div></div>`);
}
async function saveProdFormula(){await api("/api/production-formulas",{method:"POST",body:{production_formula_no:$("pf_no").value,source_formula_revision_id:Number($("pf_rev").value),version_no:Number($("pf_ver").value)}});closeModal();toast("สร้าง Production Formula แล้ว");renderProduction();}
async function productionOrderForm(){
 const pfs=await api("/api/ui/production-formulas");
 openModal("Create Production Order",`<div class="form-grid"><div><label>Production Order No.</label><input id="po_no"></div><div><label>Production Formula</label><select id="po_pf">${pfs.map(x=>`<option value="${x.id}">${esc(x.production_formula_no)} v${x.version_no}</option>`)}</select></div><div><label>Ordered Quantity</label><input id="po_qty" type="number"></div><div><label>Waste %</label><input id="po_waste" type="number" value="5"></div><div class="wide"><button class="primary" onclick="saveProductionOrder()">Create Production Order</button></div></div>`);
}
async function saveProductionOrder(){await api("/api/production-orders",{method:"POST",body:{production_order_no:$("po_no").value,production_formula_id:Number($("po_pf").value),ordered_quantity:Number($("po_qty").value),waste_percent:Number($("po_waste").value||5),unit_name:"unit"}});closeModal();toast("สร้าง Production Order แล้ว");renderProduction();}
async function showMRP(id){const d=await api(`/api/ui/mrp/${id}`);const rows=d.materials.map(x=>`<tr><td>${esc(x.material_code||"-")}</td><td>${esc(x.material_name||"-")}</td><td>${x.required_kg}</td><td>${x.available_kg}</td><td class="${Number(x.shortage_kg)>0?'diff-red':''}">${x.shortage_kg}</td><td>${statusBadge(x.status)}</td></tr>`);openModal(`MRP — Production Order #${id}`,`${table(["Code","Material","Required kg","Available kg","Shortage kg","Status"],rows)}`);}
async function sendPlanning(id){await api(`/api/production-orders/${id}/send-planning?note=Sent%20from%20ERP%20UI`,{method:"POST"});toast("ส่งให้ Planning แล้ว");renderProduction();}

async function renderAI(){
 const d=await api("/api/ai/insights");
 $("pageContent").innerHTML=`<div class="grid2"><div class="card"><h3>AI-ready Summary</h3><div class="insight">${esc(d.summary)}</div>
 <div class="insight ${d.tester_overdue?.length?'bad':''}"><b>Tester Overdue</b><br>${(d.tester_overdue||[]).map(esc).join(", ")||"ไม่มี"}</div>
 <div class="insight ${d.tester_due_within_3_days?.length?'warn':''}"><b>Due within 3 days</b><br>${(d.tester_due_within_3_days||[]).map(esc).join(", ")||"ไม่มี"}</div></div>
 <div class="card"><h3>AI Integration Status</h3><p>ตอนนี้เป็น deterministic insight layer จากข้อมูล ERP จริง เพื่อให้ผลลัพธ์เชื่อถือได้ก่อนต่อ LLM.</p>
 <p>ขั้นต่อไปสามารถต่อ AI Chat ให้ถาม “สูตรไหนยังไม่อนุมัติ?”, “วัตถุดิบไหนขาด?”, “Tester ไหนใกล้ครบกำหนด?” โดยคง Role Permission เดิม</p></div></div>`;
}

// --- Cross-department work handoff (Phase 5): any department can send a
// general note + optional reference to any other department's inbox. ---
async function refreshWorkInboxBadge(){
  try{
    const x=await api("/api/work-handoffs/unread-count");
    const el=$("workInboxBadge");
    if(!el)return;
    if(x.count>0){el.textContent=String(x.count);el.classList.remove("hidden");}
    else{el.classList.add("hidden");}
  }catch(_){/* badge is best-effort */}
}

function handoffCard(x,mode){
  const statusLabel={SENT:"ส่งแล้ว",RECEIVED:"รับทราบแล้ว",DONE:"เสร็จแล้ว"}[x.status]||x.status;
  const dirLabel=mode==="inbox"?`จาก ${esc(x.from_department)} (${esc(x.from_user_name||"-")})`:`ถึง ${esc(x.to_department)}`;
  const actions = mode==="inbox"
    ? (x.status==="SENT" ? `<button class="primary" onclick="markHandoffReceived(${x.id})">รับทราบ</button>`
      : x.status==="RECEIVED" ? `<button class="primary" onclick="markHandoffDone(${x.id})">เสร็จแล้ว</button>`
      : "")
    : "";
  return `<div class="handoff-card">
    <div class="handoff-head"><b>${esc(x.subject)}</b>${statusBadge(x.status)}</div>
    <div class="handoff-meta">${dirLabel} • ${new Date(x.created_at).toLocaleString()}${x.reference?` • อ้างอิง: ${esc(x.reference)}`:""}</div>
    ${x.message?`<div class="handoff-message">${esc(x.message)}</div>`:""}
    <div class="handoff-actions">${actions}</div>
  </div>`;
}

async function renderWorkInbox(){
  const [inboxRows,sentRows]=await Promise.all([
    api("/api/work-handoffs/inbox"),
    api("/api/work-handoffs/sent")
  ]);
  const inboxHtml=inboxRows.length ? inboxRows.map(x=>handoffCard(x,"inbox")).join("") : '<div class="empty">ยังไม่มีงานส่งเข้ามา</div>';
  const sentHtml=sentRows.length ? sentRows.map(x=>handoffCard(x,"sent")).join("") : '<div class="empty">ยังไม่ได้ส่งงานออกไป</div>';
  $("pageContent").innerHTML=`
    <div class="card"><div class="toolbar"><h3>กล่องขาเข้า</h3><button class="primary" onclick="sendWorkForm()">+ ส่งงานไปแผนกอื่น</button></div>${inboxHtml}</div>
    <div class="card"><h3>ที่ส่งไปแล้ว</h3>${sentHtml}</div>
  `;
  refreshWorkInboxBadge();
}

async function markHandoffReceived(id){
  try{await api(`/api/work-handoffs/${id}/receive`,{method:"POST"});toast("รับทราบงานแล้ว");await renderWorkInbox();}
  catch(e){toast("ไม่สำเร็จ: "+(e?.message||e));}
}
async function markHandoffDone(id){
  try{await api(`/api/work-handoffs/${id}/done`,{method:"POST"});toast("ทำเครื่องหมายเสร็จแล้ว");await renderWorkInbox();}
  catch(e){toast("ไม่สำเร็จ: "+(e?.message||e));}
}

async function sendWorkForm(){
  let depts;
  try{depts=await api("/api/work-handoffs/departments");}
  catch(e){toast("โหลดรายชื่อแผนกไม่สำเร็จ: "+(e?.message||e));return;}
  // Own department is excluded -- sending work to yourself doesn't mean
  // anything (this is why it also never appears while testing under the
  // admin/whichever account is currently logged in: it's that account's
  // own department being left out, not a bug).
  const checkboxes=depts.departments.filter(d=>d!==depts.own_department)
    .map(d=>`<label class="wh-dept-check"><input type="checkbox" value="${d}">${d}</label>`).join("");
  openModal("ส่งงานไปแผนกอื่น",`<div class="form-grid">
    <div class="wide"><label>ส่งถึงแผนก (เลือกได้หลายแผนก)</label><div class="wh-dept-checkboxes">${checkboxes}</div></div>
    <div class="wide"><label>หัวข้องาน</label><input id="wh_subject" placeholder="เช่น ขอซื้อวัตถุดิบ Vitamin C 50kg"></div>
    <div class="wide"><label>รายละเอียด</label><textarea id="wh_message" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"></textarea></div>
    <div class="wide"><label>อ้างอิงเอกสาร (ถ้ามี)</label><input id="wh_reference" list="whReferenceList" placeholder="พิมพ์เลขที่รายการ เช่น F-RD-002-001, PO-12345" oninput="searchWorkHandoffReference(this)"><datalist id="whReferenceList"></datalist></div>
    <div class="wide"><button class="primary" onclick="saveWorkHandoff()">ส่งงาน</button></div>
  </div>`);
}

let whReferenceSearchSeq=0;
async function searchWorkHandoffReference(inp){
  const q=(inp.value||"").trim();
  if(q.length<1){$("whReferenceList").innerHTML="";return;}
  const seq=++whReferenceSearchSeq;
  try{
    const rows=await api(`/api/work-handoffs/reference-search?q=${encodeURIComponent(q)}`);
    if(seq!==whReferenceSearchSeq)return; // a newer keystroke's search already landed
    $("whReferenceList").innerHTML=rows.map(r=>`<option value="${esc(r.value)}">${esc(r.label)}</option>`).join("");
  }catch(e){
    // Typeahead failing silently is fine -- the field still works as
    // plain free text, this is just a convenience.
  }
}

async function saveWorkHandoff(){
  const subject=$("wh_subject").value.trim();
  if(!subject){toast("กรุณาใส่หัวข้องาน");return;}
  const to_departments=[...document.querySelectorAll(".wh-dept-checkboxes input:checked")].map(e=>e.value);
  if(!to_departments.length){toast("กรุณาเลือกแผนกปลายทางอย่างน้อย 1 แผนก");return;}
  try{
    await api("/api/work-handoffs",{method:"POST",body:{
      to_departments,
      subject,
      message:$("wh_message").value.trim()||null,
      reference:$("wh_reference").value.trim()||null
    }});
    closeModal();
    toast(to_departments.length>1?`ส่งงานไปยัง ${to_departments.length} แผนกแล้ว`:"ส่งงานแล้ว");
    if(currentPage==="workInbox")await renderWorkInbox();
  }catch(e){toast("ส่งงานไม่สำเร็จ: "+(e?.message||e));}
}

// ============================================================
// Purchase Order (ใบสั่งซื้อ, PURCHASE -> external supplier) and
// Purchase Request (ใบขอซื้อ / PR, STOCK -> PURCHASE). Department-shared
// documents (like Customers/Suppliers), not private per-person drafts like
// the F-RD-* exact forms -- so they use their own /api/purchase-docs
// endpoints rather than the X-Person-Key-scoped source-forms ones.
// ============================================================

// Standard Thai baht-text conversion, e.g. 1605 -> "หนึ่งพันหกร้อยห้าบาทถ้วน".
function thaiBahtText(amount){
  amount=Math.round((Number(amount)||0)*100)/100;
  const isNeg=amount<0;
  amount=Math.abs(amount);
  const baht=Math.floor(amount);
  const satang=Math.round((amount-baht)*100);
  const digitThai=["","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"];
  const positionThai=["","สิบ","ร้อย","พัน","หมื่น","แสน"];
  function convert(numStr){
    numStr=String(numStr).replace(/^0+(?=\d)/,"");
    if(numStr==="0"||numStr==="")return "ศูนย์";
    let result="";
    const len=numStr.length;
    for(let i=0;i<len;i++){
      const digit=Number(numStr[i]);
      const pos=len-i-1; // 0 = rightmost (units) digit of the whole number
      const posInGroup=pos%6;
      if(digit===0)continue;
      if(posInGroup===1 && digit===2){result+="ยี่";}
      else if(posInGroup===1 && digit===1){/* "สิบ" alone */}
      else if(posInGroup===0 && digit===1 && pos===0 && len>1){result+="เอ็ด";}
      else{result+=digitThai[digit];}
      result+=positionThai[posInGroup];
      if(pos>0 && pos%6===0)result+="ล้าน";
    }
    return result;
  }
  let text=convert(baht)+"บาท";
  text += satang===0 ? "ถ้วน" : convert(String(satang).padStart(2,"0"))+"สตางค์";
  return (isNeg?"ลบ":"")+text;
}

// Generic Excel-like keyboard navigation for a table of inputs marked with
// data-row/data-col. Arrow keys move focus in that direction; Enter moves
// down a row (the common spreadsheet convention). Left/Right only hijack
// the arrow when the caret is already at that edge of the text, so normal
// in-text cursor movement still works. Skips <select> elements so their
// native arrow-key behavior (changing the selected option) isn't broken.
function purchaseDocKeyNav(e){
  const t=e.target;
  if(!t.dataset || t.dataset.row===undefined || t.dataset.col===undefined)return;
  const row=Number(t.dataset.row), col=Number(t.dataset.col);
  let nr=row, nc=col;
  if(e.key==="ArrowDown"||e.key==="Enter"){nr=row+1;}
  else if(e.key==="ArrowUp"){nr=row-1;}
  else if(e.key==="ArrowRight"){
    if(t.tagName==="SELECT")return;
    if(t.selectionStart!==t.selectionEnd || t.selectionStart!==t.value.length)return;
    nc=col+1;
  }else if(e.key==="ArrowLeft"){
    if(t.tagName==="SELECT")return;
    if(t.selectionStart!==t.selectionEnd || t.selectionStart!==0)return;
    nc=col-1;
  }else return;
  const next=document.querySelector(`.purchase-doc-grid [data-row="${nr}"][data-col="${nc}"]`);
  if(next){e.preventDefault();next.focus();if(next.select)next.select();}
}

// Excel-style keyboard navigation for every "exact form" grid (F-RD-001,
// F-RD-002, F-RD-002.1, F-RD-003, F-RD-004, ADMIN-QP, ADMIN-INVOICE):
// arrow keys move to the nearest editable cell in that direction (by
// actual on-screen position, so merged cells, hidden/appended rows, and
// irregular column widths are all handled the same way real Excel would),
// Enter moves down. Delegated on document (not wired per-input) so it
// survives every re-render -- openPrivateExactForm() replaces
// #pageContent's innerHTML on every open/save/reload, and there are many
// separate places that generate an .excel-input (exactInput(),
// manualInputForCell(), formulaAutoInputForCell(), the dynamic
// ingredient-row renderers, ...) -- delegation covers all of them without
// having to wire onkeydown into each one individually.
// PO/PR (.purchase-doc-grid) already has its own simpler row/col-based
// nav (purchaseDocKeyNav above) and is explicitly skipped here.
document.addEventListener("keydown",function(e){
  const t=e.target;
  if(!t.classList || !t.classList.contains("excel-input"))return;
  if(t.closest(".purchase-doc-grid"))return;
  const sheet=t.closest(".excel-sheet");
  if(!sheet)return;
  const tag=t.tagName;
  if(tag==="SELECT")return; // let native up/down/left/right change the selected option

  let dir=null;
  if(e.key==="ArrowDown"){dir="down";}
  else if(e.key==="ArrowUp"){dir="up";}
  else if(e.key==="ArrowRight"){
    if(t.selectionStart!==t.selectionEnd || t.selectionStart!==String(t.value||"").length)return;
    dir="right";
  }else if(e.key==="ArrowLeft"){
    if(t.selectionStart!==t.selectionEnd || t.selectionStart!==0)return;
    dir="left";
  }else if(e.key==="Enter"){
    if(tag==="TEXTAREA")return; // let Enter insert a newline in multi-line fields (e.g. QP notes)
    dir="down";
  }else return;

  const candidates=[...sheet.querySelectorAll(".excel-input")].filter(el=>el!==t && !el.disabled && !el.readOnly);
  if(!candidates.length)return;

  const r0=t.getBoundingClientRect();
  const cx=r0.left+r0.width/2, cy=r0.top+r0.height/2;
  let best=null,bestScore=Infinity;
  for(const el of candidates){
    const r=el.getBoundingClientRect();
    const ex=r.left+r.width/2, ey=r.top+r.height/2;
    const dx=ex-cx, dy=ey-cy;
    let primary,cross;
    if(dir==="down"){ if(dy<=2)continue; primary=dy; cross=Math.abs(dx); }
    else if(dir==="up"){ if(dy>=-2)continue; primary=-dy; cross=Math.abs(dx); }
    else if(dir==="right"){ if(dx<=2)continue; primary=dx; cross=Math.abs(dy); }
    else{ if(dx>=-2)continue; primary=-dx; cross=Math.abs(dy); }
    // Prefer the closest cell mostly in-line with the current one (small
    // cross-axis distance), then the nearest along the travel direction.
    const score=cross*3+primary;
    if(score<bestScore){bestScore=score;best=el;}
  }
  if(best){
    e.preventDefault();
    best.focus();
    if(best.select && best.tagName!=="SELECT")best.select();
  }
});

const PURCHASE_DOC_ROW_COUNT=12;

async function loadPurchaseDocAssets(){
  if(!window.supplementCodeData) try{window.supplementCodeData=await api("/api/fda-materials/catalog/live")}catch{window.supplementCodeData=[]}
  if(!window.supplierListCache) try{window.supplierListCache=await api("/api/suppliers")}catch{window.supplierListCache=[]}
  if(!window.productionOrderCache) try{window.productionOrderCache=await api("/api/ui/production-orders")}catch{window.productionOrderCache=[]}
}

function purchaseDocCell(row,col,attrs,value=""){
  return `<input class="excel-input" data-row="${row}" data-col="${col}" ${attrs||""} value="${esc(value)}" onkeydown="purchaseDocKeyNav(event)">`;
}

async function openPurchaseDocForm(docType,existingId=null){
  await loadPurchaseDocAssets();
  window.currentPurchaseDoc=docType;
  window.editingPurchaseDocId=existingId;
  let existing=null;
  if(existingId){
    try{existing=await api(`/api/purchase-docs/record/${existingId}`);}catch(e){toast("โหลดข้อมูลไม่สำเร็จ: "+(e?.message||e));}
  }
  const d=existing?.data||{};
  const items=Array.isArray(d.items)?d.items:[];

  const supplierOptions=(window.supplierListCache||[]).map(s=>`<option value="${esc(s.supplier_code||"")}">${esc(s.name)}</option>`).join("");
  const materialOptions=(window.supplementCodeData||[]).map(m=>`<option value="${esc(m.code)}">${esc(m.name)}</option>`).join("");
  const poOptions=(window.productionOrderCache||[]).map(p=>`<option value="${esc(p.production_order_no)}"></option>`).join("");

  $("pageTitle").textContent=docType==="PO"?"ใบสั่งซื้อ (Purchase Order)":"ใบขอซื้อ (Purchase Request; PR)";
  $("pageSubtitle").textContent=docType==="PO"?"จัดซื้อ → ผู้จำหน่ายภายนอก":"คลังสินค้า → จัดซื้อ";

  let rows="";
  const rowCount=Math.max(PURCHASE_DOC_ROW_COUNT,items.length);

  if(docType==="PO"){
    for(let r=0;r<rowCount;r++){
      const it=items[r]||{};
      rows+=`<tr>
        <td class="col-no">${r+1}</td>
        <td>${purchaseDocCell(r,0,'data-sub="description" placeholder="รายละเอียดสินค้า"',it.description)}</td>
        <td>${purchaseDocCell(r,1,'data-sub="quantity" type="number" step="any" oninput="recalcPurchaseDocTotals()"',it.quantity)}</td>
        <td>${purchaseDocCell(r,2,'data-sub="unit" placeholder="หน่วย เช่น Kg."',it.unit)}</td>
        <td>${purchaseDocCell(r,3,'data-sub="unit_price" type="number" step="any" oninput="recalcPurchaseDocTotals()"',it.unit_price)}</td>
        <td><input class="excel-input po-row-amount" data-row="${r}" data-col="4" data-sub="amount" readonly tabindex="-1" value="${esc(it.amount||"")}"></td>
      </tr>`;
    }
    $("pageContent").innerHTML=`
      <div class="exact-form-toolbar">
        <div><b>ใบสั่งซื้อ ${existing?`#${esc(existing.doc_no)}`:"(ฉบับใหม่)"}</b><small>ใช้ลูกศร ↑↓←→ และ Enter เพื่อย้ายช่องได้เหมือน Excel</small></div>
        <div class="actions">
          <button onclick="listPurchaseDocs('PO')">รายการใบสั่งซื้อทั้งหมด</button>
          ${existing?`<button onclick="exportPurchaseDocExcel(${existing.id})">Excel</button><button onclick="showRecordVersions('purchase_doc',${existing.id})">ประวัติ</button>`:""}
          <button class="primary" onclick="savePurchaseDoc('PO')">บันทึก</button>
        </div>
      </div>
      <div class="card purchase-doc-grid">
        <div class="form-grid">
          <div><label>เลขที่</label><input id="po_no" value="${esc(existing?.doc_no||"")}" placeholder="PO2026080111"></div>
          <div><label>วันที่</label><input id="po_date" type="date" value="${esc(d.date||currentDateISO())}"></div>
          <div><label>ครบกำหนด</label><input id="po_due_date" type="date" value="${esc(d.due_date||"")}"></div>
          <div><label>ผู้สั่งซื้อ</label><input id="po_buyer_name" value="${esc(d.buyer_name||"Lifeplus Pharmaceutical")}"></div>
          <div><label>อ้างอิง (เลขที่ PR)</label><input id="po_reference" value="${esc(existing?.linked_reference||d.reference||"")}" placeholder="PR-IC6908-220"></div>
          <div><label>ผู้ติดต่อ</label><input id="po_contact_person" value="${esc(d.contact_person||"")}"></div>
          <div><label>รหัสผู้จำหน่าย</label><input id="po_supplier_code" list="poSupplierList" value="${esc(d.supplier_code||"")}" oninput="linkPurchaseDocSupplier(this)"></div>
          <div><label>เบอร์โทร</label><input id="po_contact_phone" value="${esc(d.contact_phone||"")}"></div>
          <div class="wide"><label>ผู้จำหน่าย</label><input id="po_supplier_name" value="${esc(d.supplier_name||"")}"></div>
          <div class="wide"><label>ที่อยู่ผู้จำหน่าย</label><input id="po_supplier_address" value="${esc(d.supplier_address||"")}"></div>
          <div><label>เลขประจำตัวผู้เสียภาษี</label><input id="po_supplier_tax_id" value="${esc(d.supplier_tax_id||"")}"></div>
        </div>
        <datalist id="poSupplierList">${supplierOptions}</datalist>

        <div class="table-wrap">
          <table class="purchase-doc-table">
            <colgroup><col style="width:5%"><col style="width:42%"><col style="width:10%"><col style="width:10%"><col style="width:16%"><col style="width:17%"></colgroup>
            <thead><tr><th>#</th><th>รายละเอียด</th><th>จำนวน</th><th>หน่วย</th><th>ราคาต่อหน่วย</th><th>ยอดรวม</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <div class="purchase-doc-totals">
          <div>รวมเป็นเงิน <b id="po_subtotal">0.00</b> บาท</div>
          <div>ภาษีมูลค่าเพิ่ม 7% <b id="po_vat">0.00</b> บาท</div>
          <div>จำนวนเงินรวมทั้งสิ้น <b id="po_grand_total">0.00</b> บาท</div>
          <div class="baht-text" id="po_baht_text">(ศูนย์บาทถ้วน)</div>
        </div>

        <div class="form-grid">
          <div><label>ผู้ซื้อ</label><input id="po_buyer_sign" value="${esc(d.buyer_sign||"")}"></div>
          <div><label>วันที่ (ผู้ซื้อ)</label><input id="po_buyer_sign_date" type="date" value="${esc(d.buyer_sign_date||"")}"></div>
          <div><label>ผู้อนุมัติ</label><input id="po_approver_sign" value="${esc(d.approver_sign||"")}"></div>
          <div><label>วันที่ (ผู้อนุมัติ)</label><input id="po_approver_sign_date" type="date" value="${esc(d.approver_sign_date||"")}"></div>
        </div>
      </div>
    `;
    setTimeout(recalcPurchaseDocTotals,0);
    return;
  }

  // PR (ใบขอซื้อ)
  for(let r=0;r<rowCount;r++){
    const it=items[r]||{};
    rows+=`<tr>
      <td class="col-no">${r+1}</td>
      <td>${purchaseDocCell(r,0,`data-sub="material_code" list="prMaterialList" placeholder="ค้นหารหัสสินค้า" oninput="linkPurchaseDocMaterial(this)"`,it.material_code)}</td>
      <td>${purchaseDocCell(r,1,'data-sub="description" placeholder="รายละเอียด"',it.description)}</td>
      <td>${purchaseDocCell(r,2,'data-sub="quantity" type="number" step="any"',it.quantity)}</td>
      <td>${purchaseDocCell(r,3,'data-sub="unit" placeholder="Kg"',it.unit)}</td>
      <td>${purchaseDocCell(r,4,'data-sub="production_order_no" list="prProductionOrderList" placeholder="เลขที่ใบสั่งผลิต"',it.production_order_no)}</td>
      <td>${purchaseDocCell(r,5,'data-sub="product_name" placeholder="ชื่อผลิตภัณฑ์/แผนก"',it.product_name)}</td>
      <td>${purchaseDocCell(r,6,'data-sub="po_no" placeholder="เลขที่ PO"',it.po_no)}</td>
      <td>${purchaseDocCell(r,7,'data-sub="note" placeholder="หมายเหตุ"',it.note)}</td>
      <td>${purchaseDocCell(r,8,'data-sub="received_date" type="date"',it.received_date)}</td>
    </tr>`;
  }
  $("pageContent").innerHTML=`
    <div class="exact-form-toolbar">
      <div><b>ใบขอซื้อ ${existing?`#${esc(existing.doc_no)}`:"(ฉบับใหม่)"}</b><small>ใช้ลูกศร ↑↓←→ และ Enter เพื่อย้ายช่องได้เหมือน Excel</small></div>
      <div class="actions">
        <button onclick="listPurchaseDocs('PR')">รายการใบขอซื้อทั้งหมด</button>
        ${existing?`<button onclick="exportPurchaseDocExcel(${existing.id})">Excel</button><button onclick="showRecordVersions('purchase_doc',${existing.id})">ประวัติ</button>`:""}
        <button class="primary" onclick="savePurchaseDoc('PR')">บันทึก</button>
      </div>
    </div>
    <div class="card purchase-doc-grid">
      <div class="form-grid">
        <div><label>เลขที่แบบฟอร์ม</label><input id="pr_form_no" value="${esc(d.form_no||"F-PU-001-01")}"></div>
        <div><label>แก้ไขครั้งที่</label><input id="pr_revision_no" value="${esc(d.revision_no||"00")}"></div>
        <div><label>เลขที่ PR</label><input id="pr_no" value="${esc(existing?.doc_no||"")}" placeholder="PR-IC6908-222"></div>
        <div><label>วันที่</label><input id="pr_date" type="date" value="${esc(d.date||currentDateISO())}"></div>
        <div><label>เวลา</label><input id="pr_time" type="time" value="${esc(d.time||"")}"></div>
        <div><label>เตรียมโดย</label><input id="pr_prepared_by" value="${esc(d.prepared_by||"")}"></div>
        <div><label>อนุมัติโดย</label><input id="pr_approved_by" value="${esc(d.approved_by||"")}"></div>
        <div class="wide"><label>อ้างอิงสูตร/ผลิตภัณฑ์</label><input id="pr_product_ref" value="${esc(d.product_ref||"")}" placeholder="P-C69-082#2 VITAOX PLUS ..."></div>
      </div>
      <datalist id="prMaterialList">${materialOptions}</datalist>
      <datalist id="prProductionOrderList">${poOptions}</datalist>

      <div class="table-wrap">
        <table class="purchase-doc-table">
          <colgroup><col style="width:4%"><col style="width:9%"><col style="width:22%"><col style="width:6%"><col style="width:6%"><col style="width:11%"><col style="width:14%"><col style="width:9%"><col style="width:11%"><col style="width:8%"></colgroup>
          <thead><tr><th>ลำดับ</th><th>รหัสสินค้า</th><th>รายละเอียด</th><th>จำนวน</th><th>หน่วย</th><th>เลขที่ใบสั่งผลิต</th><th>ชื่อผลิตภัณฑ์/แผนก</th><th>เลขที่ PO</th><th>หมายเหตุ</th><th>วันที่รับเข้า</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="purchase-doc-signatures">
        ${["requester:ผู้ขอซื้อ","warehouse_officer:จนท.คลังสินค้า","purchasing_officer:เจ้าหน้าที่จัดซื้อ","reviewer:ผู้ตรวจสอบ (ผจก.แผนก)","warehouse_manager:ผจก.คลังสินค้า"].map(spec=>{
          const [key,label]=spec.split(":");
          return `<div class="handoff-card"><label>${label}</label><input id="pr_sign_${key}" placeholder="ลงชื่อ" value="${esc(d[`sign_${key}`]||"")}"><input id="pr_sign_${key}_date" type="date" value="${esc(d[`sign_${key}_date`]||"")}"></div>`;
        }).join("")}
      </div>
    </div>
  `;
}

function currentDateISO(){return new Date().toISOString().slice(0,10);}

function linkPurchaseDocSupplier(inp){
  const code=(inp.value||"").trim();
  const s=(window.supplierListCache||[]).find(x=>String(x.supplier_code||"").toUpperCase()===code.toUpperCase());
  if(!s)return;
  const nameEl=$("po_supplier_name");
  if(nameEl && !nameEl.value)nameEl.value=s.name||"";
}

function linkPurchaseDocMaterial(inp){
  const code=(inp.value||"").trim();
  const m=(window.supplementCodeData||[]).find(x=>String(x.code||"").toUpperCase()===code.toUpperCase());
  if(!m)return;
  const row=inp.dataset.row;
  const descEl=document.querySelector(`.purchase-doc-grid [data-row="${row}"][data-sub="description"]`);
  if(descEl && !descEl.value)descEl.value=m.name||"";
}

function recalcPurchaseDocTotals(){
  if(window.currentPurchaseDoc!=="PO")return;
  let subtotal=0;
  document.querySelectorAll('.purchase-doc-grid [data-sub="quantity"]').forEach(qtyEl=>{
    const row=qtyEl.dataset.row;
    const priceEl=document.querySelector(`.purchase-doc-grid [data-row="${row}"][data-sub="unit_price"]`);
    const amountEl=document.querySelector(`.purchase-doc-grid [data-row="${row}"][data-sub="amount"]`);
    const qty=Number(qtyEl.value)||0, price=Number(priceEl?.value)||0;
    const amount=qty*price;
    if(amountEl)amountEl.value=amount?fmtCalc(amount,2):"";
    subtotal+=amount;
  });
  const vat=subtotal*0.07;
  const grandTotal=subtotal+vat;
  if($("po_subtotal"))$("po_subtotal").textContent=subtotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  if($("po_vat"))$("po_vat").textContent=vat.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  if($("po_grand_total"))$("po_grand_total").textContent=grandTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  if($("po_baht_text"))$("po_baht_text").textContent=`(${thaiBahtText(grandTotal)})`;
}

function collectPurchaseDocItems(subs){
  const items=[];
  for(let r=0;r<PURCHASE_DOC_ROW_COUNT+50;r++){
    const first=document.querySelector(`.purchase-doc-grid [data-row="${r}"][data-col="0"]`);
    if(!first)break;
    const item={};
    let hasValue=false;
    for(let c=0;c<subs.length;c++){
      const el=document.querySelector(`.purchase-doc-grid [data-row="${r}"][data-col="${c}"]`);
      const v=el?.value||"";
      item[subs[c]]=v;
      if(v)hasValue=true;
    }
    if(hasValue)items.push(item);
  }
  return items;
}

async function savePurchaseDoc(docType){
  try{
    let data,doc_no,linked_reference=null;
    if(docType==="PO"){
      doc_no=($("po_no")?.value||"").trim()||`PO-${Date.now()}`;
      linked_reference=($("po_reference")?.value||"").trim()||null;
      data={
        date:$("po_date")?.value||"", due_date:$("po_due_date")?.value||"",
        buyer_name:$("po_buyer_name")?.value||"", reference:$("po_reference")?.value||"",
        contact_person:$("po_contact_person")?.value||"", contact_phone:$("po_contact_phone")?.value||"",
        supplier_code:$("po_supplier_code")?.value||"", supplier_name:$("po_supplier_name")?.value||"",
        supplier_address:$("po_supplier_address")?.value||"", supplier_tax_id:$("po_supplier_tax_id")?.value||"",
        buyer_sign:$("po_buyer_sign")?.value||"", buyer_sign_date:$("po_buyer_sign_date")?.value||"",
        approver_sign:$("po_approver_sign")?.value||"", approver_sign_date:$("po_approver_sign_date")?.value||"",
        items:collectPurchaseDocItems(["description","quantity","unit","unit_price","amount"])
      };
    }else{
      doc_no=($("pr_no")?.value||"").trim()||`PR-${Date.now()}`;
      data={
        form_no:$("pr_form_no")?.value||"", revision_no:$("pr_revision_no")?.value||"",
        date:$("pr_date")?.value||"", time:$("pr_time")?.value||"",
        prepared_by:$("pr_prepared_by")?.value||"", approved_by:$("pr_approved_by")?.value||"",
        product_ref:$("pr_product_ref")?.value||"",
        items:collectPurchaseDocItems(["material_code","description","quantity","unit","production_order_no","product_name","po_no","note","received_date"])
      };
      for(const key of ["requester","warehouse_officer","purchasing_officer","reviewer","warehouse_manager"]){
        data[`sign_${key}`]=$(`pr_sign_${key}`)?.value||"";
        data[`sign_${key}_date`]=$(`pr_sign_${key}_date`)?.value||"";
      }
    }

    const items=data.items||[];
    if(docType==="PO"){
      if(!data.supplier_name.trim() && !data.supplier_code.trim()){
        toast("กรุณาใส่ผู้จำหน่าย (ชื่อ หรือ รหัสผู้จำหน่าย) ก่อนบันทึก");
        $("po_supplier_name")?.focus();
        return;
      }
      if(!items.some(x=>String(x.description||"").trim())){
        toast("กรุณาใส่รายการสินค้าอย่างน้อย 1 รายการ ก่อนบันทึก");
        return;
      }
    }else{
      if(!items.some(x=>String(x.material_code||"").trim() || String(x.description||"").trim())){
        toast("กรุณาใส่รายการวัตถุดิบอย่างน้อย 1 รายการ (รหัสสินค้าหรือรายละเอียด) ก่อนบันทึก");
        return;
      }
    }

    const body={doc_no,status:"DRAFT",data,linked_reference};
    let result;
    if(window.editingPurchaseDocId){
      result=await api(`/api/purchase-docs/record/${window.editingPurchaseDocId}`,{method:"PUT",body});
    }else{
      result=await api(`/api/purchase-docs/${docType}`,{method:"POST",body});
      window.editingPurchaseDocId=result.id;
    }
    toast(`บันทึก ${result.doc_no} สำเร็จ`);
  }catch(e){
    toast("บันทึกไม่สำเร็จ: "+(e?.message||e));
  }
}

async function listPurchaseDocs(docType){
  currentPage=`purchaseDoc:${docType}`;
  $("pageTitle").textContent=docType==="PO"?"รายการใบสั่งซื้อ":"รายการใบขอซื้อ";
  $("pageSubtitle").textContent=docType==="PO"?"เอกสารที่ส่งให้ผู้จำหน่ายภายนอก":"เอกสารที่คลังส่งมาให้จัดซื้อ";
  const rows=await api(`/api/purchase-docs/${docType}`);
  const tr=rows.map(x=>{
    const search=esc(`${x.doc_no||""} ${x.created_by_name||""} ${x.linked_reference||""}`.toLowerCase());
    return `<tr data-search="${search}"><td>${x.id}</td><td>${esc(x.doc_no)}</td><td>${statusBadge(x.status)}</td><td>${esc(x.created_by_name||"")}</td><td>${esc(x.linked_reference||"-")}</td><td>${new Date(x.created_at).toLocaleString()}</td><td class="mini-actions"><button onclick="openPurchaseDocForm('${docType}',${x.id})">แก้ไข</button><button onclick="exportPurchaseDocExcel(${x.id})">Excel</button><button onclick="showRecordVersions('purchase_doc',${x.id})">ประวัติ</button></td></tr>`;
  });
  $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="ค้นหาเลขที่/อ้างอิง..." oninput="filterRecordRows(this)"><button class="primary" onclick="openPurchaseDocForm('${docType}')">+ ${docType==="PO"?"ใบสั่งซื้อใหม่":"ใบขอซื้อใหม่"}</button></div>${table(["ID","เลขที่",docType==="PO"?"สถานะ":"สถานะ","ผู้สร้าง","อ้างอิง","บันทึกเมื่อ","จัดการ"],tr)}</div>`;
}

const EMPLOYEE_DEPARTMENTS=["RD","ADMIN","SALE","JOB","PLANNING","STOCK","PURCHASE","PRODUCTION","GRAPHIC","QC","QUALITY","CEO"];
const EMPLOYEE_ROLES=["RD_HEAD","RD_ASSISTANT","RD_OFFICER","SALES","JOB","PLANNING","STOCK","PURCHASE","PRODUCTION","GRAPHIC","QC","QUALITY","CEO","ADMIN"];

async function renderAdmin(){
 if(!["ADMIN","RD_HEAD"].includes(me.role)){throw new Error("Permission denied")}
 const audits=await api("/api/ui/audit");
 let users=[]; if(me.role==="ADMIN")users=await api("/api/ui/users");
 const userRows=users.map(x=>`<tr><td>${esc(x.username)}</td><td>${esc(x.full_name)}</td><td>${esc(x.role)}</td><td>${dataOr(x.department)}</td><td>${x.is_active?"Active":"Inactive"}</td><td class="mini-actions"><button onclick="editEmployee(${x.id})">แก้ไข</button></td></tr>`);
 const auditRows=audits.map(x=>`<tr><td>${x.id}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)}</td><td>${x.entity_id??"-"}</td><td>${x.user_id??"-"}</td><td>${x.created_at}</td></tr>`);
 $("pageContent").innerHTML=`${me.role==="ADMIN"?`<div class="card"><div class="toolbar"><div><h3>Employees</h3><div class="muted">บัญชีพนักงานจริง — คนละบัญชี คนละรหัสผ่าน แยกตามแผนกจริงของแต่ละคน</div></div><button class="primary" onclick="employeeForm()">+ Employee</button></div>${table(["Username","Name","Role","Department","Status","Action"],userRows)}</div>`:""}<div class="card"><h3>Audit Log</h3>${table(["ID","Action","Entity","Entity ID","User ID","Time"],auditRows)}</div>`;
 window._employeesCache=users;
}

function employeeForm(){
 openModal("เพิ่มพนักงาน",`<div class="form-grid">
   <div><label>Username</label><input id="emp_username" placeholder="เช่น somchai"></div>
   <div><label>ชื่อ-นามสกุล</label><input id="emp_name" placeholder="ชื่อจริงของพนักงาน"></div>
   <div><label>แผนก</label><select id="emp_department">${EMPLOYEE_DEPARTMENTS.map(d=>`<option value="${d}">${d}</option>`).join("")}</select></div>
   <div><label>Role</label><select id="emp_role">${EMPLOYEE_ROLES.map(r=>`<option value="${r}">${r}</option>`).join("")}</select></div>
   <div class="wide"><label>รหัสผ่านเริ่มต้น</label><input id="emp_password" type="text" placeholder="อย่างน้อย 8 ตัวอักษร"></div>
   <div class="wide"><button class="primary" onclick="saveEmployee()">Save</button></div>
 </div>`);
}
async function saveEmployee(){
 try{
   await api("/api/auth/register",{method:"POST",body:{
     username:$("emp_username").value.trim().toLowerCase(),
     full_name:$("emp_name").value.trim(),
     department:$("emp_department").value,
     role:$("emp_role").value,
     password:$("emp_password").value
   }});
   closeModal();toast("เพิ่มพนักงานแล้ว");renderAdmin();
 }catch(e){toast("เพิ่มไม่สำเร็จ: "+(e?.message||e));}
}
function editEmployee(id){
 const x=(window._employeesCache||[]).find(u=>u.id===id);
 if(!x)return;
 openModal(`แก้ไข ${x.username}`,`<div class="form-grid">
   <div><label>ชื่อ-นามสกุล</label><input id="emp_edit_name" value="${esc(x.full_name)}"></div>
   <div><label>แผนก</label><select id="emp_edit_department">${EMPLOYEE_DEPARTMENTS.map(d=>`<option value="${d}" ${x.department===d?"selected":""}>${d}</option>`).join("")}</select></div>
   <div><label>Role</label><select id="emp_edit_role">${EMPLOYEE_ROLES.map(r=>`<option value="${r}" ${x.role===r?"selected":""}>${r}</option>`).join("")}</select></div>
   <div><label>สถานะ</label><select id="emp_edit_active"><option value="true" ${x.is_active?"selected":""}>Active</option><option value="false" ${!x.is_active?"selected":""}>Inactive (ปิดใช้งาน)</option></select></div>
   <div class="wide"><button class="primary" onclick="saveEmployeeEdit(${x.id})">Save</button></div>
   <div class="wide"><hr><label>ตั้งรหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label><input id="emp_edit_password" type="text" placeholder="อย่างน้อย 8 ตัวอักษร"><button onclick="resetEmployeePassword('${x.username}')">ตั้งรหัสผ่านใหม่</button></div>
 </div>`);
}
async function saveEmployeeEdit(id){
 try{
   await api(`/api/auth/users/${id}`,{method:"PUT",body:{
     full_name:$("emp_edit_name").value.trim(),
     department:$("emp_edit_department").value,
     role:$("emp_edit_role").value,
     is_active:$("emp_edit_active").value==="true"
   }});
   closeModal();toast("บันทึกแล้ว");renderAdmin();
 }catch(e){toast("บันทึกไม่สำเร็จ: "+(e?.message||e));}
}
async function resetEmployeePassword(username){
 const pw=$("emp_edit_password").value;
 if(!pw){toast("กรุณาใส่รหัสผ่านใหม่");return;}
 try{
   await api("/api/auth/admin/set-password",{method:"POST",body:{username,new_password:pw}});
   toast("ตั้งรหัสผ่านใหม่แล้ว");closeModal();
 }catch(e){toast("ไม่สำเร็จ: "+(e?.message||e));}
}


function dataOr(v){return (v===null||v===undefined||v==="")?'<span class="need-data">ให้ใส่ Data</span>':esc(v)}
async function renderCustomers(){
 const d=await api("/api/customers");
 const rows=d.map(x=>`<tr><td>${esc(x.customer_code)}</td><td>${esc(x.name)}</td><td>${dataOr(x.contact_name)}</td><td>${dataOr(x.phone)}</td><td>${dataOr(x.email)}</td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input class="search" placeholder="ค้นหาลูกค้า..." oninput="filterTable(this)"><button class="primary" onclick="customerForm()">+ Customer</button></div>${table(["Code","Customer","Contact","Phone","Email"],rows)}</div>`;
}
function customerForm(){openModal("เพิ่มลูกค้า",`<div class="form-grid"><div><label>Customer Code</label><input id="c_code" placeholder="ให้ใส่ Data"></div><div><label>Customer Name</label><input id="c_name" placeholder="ให้ใส่ Data"></div><div><label>Contact Name</label><input id="c_contact" placeholder="ให้ใส่ Data"></div><div><label>Phone</label><input id="c_phone" placeholder="ให้ใส่ Data"></div><div class="wide"><label>Email</label><input id="c_email" placeholder="ให้ใส่ Data"></div><div class="wide"><button class="primary" onclick="saveCustomer()">Save</button></div></div>`)}
async function saveCustomer(){await api("/api/customers",{method:"POST",body:{customer_code:$("c_code").value,name:$("c_name").value,contact_name:$("c_contact").value||null,phone:$("c_phone").value||null,email:$("c_email").value||null}});closeModal();toast("เพิ่มลูกค้าแล้ว");renderCustomers();}

async function renderRegistration(){
 const d=await api("/api/final/registration");
 const rows=d.map(x=>`<tr><td>${x.formula_id}</td><td>${x.formula_revision_id}</td><td>${dataOr(x.registration_no)}</td><td>${x.sent_to_admin?"ส่งแล้ว":"ยังไม่ส่ง"}</td><td>${x.deposit_50_received?"รับแล้ว":"ยังไม่รับ"}</td><td>${dataOr(x.notes)}</td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><div><b>สูตรขึ้นทะเบียน อย.</b><div class="muted">ข้อมูลที่บริษัทต้องกรอกภายหลังจะแสดง “ให้ใส่ Data”</div></div><button class="primary" onclick="registrationForm()">+ Registration Formula</button></div>${table(["Formula ID","Revision ID","FDA / Registration No.","ส่ง Admin","มัดจำ 50%","Note"],rows)}</div>`;
}
async function registrationForm(){
 const fs=await api("/api/ui/formulas");
 const opts=fs.filter(f=>f.latest_revision_id).map(f=>`<option value="${f.id}|${f.latest_revision_id}">${esc(f.formula_no)} Rev.${f.latest_revision_no}</option>`);
 openModal("สูตรขึ้นทะเบียน อย.",`<div class="form-grid"><div class="wide"><label>Formula</label><select id="reg_formula">${opts.join("")}</select></div><div><label>เลข อย. / Registration No.</label><input id="reg_no" placeholder="ให้ใส่ Data"></div><div><label>ส่งให้ Admin</label><select id="reg_admin"><option value="false">ยังไม่ส่ง</option><option value="true">ส่งแล้ว</option></select></div><div><label>รับมัดจำ 50%</label><select id="reg_dep"><option value="false">ยังไม่รับ</option><option value="true">รับแล้ว</option></select></div><div class="wide"><label>หมายเหตุ</label><textarea id="reg_note" placeholder="ให้ใส่ Data"></textarea></div><div class="wide"><button class="primary" onclick="saveRegistration()">Save</button></div></div>`);
}
async function saveRegistration(){const [fid,rid]=$("reg_formula").value.split("|").map(Number);await api("/api/registration-formulas",{method:"POST",body:{formula_id:fid,formula_revision_id:rid,registration_no:$("reg_no").value||null,sent_to_admin:$("reg_admin").value==="true",deposit_50_received:$("reg_dep").value==="true",notes:$("reg_note").value||null}});closeModal();toast("บันทึกสูตรขึ้นทะเบียนแล้ว");renderRegistration();}

async function finalFormulaDetail(id){
 const d=await api(`/api/final/revision/${id}`);
 const itemRows=d.items.map((x,n)=>`<tr class="${(d.diff||[]).some(z=>z.material_id===x.material_id)?'changed-row':''}"><td>${n+1}</td><td>${esc(x.material_code)}</td><td>${esc(x.material_name)}</td><td>${x.dose_mg}</td><td>${Number(x.percentage).toFixed(3)}%</td><td>${dataOr(x.supplier)}</td><td>${dataOr(x.country)}</td><td>${x.halal?"Yes":"No"}</td><td>${dataOr(x.fda_ref)}</td>${me.can_view_pricing?`<td>${money(x.price_per_kg)}</td><td>${money(x.cost_per_unit)}</td>`:""}<td><button onclick="deleteFormulaItem(${x.id},${id})">Delete</button></td></tr>`);
 const steps=(d.process_steps||[]).map(x=>`<div class="process-step"><b>${x.sequence_no}.</b> ${esc(x.instruction)} <span>${dataOr(x.sieve_spec)}</span></div>`).join("")||'<div class="need-data">ให้ใส่ Data — ขั้นตอนการผสม / ตะแกรง</div>';
 openModal(`${esc(d.formula_no)} Rev.${d.revision_no}`,`
 <div class="form-sheet">
  <div class="sheet-head"><div><b>F-RD-002 สูตร</b><small>Revision ${d.revision_no}</small></div><div>${statusBadge(d.status)}</div></div>
  <div class="info-grid"><div><small>นามผู้ซื้อ</small><b>${dataOr(d.customer)}</b></div><div><small>เลขที่สูตร</small><b>${esc(d.formula_no)}</b></div><div><small>ชื่อผลิตภัณฑ์</small><b>${dataOr(d.product_name)}</b></div><div><small>เหตุผล Revision</small><b>${dataOr(d.reason)}</b></div></div>
  <h3>ส่วนประกอบ / Formula Ingredients</h3>
  ${table(["No.","Code","Ingredient","Dose mg","%","Supplier","Country","Halal","FDA",...(me.can_view_pricing?["Price/kg","Cost/unit"]:[]),"Action"],itemRows)}
  <div class="formula-summary"><div>Total Weight <b>${d.total_weight_mg} mg</b></div>${me.can_view_pricing?`<div>Ingredient Cost <b>${money(d.ingredient_cost_per_unit)}</b></div><div>Packaging Cost <b>${money(d.packaging_cost_per_unit)}</b></div><div>Selling Price <b>${money(d.selling_price_per_unit)}</b></div>`:"<div class='restricted'>ราคาถูกซ่อนสำหรับ R&D Assistant</div>"}</div>
  <h3>Packaging / Dosage</h3><div class="info-grid"><div><small>Dosage Form</small>${dataOr(d.packaging.dosage_form)}</div><div><small>Capsule Size</small>${dataOr(d.packaging.capsule_size)}</div><div><small>Capsule Color</small>${dataOr(d.packaging.capsule_color)}</div><div><small>Sachet Size</small>${dataOr(d.packaging.sachet_size)}</div><div><small>Water ml</small>${d.packaging.water_ml??'<span class="need-data">ให้ใส่ Data</span>'}</div><div><small>Serving / Day</small>${dataOr(d.packaging.serving_per_day)}</div></div>
  <h3>ขั้นตอนการผลิต / Process</h3>${steps}
  <div class="toolbar"><div class="actions"><button class="primary" onclick="addFormulaItem(${id})">+ Ingredient</button><button onclick="processForm(${id})">+ Process Step</button><button onclick="packagingForm(${id})">Packaging</button><button onclick="cloneRevision(${id})">สร้าง Revision ถัดไป</button></div></div>
  ${(d.diff||[]).length?`<div class="change-note"><b>Revision Change:</b> รายการที่เพิ่ม/ลด/เปลี่ยน Dose หรือ Supplier แสดงสีแดงตาม Requirement</div>`:""}
 </div>`);
}
async function deleteFormulaItem(itemId,revId){if(!confirm("ลบรายการนี้?"))return;await api(`/api/final/revision-items/${itemId}`,{method:"DELETE"});toast("ลบแล้ว");finalFormulaDetail(revId)}
async function cloneRevision(id){const x=await api(`/api/final/revision/${id}/clone`,{method:"POST"});toast(`สร้าง Revision ${x.revision_no} แล้ว`);finalFormulaDetail(x.id)}
function processForm(id){openModal("เพิ่มขั้นตอนการผลิต",`<div class="form-grid"><div><label>Sequence</label><input id="ps_seq" type="number" value="1"></div><div><label>Sieve</label><input id="ps_sieve" placeholder="ให้ใส่ Data"></div><div class="wide"><label>Instruction</label><textarea id="ps_inst" placeholder="ให้ใส่ Data"></textarea></div><div class="wide"><button class="primary" onclick="saveProcess(${id})">Save</button></div></div>`)}
async function saveProcess(id){await api(`/api/revisions/${id}/process-steps`,{method:"POST",body:{sequence_no:Number($("ps_seq").value),instruction:$("ps_inst").value,sieve_spec:$("ps_sieve").value||null}});closeModal();toast("เพิ่ม Process แล้ว");finalFormulaDetail(id)}
function packagingForm(id){openModal("Packaging / Dosage",`<div class="form-grid"><div><label>Dosage Form</label><input id="pk_form" placeholder="ให้ใส่ Data"></div><div><label>Capsule Size</label><input id="pk_size" placeholder="ให้ใส่ Data"></div><div><label>Capsule Color</label><input id="pk_color" placeholder="ให้ใส่ Data"></div><div><label>Tablet Shape</label><input id="pk_shape" placeholder="ให้ใส่ Data"></div><div><label>Sachet Size</label><input id="pk_sachet" placeholder="ให้ใส่ Data"></div><div><label>Water (ml)</label><input id="pk_water" type="number" step="0.01" placeholder="ให้ใส่ Data"></div><div><label>Serving / Day</label><input id="pk_serving" placeholder="ให้ใส่ Data"></div>${me.can_view_pricing?'<div><label>Packaging Cost / Unit</label><input id="pk_cost" type="number" step="0.0001" value="0"></div>':""}<div class="wide"><button class="primary" onclick="savePackaging(${id})">Save</button></div></div>`)}
async function savePackaging(id){await api(`/api/revisions/${id}/packaging`,{method:"PUT",body:{dosage_form:$("pk_form").value||null,capsule_size:$("pk_size").value||null,capsule_color:$("pk_color").value||null,tablet_shape:$("pk_shape").value||null,sachet_size:$("pk_sachet").value||null,water_ml:$("pk_water").value||null,serving_per_day:$("pk_serving").value||null,packaging_cost_per_unit:me.can_view_pricing?($("pk_cost").value||0):0}});closeModal();toast("บันทึก Packaging แล้ว");finalFormulaDetail(id)}


async function downloadOriginalForm(code){
 try{
  const r=await fetch("/api/original-forms/"+encodeURIComponent(code),{headers:{Authorization:"Bearer "+token,"X-Workspace-User":String(window.formWorkspace?.workspace_user_id||""),"X-Workspace-Token":window.formWorkspace?.workspace_token||""}});
  if(!r.ok) throw new Error("Download failed");
  const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement("a");
  const cd=r.headers.get("content-disposition")||"";
  a.href=u;a.download=decodeURIComponent((cd.match(/filename\*=UTF-8''([^;]+)/)||cd.match(/filename="?([^"]+)"?/)||[])[1]||code);
  a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 }catch(e){toast(e.message)}
}
function renderOriginalForms(){
 const forms=[
  ["F-RD-001","รายละเอียดผลิตภัณฑ์ตามความต้องการของลูกค้า","Product Development / Customer Requirement","ลูกค้า, ผลิตภัณฑ์, สารสกัด, ปริมาณ, บรรจุภัณฑ์, เลขสูตร/ราคา"],
  ["F-RD-002","สูตร","R&D Formula / Registration Formula","Active Ingredient, Quantity mg, %, Price/kg, Supplier, Import, รหัสสาร, Halal"],
  ["F-RD-002.1","สูตรผลิต","Production Formula","สูตรผลิตจริง, ปริมาณผลิต kg, Supplier, รหัสวัตถุดิบ, ต้นทุน และส่ง Planning"],
  ["F-RD-003","แบบฟอร์มขอทำสินค้าทดลอง","Tester Request","Quotation, Formula No., Customer Needed, ลักษณะ/บรรจุ, จำนวน, Delivery 7–14 วัน, Pay-in"],
  ["F-RD-004","แบบฟอร์มการขอเรทราคา","Rate / Costing","Customer, Code, OP, Formula, Product, Quantity, Price/Unit, RD/Sales Sign-off"]
 ];
 const rows=forms.map(x=>`<tr><td><b>${x[0]}</b></td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td><button class="primary" onclick="downloadOriginalForm('${x[0]}')">ดาวน์โหลดต้นฉบับ</button></td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="original-banner"><b>ยึด 5 ไฟล์นี้เป็น Form ต้นฉบับ</b><div>หน้า ERP และ Workflow จะอ้างอิงโครงสร้าง/ชื่อช่องจากแบบฟอร์มจริง ไม่สร้างแบบฟอร์มใหม่แทนต้นฉบับ</div></div>${table(["Form","ชื่อแบบฟอร์ม","ใช้ในระบบ","ข้อมูลหลัก","Original File"],rows)}</div>`;
}

const renderers={originalForms:renderOriginalForms,customers:renderCustomers,dashboard:renderDashboard,projects:renderProjects,formulas:renderFormulas,testers:renderTesters,rates:renderRates,materials:renderMaterials,suppliers:renderSuppliers,inventory:renderInventory,registration:renderRegistration,production:renderProduction,ai:renderAI,admin:renderAdmin,workInbox:renderWorkInbox};

function openModal(title,html){$("modalTitle").textContent=title;$("modalBody").innerHTML=html;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}

// Version history -- shared by F-RD-* records (recordType "source_form") and
// PO/PR (recordType "purchase_doc"), the two record kinds RecordVersion
// snapshots on every update (see app/core/record_versions.py).
async function showRecordVersions(recordType,recordId){
  try{
    const base=recordType==="source_form"?"/api/source-forms":"/api/purchase-docs";
    const versions=await api(`${base}/record/${recordId}/versions`);
    if(!versions.length){
      openModal("ประวัติการแก้ไข","<p>ยังไม่มีประวัติสำหรับรายการนี้ (ประวัติจะถูกบันทึกเมื่อมีการแก้ไขครั้งถัดไป)</p>");
      return;
    }
    const rows=versions.map(v=>`<tr>
      <td>${esc(v.label||"-")}</td>
      <td>${statusBadge(v.status)}</td>
      <td>${esc(v.saved_by_name||"-")}</td>
      <td>${new Date(v.saved_at).toLocaleString()}</td>
      <td class="mini-actions">
        <button onclick="viewRecordVersion('${recordType}',${recordId},${v.id})">ดูข้อมูล</button>
        <button onclick="restoreRecordVersion('${recordType}',${recordId},${v.id})">กู้คืน</button>
      </td>
    </tr>`);
    openModal("ประวัติการแก้ไข",table(["ชื่อ/เลขที่ตอนนั้น","สถานะ","แก้ไขโดย","บันทึกเมื่อ","จัดการ"],rows));
  }catch(e){
    toast("โหลดประวัติไม่สำเร็จ: "+(e?.message||e));
  }
}

async function viewRecordVersion(recordType,recordId,versionId){
  try{
    const base=recordType==="source_form"?"/api/source-forms":"/api/purchase-docs";
    const v=await api(`${base}/record/${recordId}/versions/${versionId}`);
    const body=`
      <div class="workspace-note">บันทึกเมื่อ ${new Date(v.saved_at).toLocaleString()} โดย ${esc(v.saved_by_name||"-")}</div>
      <pre class="json">${esc(JSON.stringify(v.data,null,2))}</pre>
      <div class="actions"><button class="primary" onclick="restoreRecordVersion('${recordType}',${recordId},${versionId})">กู้คืนเวอร์ชันนี้</button></div>
    `;
    openModal(`ข้อมูลเวอร์ชัน #${v.id}`,body);
  }catch(e){
    toast("โหลดข้อมูลเวอร์ชันไม่สำเร็จ: "+(e?.message||e));
  }
}

async function restoreRecordVersion(recordType,recordId,versionId){
  if(!confirm("ต้องการกู้คืนข้อมูลเป็นเวอร์ชันนี้หรือไม่? (สถานะปัจจุบันจะถูกบันทึกไว้ในประวัติเช่นกัน ไม่สูญหาย)"))return;
  try{
    const base=recordType==="source_form"?"/api/source-forms":"/api/purchase-docs";
    await api(`${base}/record/${recordId}/versions/${versionId}/restore`,{method:"POST"});
    closeModal();
    toast("กู้คืนข้อมูลสำเร็จ");
    if(recordType==="source_form"){
      await editOwnSourceRecord(recordId);
    }else{
      const rec=await api(`/api/purchase-docs/record/${recordId}`);
      await openPurchaseDocForm(rec.doc_type,recordId);
    }
  }catch(e){
    toast("กู้คืนไม่สำเร็จ: "+(e?.message||e));
  }
}
function filterTable(inp){
 const q=inp.value.toLowerCase();const tableEl=inp.closest(".card").querySelector("tbody");if(!tableEl)return;
 [...tableEl.rows].forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?"":"none");
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
if(token) bootstrap();


let exactFormsCache=null, exactFieldsCache=null, currentExactForm=null;
window.packageCatalogData=window.packageCatalogData||null;
async function loadExactAssets(){
 if(!exactFormsCache){
   exactFormsCache=await fetch("/static/exact_forms.json?v=31.47",{cache:"no-store"}).then(r=>r.json());
   // ADMIN-INVOICE reuses the exact ADMIN-QP layout (same master workbook,
   // same cells) — only the title text differs, which the export step
   // rewrites server-side. Alias it here instead of duplicating the file.
   if(exactFormsCache["ADMIN-QP"] && !exactFormsCache["ADMIN-INVOICE"]) exactFormsCache["ADMIN-INVOICE"]=exactFormsCache["ADMIN-QP"];
 }
 if(!exactFieldsCache){
   exactFieldsCache=await fetch("/static/exact_fields.json?v=31.47",{cache:"no-store"}).then(r=>r.json());
   if(exactFieldsCache["ADMIN-QP"] && !exactFieldsCache["ADMIN-INVOICE"]) exactFieldsCache["ADMIN-INVOICE"]=exactFieldsCache["ADMIN-QP"];
 }
 if(!window.supplementCodeData) try{window.supplementCodeData=await api("/api/fda-materials/catalog/live")}catch{window.supplementCodeData=[]}
 // Package master data now lives in a real database (with cost -> +20% real
 // price, and an official name) instead of the static catalog JSON.
 if(!window.packageCatalogData) try{window.packageCatalogData=await api("/api/packaging")}catch{window.packageCatalogData=[]}
 if(!window.employeeListCache) try{window.employeeListCache=await api("/api/ui/employees")}catch{window.employeeListCache=[]}
}
function xlCol(n){let s="";while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function xlAddr(r,c){return xlCol(c)+r}
function borderCss(b){
 let a=[]; for(const side of ["top","right","bottom","left"]){if(b?.[side]){let sty=b[side].style;sty=(sty==="double"?"double":sty?.includes("dash")?"dashed":"solid");let w=b[side].style==="medium"?2:b[side].style==="thick"?3:1;a.push(`border-${side}:${w}px ${sty} ${b[side].color||"#000"}`)}} return a.join(";");
}
function cellStyle(c){
 if(!c)return "";
 let f=c.font||{},a=c.align||{};return [
   c.fill?`background:${c.fill}`:"",
   `font-family:${JSON.stringify(f.name||"Arial")}`,`font-size:${Math.max(8,Number(f.size||11))}px`,
   f.bold?"font-weight:700":"",f.italic?"font-style:italic":"",f.underline?"text-decoration:underline":"",
   f.color?`color:${f.color}`:"",a.horizontal?`text-align:${a.horizontal==="centerContinuous"?"center":a.horizontal}`:"",
   a.vertical?`vertical-align:${a.vertical}`:"",a.wrapText==="1"?"white-space:normal":"",
   borderCss(c.border)
 ].filter(Boolean).join(";");
}
function findMerge(form,r,c){
 return (form.merges||[]).find(m=>r>=m.r1&&r<=m.r2&&c>=m.c1&&c<=m.c2);
}
function topLeftAddr(form,addr){
 const m=addr.match(/^([A-Z]+)(\d+)$/);let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;let r=+m[2];
 const mg=findMerge(form,r,c);return mg?xlAddr(mg.r1,mg.c1):addr;
}
function exactFieldMap(code,form){
 const map={};
 for(const f of (exactFieldsCache[code]||[])){
   if(f.sub==="variant_code" || f.type==="hidden_variant")continue;
   map[topLeftAddr(form,f.cell)]=f;
 }
 return map;
}
// Which live-recalculation function a plain "number" exact-form field
// should call on input, chosen by the currently open form.
function numberFieldRecalcCall(){
  if(isQPLikeForm(currentExactForm))return "recalculateAdminQP()";
  if(currentExactForm==="ADMIN-JOB")return "recalculateAdminJob()";
  return "recalculateFormulaBoth()";
}
function exactInput(field,addr,cellValue){
 const common=`class="excel-input" data-addr="${addr}" ${field.key?`data-key="${field.key}"`:""} ${field.group?`data-group="${field.group}" data-index="${field.index}" data-sub="${field.sub}"`:""}`;
 const placeholder=field.placeholder||"พิมพ์ข้อมูล";
 if(field.type==="select") return `<select ${common}><option value="">เลือก/แก้ไข</option>${(field.options||[]).map(x=>`<option ${String(cellValue)==String(x)?"selected":""}>${esc(x)}</option>`).join("")}</select>`;
 if(field.type==="date_today") return `<input ${common} type="date" value="${new Date().toISOString().slice(0,10)}">`;
 if(field.type==="date") return `<input ${common} type="date">`;
 if(field.type==="date_text") return `<input ${common} type="text" inputmode="numeric" placeholder="DD/MM/YYYY" oninput="this.value=this.value.replace(/[^0-9\/\-]/g,'')">`;
 if(field.type==="package") return `<input ${common} type="text" list="exactPackageList" placeholder="พิมพ์ค้นหา Package" oninput="applyPackageSelection(this)">`;
 if(field.type==="textarea") return `<textarea ${common} placeholder="${esc(placeholder)}">${esc(cellValue||"")}</textarea>`;
 if(field.type==="number_auto") return `<input ${common} class="excel-input" type="number" step="0.000000001" placeholder="คำนวณอัตโนมัติ" readonly tabindex="-1">`;
 if(field.type==="number") return `<input ${common} type="number" step="0.000001" placeholder="${esc(placeholder)}" oninput="${numberFieldRecalcCall()}" onchange="${numberFieldRecalcCall()}">`;
 if(field.type==="supplier") return `<input ${common} type="text" placeholder="ลิงก์อัตโนมัติ / แก้เองได้">`;
 if(field.type==="supplement_code") return `<input ${common} list="exactSupplementCodeList" placeholder="ค้นหารหัสสาร" oninput="${field.group==='inactive_ingredients'?'autoLinkInactiveIngredient(this)':'autoLinkIngredient(this)'};recalculateFormulaBoth()">`;
 if(field.type==="supplement"){
   if(isQPLikeForm(currentExactForm) && field.group==="qp_ingredients"){
     return `<div class="qp-ingredient-master-cell"><input ${common} list="exactSupplementNameList" placeholder="ชื่อสาร" oninput="linkQPIngredientInput(this);recalculateAdminQP()"><input class="excel-input qp-origin-input" data-group="qp_ingredients" data-index="${field.index}" data-sub="origin" type="text" placeholder="ประเทศที่มา"></div>`;
   }
   return `<input ${common} list="exactSupplementNameList" placeholder="ค้นหาชื่อสาร" oninput="${field.group==='items'?'linkQPIngredientInput(this)':(field.group==='inactive_ingredients'?'autoLinkInactiveIngredient(this)':'autoLinkIngredient(this)')};${field.group==='items'?'recalculateAdminQP()':'recalculateFormulaBoth()'}">`;
 }
 if(field.sub==="fda_no") return `<input ${common} placeholder="FDA NUMBER" oninput="markFormulaOverride(this)">`;
 return `<input ${common} type="text" placeholder="${esc(placeholder)}">`;
}


// window.formWorkspace now represents the real logged-in employee (set
// automatically in bootstrap()/openExactFormAccount()) -- there is no more
// "choose a workspace slot + PIN" step. See openExactForm() further down,
// which is the version actually used (askFormulaIngredientCount /
// openExactFormAccount), and openExactFormAccount() for how formWorkspace
// is populated from `me`.
window.formWorkspace = null;



function markFormulaOverride(el){
  if(el)el.dataset.manualOverride="1";
}
function setAutoEditable(el,value,digits=6){
  if(!el || el.dataset.manualOverride==="1")return;
  el.value=fmtCalc(value,digits);
}

function inactiveIngredientCellField(code,addr){
  const m=/^([A-Z]+)(\d+)$/.exec(addr||"");
  if(!m)return null;
  const col=m[1], row=Number(m[2]);

  if(code==="F-RD-002" && row>=39 && row<=41){
    const idx=row-39;
    if(col==="D") return {group:"inactive_ingredients",index:idx,sub:"name",type:"supplement"};
    if(col==="T") return {group:"inactive_ingredients",index:idx,sub:"quantity_mg",type:"number"};
    if(col==="Z") return {group:"inactive_ingredients",index:idx,sub:"production_kg",type:"number_auto"};
    if(col==="AD") return {group:"inactive_ingredients",index:idx,sub:"percent",type:"number_auto"};
    if(col==="AE") return {group:"inactive_ingredients",index:idx,sub:"price_kg",type:"number"};
    if(col==="AM") return {group:"inactive_ingredients",index:idx,sub:"supplier",type:"supplier"};
    if(col==="AR") return {group:"inactive_ingredients",index:idx,sub:"import_country",type:"text"};
    if(col==="AS") return {group:"inactive_ingredients",index:idx,sub:"material_code",type:"supplement_code"};
    if(col==="AT") return {group:"inactive_ingredients",index:idx,sub:"halal",type:"text"};
    if(col==="BQ") return {group:"inactive_ingredients",index:idx,sub:"fda_no",type:"text"};
  }

  return null;
}

function autoLinkInactiveIngredient(inp){
  const i=Number(inp.dataset.index);
  const item=inp.dataset.sub==="material_code"
    ? findSupplementByCode(inp.value)
    : findSupplementByName(inp.value,i,"inactive_ingredients");

  if(!item)return;

  resetLinkedMaterialState("inactive_ingredients",i);

  const codeInfo=splitMaterialVariantCode(item.variant_code||item.code||"");
  setFormulaVariant("inactive_ingredients",i,codeInfo.variant_code);

  setLinkedFieldValue("inactive_ingredients",i,"material_code",codeInfo.base_code);
  setLinkedFieldValue("inactive_ingredients",i,"name",linkedMaterialDisplayName(item));
  setLinkedFieldValue("inactive_ingredients",i,"supplier",item.vendor||"");
  setLinkedFieldValue("inactive_ingredients",i,"import_country",item.origin||"");
  setLinkedFieldValue("inactive_ingredients",i,"halal",item.halal||"");
  setLinkedFieldValue(
    "inactive_ingredients",i,"price_kg",getSupplementPrice(item),{clearOverride:true}
  );

  if(inp.dataset.sub==="name")inp.value=linkedMaterialDisplayName(item);

  const codeEl=document.querySelector(
    `.excel-input[data-group="inactive_ingredients"][data-index="${i}"][data-sub="material_code"]`
  );
  if(codeEl)updateFDAForMaterialCodeInput(codeEl);
  updateFDASpecBadge("inactive_ingredients",i,item);

  refreshFormulaLinkedCalculations("inactive_ingredients",i);
  recalculateFormulaBoth();
  setTimeout(recalculateFormulaBoth,0);
}

function editableTableBlankCell(code,addr,ce){
  // The attached Excel masters define where data entry is allowed.
  // Blank/styled cells that are not explicitly mapped remain display-only.
  return null;
}

const MANUAL_EDIT_CELLS={
 "F-RD-002":{
   // Inactive Ingredient table
   "D39":"text","T39":"number","AE39":"number","AM39":"text","AR39":"text","AS39":"text","AT39":"text",
   "D40":"text","T40":"number","AE40":"number","AM40":"text","AR40":"text","AS40":"text","AT40":"text",
   "D41":"text","T41":"number","AE41":"number","AM41":"text","AR41":"text","AS41":"text","AT41":"text",

   // Quantity / production / cost / sale / profit
   "K44":"number","K45":"number",
   "K47":"number","AO47":"number",
   "K48":"number","AO48":"number",
   "K49":"number","AO49":"number",

   // Rate table: every row can be typed
   "B52":"text","I52":"text","B53":"text","I53":"text","B54":"text","I54":"text",
   "B55":"text","I55":"text","B56":"text","I56":"text","B57":"text","I57":"text",

   // Note box / signature
   "S52":"text","S53":"text","S54":"text",
   "AJ53":"text",

   // Collagen / protein usage
   "AA57":"number",
   "AI57":"text",

   // Test-extract cost and daily usage
   "S60":"text","AI60":"text"
 },
 "F-RD-002.1":{
   // Original master inputs: package/capsule cost and selling price.
   "AE31":"number",
   // แคปซูล/บรรจุภัณฑ์ที่ใช้คิดต้นทุน (master default text: "แคปซูล #00 DRCap")
   // — editable so it can describe whichever option (capsule size/color,
   // ชงดื่ม, ตอกเม็ด, ...) actually applies, matching the price in AE31.
   "B31":"text",
   // จำนวน Tester (master formula was a hardcoded "=30/0.981" — now editable;
   // blank defaults back to the original 30). See recalculateFormulaBoth().
   "AP31":"number",
   // หน่วยของจำนวน Tester — master default was fixed text "แคปซูล"; now a
   // real dropdown since a tester batch isn't always capsules.
   "AQ31":{type:"select",options:["แคปซูล","เม็ด","ซอง","ขวด","กระปุก","ผง","หลอด"]},
   // Cost, selling price, profit and tester cost
   "K34":"number","AO34":"number",
   "K35":"number","AO35":"number",
   "K36":"number","AO36":"number",

   // Rate area
   "B39":"text","B40":"text","B41":"text","B42":"text","B43":"text","B44":"text",

   // Signature / approval
   "AI40":"text",

   // Note area
   "B47":"text","B48":"text","B49":"text","B50":"text","B51":"text"
 }
};

function manualInputForCell(code,addr,currentValue){
 const type=MANUAL_EDIT_CELLS?.[code]?.[addr];
 if(!type)return null;
 const val=(currentValue===undefined||currentValue===null||String(currentValue)==="#DIV/0!")?"":String(currentValue);
 if(typeof type==="object" && type.type==="select"){
   return `<select class="excel-input manual-cell-input" data-manual-cell="${addr}" oninput="recalculateFormulaBoth()">${(type.options||[]).map(o=>`<option ${val===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
 }
 if(code==="F-RD-002.1" && addr==="AP31"){
   return `<input class="excel-input manual-cell-input" data-manual-cell="${addr}" type="number" step="1" min="1" value="${esc(val==="0"?"":val)}" placeholder="จำนวน Tester (ค่าเริ่มต้น 30)" oninput="recalculateFormulaBoth()">`;
 }
 if(type==="number"){
   return `<input class="excel-input manual-cell-input" data-manual-cell="${addr}" type="number" step="0.000001" value="${esc(val==="0"?"":val)}" placeholder="พิมพ์ข้อมูล" oninput="recalculateFormulaBoth()">`;
 }
 return `<input class="excel-input manual-cell-input" data-manual-cell="${addr}" type="text" value="${esc(val==="0"?"":val)}" placeholder="พิมพ์ข้อมูล">`;
}


const FORMULA_AUTO_CELLS={
  "F-RD-002":new Set([
    ...Array.from({length:20},(_,i)=>`Z${16+i}`),
    ...Array.from({length:20},(_,i)=>`AD${16+i}`),
    ...Array.from({length:20},(_,i)=>`AI${16+i}`),
    "T36","Z36","AD36",
    "Z39","AD39","AI39","Z40","AD40","AI40","Z41","AD41","AI41",
    "T42","Z42","AD42","T43","Z43","AD43",
    "K44","K45","K47","AO47","AO48","K49","AO49"
  ]),
  "F-RD-002.1":new Set([
    // AP31 ("จำนวน Tester") moved to MANUAL_EDIT_CELLS — it's an input now,
    // not an auto-calculated/readonly cell.
    "P28","V28","Z28","AN28","AO28",
    "K33","O33","AO33","O34","AO34","K35","O35","Z35","AO35","K36","AO36",
    // New: overall margin % = K35*100/K34 (profit incl. packaging / selling
    // price), distinct from the master's existing Z35 which excludes AE31.
    "Z36"
  ])
};

function formulaAutoInputForCell(code,addr,currentValue){
  if(!FORMULA_AUTO_CELLS?.[code]?.has(addr))return null;
  const val=(currentValue===undefined||currentValue===null||String(currentValue)==="#DIV/0!")?"":String(currentValue);
  const title=(code==="F-RD-002.1" && addr==="Z36")?"กำไรรวมต่อหน่วย % (K35*100/K34)":"";
  return `<input class="excel-input manual-cell-input formula-auto-input" data-manual-cell="${addr}" data-calc-cell="${addr}" type="number" step="0.000001" value="${esc(val==="0"?"":val)}" placeholder="คำนวณอัตโนมัติ" readonly tabindex="-1" ${title?`title="${esc(title)}"`:""}>`;
}

function readNumber(el){
  if(!el)return 0;
  const n=Number(el.value);
  return Number.isFinite(n)?n:0;
}
function fmtCalc(n,digits=6){
  if(!Number.isFinite(n))return "0";
  const x=Math.abs(n)<1e-12?0:n;
  return String(Number(x.toFixed(digits)));
}
function setCalculatedCell(addr,value,digits=6){
  const el=document.querySelector(`.formula-auto-input[data-calc-cell="${addr}"]`);
  setAutoEditable(el,value,digits);
}
function getActiveIngredientValue(index,sub){
  return readNumber(document.querySelector(`.excel-input[data-group="ingredients"][data-index="${index}"][data-sub="${sub}"]`));
}
function getInactiveCell(addr){
  return readNumber(document.querySelector(`.manual-cell-input[data-manual-cell="${addr}"]`));
}




function selectedFormulaIngredientCount(code){
  const cap=formulaTemplateCapacity(code);
  let n=Number(window.formulaIngredientCount?.[code]||cap||1);
  if(!Number.isFinite(n))n=cap||1;
  return Math.max(1,Math.floor(n));
}

function formulaTemplateCapacity(code){
  if(code==="F-RD-002") return 20;
  if(code==="F-RD-002.1") return 12;
  return 0;
}
function formulaIngredientEndRow(code){
  if(code==="F-RD-002") return 35;
  if(code==="F-RD-002.1") return 27;
  return 0;
}

function dynamicIngredientField(code,col,index){
  if(code==="F-RD-002"){
    const map={
      4:["name","supplement"],
      20:["quantity_mg","number"],
      26:["production_kg","number_auto"],
      30:["percent","number_auto"],
      31:["price_kg","number"],
      35:["row_cost","number_auto"],
      39:["supplier","supplier"],
      44:["import_country","text"],
      45:["material_code","supplement_code"],
      46:["halal","text"]
    };
    return map[col]?{group:"ingredients",index,sub:map[col][0],type:map[col][1]}:null;
  }

  if(code==="F-RD-002.1"){
    const map={
      4:["name","supplement"],
      16:["quantity_mg","number"],
      22:["production_kg","number_auto"],
      26:["percent","number_auto"],
      27:["price_kg","number"],
      31:["row_cost","number_auto"],
      35:["supplier","supplier"],
      39:["material_code","supplement_code"],
      40:["price_pack","number"],
      41:["pack_mg","number"],
      42:["quantity_g","number"],
      43:["pack_price_mg","number_auto"]
    };
    return map[col]?{group:"ingredients",index,sub:map[col][0],type:map[col][1]}:null;
  }

  return null;
}

function renderExtraIngredientExcelRow(code,form,index){
  const templateRow=16;
  const mergeTL={},covered=new Set();

  for(const mg of form.merges||[]){
    if(mg.r1===templateRow && mg.r2===templateRow){
      mergeTL[mg.c1]=mg;
      for(let c=mg.c1+1;c<=mg.c2;c++)covered.add(c);
    }
  }

  let html=`<tr class="dynamic-excel-ingredient" data-dynamic-index="${index}" style="height:${Number(form.heights?.[templateRow]||15)*1.33}px">`;

  for(let c=1;c<=form.maxCol;c++){
    if(covered.has(c))continue;

    const addr=xlAddr(templateRow,c);
    const ce=form.cells[addr]||{};
    const mg=mergeTL[c];
    const field=dynamicIngredientField(code,c,index);

    let content="";
    if(c===2){
      content=`<span class="excel-cell-text">${index+1}</span>`;
    }else if(field){
      content=exactInput(field,`DYN-${code}-${index}-${c}`,"");
    }

    html+=`<td ${mg?`colspan="${mg.c2-mg.c1+1}"`:""} style="${cellStyle(ce)}">${content}</td>`;
  }

  return html+"</tr>";
}

function renderExtraInactiveIngredientExcelRow(code,form,index){
  const templateRow=39;
  const mergeTL={},covered=new Set();

  for(const mg of form.merges||[]){
    if(mg.r1===templateRow && mg.r2===templateRow){
      mergeTL[mg.c1]=mg;
      for(let c=mg.c1+1;c<=mg.c2;c++)covered.add(c);
    }
  }

  let html=`<tr class="dynamic-excel-ingredient" data-dynamic-index="${index}" style="height:${Number(form.heights?.[templateRow]||15)*1.33}px">`;

  for(let c=1;c<=form.maxCol;c++){
    if(covered.has(c))continue;

    const addr=xlAddr(templateRow,c);
    const ce=form.cells[addr]||{};
    const mg=mergeTL[c];
    // Column AI (35) is "row cost" for extra rows: the original 3 template rows
    // use a real master address (AI39/AI40/AI41, via FORMULA_AUTO_CELLS) instead,
    // so it is not part of inactiveIngredientCellField's own row-39-41 mapping.
    const field=inactiveIngredientCellField(code,xlAddr(templateRow,c))
      || (c===35 ? {group:"inactive_ingredients",sub:"row_cost",type:"number_auto"} : null);
    const indexedField=field?{...field,index}:null;

    let content="";
    if(c===2){
      content=`<span class="excel-cell-text">${index+1}</span>`;
    }else if(indexedField){
      content=exactInput(indexedField,`DYN-INACTIVE-${code}-${index}-${c}`,"");
    }

    html+=`<td ${mg?`colspan="${mg.c2-mg.c1+1}"`:""} style="${cellStyle(ce)}">${content}</td>`;
  }

  return html+"</tr>";
}


let adminQPFormulaNo="";
function qpExactEl(i,sub){return document.querySelector(`.excel-input[data-group="qp_ingredients"][data-index="${i}"][data-sub="${sub}"]`)}
function qpLineEl(i,sub){return document.querySelector(`.excel-input[data-group="qp_lines"][data-index="${i}"][data-sub="${sub}"]`)}
function linkQPIngredientInput(inp){
 const i=Number(inp.dataset.index),item=findSupplementByName(inp.value)||findSupplementByCode(inp.value);if(!item)return;
 const name=qpExactEl(i,"ingredient_name"),origin=qpExactEl(i,"origin");
 if(name)name.value=item.name||inp.value;
 if(origin)origin.value=item.origin||"";
 recalculateAdminQP();
}
async function linkAdminQPFormula(force=false){
 const formulaNo=String(document.getElementById("qpExactFormulaNo")?.value||document.querySelector('.excel-input[data-key="formula_no"]')?.value||"").trim();if(!formulaNo)return;
 try{
   const linked=await api(`/api/source-forms/formula-link/${encodeURIComponent(formulaNo)}`);adminQPFormulaNo=formulaNo;
   const setKey=(k,v)=>{const e=document.querySelector(`.excel-input[data-key="${k}"]`);if(e&&!String(e.value||"").trim())e.value=v??""};
   setKey("customer_name",linked.customer_name||"");setKey("product_name",linked.product_name||"");setKey("formula_no",linked.formula_no||formulaNo);
   // Keep the original formula sections in their correct QP sections.
   // Active Ingredient -> slots 0..8, Inactive Ingredient -> slots 9..15.
   // Do NOT flatten both arrays, otherwise a short Active list would push
   // Inactive ingredients into the Active section of the quotation.
   const active=(linked.ingredients||[]).slice(0,9);
   const inactive=(linked.inactive_ingredients||[]).slice(0,7);
   const putSlot=(slot,x)=>{
     const name=qpExactEl(slot,"ingredient_name"),qty=qpExactEl(slot,"quantity_mg"),origin=qpExactEl(slot,"origin");
     if(!x){if(force)for(const el of [name,qty,origin])if(el)el.value="";return}
     if(name)name.value=x.name||"";
     if(qty)qty.value=x.quantity_mg??"";
     if(origin)origin.value=x.origin||"";
   };
   for(let i=0;i<9;i++) putSlot(i,active[i]);
   for(let i=0;i<7;i++) putSlot(9+i,inactive[i]);
   const total=active.length+inactive.length;
   recalculateAdminQP();toast(`VLOOKUP รหัสสูตร ${linked.formula_no} สำเร็จ • สารสำคัญ ${active.length} + สารไม่สำคัญ ${inactive.length} รายการ • ลิงก์ชื่อสาร / ปริมาณ / ประเทศ`);
 }catch(err){if(force)toast("ลิงก์เลขที่สูตรไม่ได้: "+(err?.message||err))}
}
function collectAdminQPExactFormulaNo(d){if(isQPLikeForm(currentExactForm))d.formula_no=adminQPFormulaNo||document.getElementById("qpExactFormulaNo")?.value||document.querySelector('.excel-input[data-key="formula_no"]')?.value||"";return d}




function findPackageItem(value){
  const q=String(value||"").trim().toLowerCase();
  if(!q)return null;
  const rows=window.packageCatalogData||[];
  return rows.find(x=>String(x.spec||"").trim().toLowerCase()===q)
      ||rows.find(x=>String(x.spec||"").toLowerCase().includes(q))
      ||null;
}
function applyPackageSelection(inp){
  if(!inp)return;
  const q=String(inp.value||"").trim().toLowerCase();
  const item=(window.packageCatalogData||[]).find(x=>String(x.spec||"").trim().toLowerCase()===q);
  if(!item)return;
  inp.value=item.spec||inp.value;
  if(inp.dataset.group==="qp_lines"){
    const i=Number(inp.dataset.index);
    const price=qpLineEl(i,"unit_price");
    const packText=qpLineEl(i,"pack_unit_text");
    const job=qpLineEl(i,"job_code");
    if(price){
      price.value=item.price??""; price.dataset.packageAuto="1";
      delete price.dataset.manualOverride;
    }
    if(packText && !String(packText.value||"").trim())packText.value=item.packing||"";
    if(job && !String(job.value||"").trim())job.value=item.category||"";
    recalculateAdminQP();
  }
}
async function openPackageDatabase(){
  window.packageCatalogData=null; // force a fresh load from the DB, not a stale cache
  await loadExactAssets();
  const rows=window.packageCatalogData||[];
  const canManage=["ADMIN","PURCHASE"].includes(me?.role);
  $("pageTitle").textContent="Package Database";
  $("pageSubtitle").textContent="ราคาจริง = ต้นทุน + 20% • พิมพ์ค้นหาได้ทันที";
  $("pageContent").innerHTML=`<div class="card"><div class="toolbar"><input id="packageDbSearch" class="search" placeholder="พิมพ์ค้นหา สเปค / ชื่อทางการ / ประเภท / Supplier..." oninput="filterPackageDatabase()"><span>${rows.length} รายการ</span>${canManage?'<button class="primary" onclick="openPackageItemEditor()">+ เพิ่มรายการ</button>':""}</div><div id="packageDbEditor"></div><div id="packageDbTable"></div></div>`;
  renderPackageDatabase(rows);
}
function renderPackageDatabase(rows){
  const canManage=["ADMIN","PURCHASE"].includes(me?.role);
  const out=(rows||[]).map(x=>`<tr><td>${x.image_url?`<img class="pkg-thumb" src="${esc(x.image_url)}" alt="${esc(x.spec||"")}">`:'<span class="muted">ไม่มีรูป</span>'}</td><td>${esc(x.category||"")}</td><td>${esc(x.spec||"")}</td><td>${esc(x.official_name||"")}</td><td>${esc(x.rate??"")}</td><td>${x.price??""}</td><td>${esc(x.lead_time??"")}</td><td>${esc(x.packing??"")}</td><td>${esc(x.supplier??"")}</td>${canManage?`<td class="mini-actions"><button onclick="openPackageItemEditor(${x.id})">แก้ไข</button><button onclick="deletePackageItem(${x.id})">ลบ</button></td>`:""}</tr>`);
  const headers=["รูป","ประเภท","สเปค","ชื่อทางการ","เรท","ราคา (ต้นทุน+20%)","ระยะเวลา","การบรรจุ","Supplier"];
  if(canManage)headers.push("จัดการ");
  const box=document.getElementById("packageDbTable");
  if(box)box.innerHTML=table(headers,out);
}
function filterPackageDatabase(){
  const q=String(document.getElementById("packageDbSearch")?.value||"").trim().toLowerCase();
  const rows=(window.packageCatalogData||[]).filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q));
  renderPackageDatabase(rows);
}

let packageDbEditingId=null;
function openPackageItemEditor(id=null){
  packageDbEditingId=id;
  const d=id?((window.packageCatalogData||[]).find(x=>x.id===id)||{}):{};
  const box=document.getElementById("packageDbEditor");
  if(!box)return;
  box.innerHTML=`
    <div class="fda-editor">
      <div class="fda-editor-title">${id?"แก้ไข Package":"เพิ่ม Package ใหม่"}</div>
      <div class="fda-editor-grid">
        <div class="fda-field"><label>ประเภท</label><input id="pkg_category" value="${esc(d.category||"")}"></div>
        <div class="fda-field"><label>สเปค</label><input id="pkg_spec" value="${esc(d.spec||"")}"></div>
        <div class="fda-field"><label>ชื่อทางการของบรรจุภัณฑ์</label><input id="pkg_official_name" value="${esc(d.official_name||"")}"></div>
        <div class="fda-field"><label>ต้นทุน</label><input id="pkg_cost" type="number" step="0.01" value="${esc(d.cost??"")}"></div>
        <div class="fda-field"><label>เรท</label><input id="pkg_rate" value="${esc(d.rate||"")}"></div>
        <div class="fda-field"><label>ระยะเวลา</label><input id="pkg_lead_time" value="${esc(d.lead_time||"")}"></div>
        <div class="fda-field"><label>การบรรจุ</label><input id="pkg_packing" value="${esc(d.packing||"")}"></div>
        <div class="fda-field"><label>Supplier</label><input id="pkg_supplier" value="${esc(d.supplier||"")}"></div>
        <div class="fda-field">
          <label>รูปภาพ</label>
          <input id="pkg_image_file" type="file" accept="image/*">
          ${d.image_url?`<img class="pkg-thumb" id="pkg_image_preview" src="${esc(d.image_url)}" alt="">`:""}
        </div>
      </div>
      <div class="actions">
        <button class="primary" onclick="savePackageItem()">บันทึก</button>
        <button onclick="closePackageItemEditor()">ยกเลิก</button>
      </div>
    </div>`;
  document.getElementById("pkg_spec")?.focus();
}
function closePackageItemEditor(){
  packageDbEditingId=null;
  const box=document.getElementById("packageDbEditor");
  if(box)box.innerHTML="";
}
async function uploadPackagingImage(id,file){
  const fd=new FormData();
  fd.append("file",file);
  const headers={};
  if(token)headers.Authorization="Bearer "+token;
  const r=await fetch(`/api/packaging/${id}/image`,{method:"POST",headers,body:fd});
  if(!r.ok){
    let msg=`HTTP ${r.status}`;
    try{const d=await r.json();msg=d?.detail||msg;}catch{}
    throw new Error(msg);
  }
  return r.json();
}
async function savePackageItem(){
  const val=id=>document.getElementById(id)?.value?.trim()||"";
  const spec=val("pkg_spec");
  if(!spec){toast("กรอกสเปคก่อน");return;}
  const payload={
    category:val("pkg_category")||null,
    spec,
    official_name:val("pkg_official_name")||null,
    cost:val("pkg_cost")?Number(val("pkg_cost")):null,
    rate:val("pkg_rate")||null,
    lead_time:val("pkg_lead_time")||null,
    packing:val("pkg_packing")||null,
    supplier:val("pkg_supplier")||null,
  };
  try{
    let saved;
    if(packageDbEditingId){
      saved=await api(`/api/packaging/${packageDbEditingId}`,{method:"PUT",body:payload});
    }else{
      saved=await api("/api/packaging",{method:"POST",body:payload});
    }
    const file=document.getElementById("pkg_image_file")?.files?.[0];
    if(file){
      try{ await uploadPackagingImage(saved.id,file); }
      catch(e){ toast("บันทึกข้อมูลสำเร็จ แต่อัปโหลดรูปไม่สำเร็จ: "+(e?.message||e)); }
    }
    toast("บันทึก Package สำเร็จ");
    closePackageItemEditor();
    window.packageCatalogData=null;
    await loadExactAssets();
    renderPackageDatabase(window.packageCatalogData||[]);
  }catch(e){toast("บันทึกไม่สำเร็จ: "+(e?.message||e));}
}
async function deletePackageItem(id){
  if(!confirm("ลบรายการ Package นี้?"))return;
  try{
    await api(`/api/packaging/${id}`,{method:"DELETE"});
    toast("ลบสำเร็จ");
    window.packageCatalogData=null;
    await loadExactAssets();
    renderPackageDatabase(window.packageCatalogData||[]);
  }catch(e){toast("ลบไม่สำเร็จ: "+(e?.message||e));}
}

function isExactFormCode(code){
  return ["F-RD-001","F-RD-002","F-RD-002.1","F-RD-003","F-RD-004","ADMIN-QP","ADMIN-INVOICE","ADMIN-JOB"].includes(code);
}

// ADMIN-INVOICE is a clone of ADMIN-QP: same Excel layout, same calculation
// behavior, just a different label ("ใบแจ้งหนี้"/Invoice instead of
// "ใบเสนอราคา"/Quotation). Every place that only cares about that shared
// behavior should check isQPLikeForm(); places that show a label still
// branch on the exact code.
function isQPLikeForm(code){
  return code==="ADMIN-QP" || code==="ADMIN-INVOICE";
}

function exactFormDisplayName(code,form){
  if(code==="ADMIN-QP") return "Quotation / Purchase Order";
  if(code==="ADMIN-INVOICE") return "Invoice";
  if(code==="ADMIN-JOB") return "Job Description";
  return form?.display_name || form?.title || form?.name || form?.description || "แบบฟอร์ม";
}

async function openPrivateExactForm(code){
  await loadExactAssets();
  currentExactForm = code;

  document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
  document.querySelector(`.exact-form-nav[data-form="${code}"]`)?.classList.add("active");

  const titles={
    "F-RD-001":"รายละเอียดผลิตภัณฑ์ตามความต้องการของลูกค้า",
    "F-RD-002":"สูตร",
    "F-RD-002.1":"สูตรผลิต",
    "F-RD-003":"แบบฟอร์มขอทำสินค้าทดลอง",
    "F-RD-004":"แบบฟอร์มการขอเรทราคา",
    "ADMIN-QP":"Quotation / Purchase Order",
    "ADMIN-INVOICE":"Invoice / ใบแจ้งหนี้",
    "ADMIN-JOB":"Job Description (JL)"
  };

  $("pageTitle").textContent = `${code} — ${titles[code] || exactFormDisplayName(code,exactFormsCache?.[code])}`;
  $("pageSubtitle").textContent =
    `${window.formWorkspace.display_name} • ข้อมูลส่วนตัว แยกจากคนอื่น`;

  const form=exactFormsCache[code],
        fmap=exactFieldMap(code,form),
        skip=new Set(),
        mergeTL={};

  for(const m of form.merges||[]){
    mergeTL[xlAddr(m.r1,m.c1)] = m;
    for(let r=m.r1;r<=m.r2;r++)
      for(let c=m.c1;c<=m.c2;c++)
        if(!(r===m.r1&&c===m.c1)) skip.add(xlAddr(r,c));
  }

  const widthList=Array.isArray(form.widths)
    ? form.widths
    : Array.from({length:form.maxCol},(_,i)=>form.widths?.[i+1]??form.widths?.[String(i+1)]??12);
  let cols=`<colgroup>${widthList.map(w=>`<col style="width:${Math.max(4,Number(w))*7.2}px">`).join("")}</colgroup>`;
  let rows="";

  for(let r=1;r<=form.maxRow;r++){
    const cap=formulaTemplateCapacity(code);
    const selected=selectedFormulaIngredientCount(code);

    // For BOTH formula forms:
    // if selected < template capacity, hide the unused original ingredient rows.
    if(cap && r>=16 && r<=formulaIngredientEndRow(code) && r>=16+Math.min(selected,cap)){
      continue;
    }
    // F-RD-002 only: same "hide unused" treatment for the Inactive Ingredient
    // rows (39-41, template capacity 3), independent of the active count above.
    if(code==="F-RD-002" && r>=39 && r<=41 && r>=39+Math.min(selectedInactiveIngredientCount(code),3)){
      continue;
    }

    rows += `<tr style="height:${Number(form.heights?.[r]||15)*1.33}px">`;
    for(let c=1;c<=form.maxCol;c++){
      const a=xlAddr(r,c);
      if(skip.has(a)) continue;
      const ce=form.cells[a]||{}, mg=mergeTL[a], field=fmap[a];
      const calcInput=formulaAutoInputForCell(code,a,ce.v);
      const manualInput=manualInputForCell(code,a,ce.v);
      const inactiveField=inactiveIngredientCellField(code,a);
      const genericInput=editableTableBlankCell(code,a,ce);
      rows += `<td ${mg?`rowspan="${mg.r2-mg.r1+1}" colspan="${mg.c2-mg.c1+1}"`:""} style="${cellStyle(ce)}">`
        + (field ? exactInput(field,a,ce.v) : (inactiveField ? exactInput(inactiveField,a,ce.v) : (calcInput || manualInput || genericInput || `<span class="excel-cell-text">${esc(ce.v||"")}</span>`)))
        + `</td>`;
    }
    rows += "</tr>";
    const appendCap=formulaTemplateCapacity(code);
    const appendSelected=selectedFormulaIngredientCount(code);

    // Append extra rows immediately after the last ingredient row.
    // Works identically for F-RD-002 and F-RD-002.1.
    if(appendCap && r===formulaIngredientEndRow(code) && appendSelected>appendCap){
      for(let i=appendCap;i<appendSelected;i++){
        rows+=renderExtraIngredientExcelRow(code,form,i);
      }
    }

    // F-RD-002 only: append extra Inactive Ingredient rows right after row 41
    // (template capacity 3), independent of the active-ingredient append above.
    if(code==="F-RD-002" && r===41){
      const appendInactiveSelected=selectedInactiveIngredientCount(code);
      if(appendInactiveSelected>3){
        for(let i=3;i<appendInactiveSelected;i++){
          rows+=renderExtraInactiveIngredientExcelRow(code,form,i);
        }
      }
    }
  }

  const supplements=(window.supplementCodeData||[]);
  const supNames=[...new Set(supplements.map(x=>x.vendor).filter(Boolean))];

  const aliasPanel = "";

  $("pageContent").innerHTML = `
    <div class="exact-form-toolbar">
      <div>
        <b>${window.formWorkspace.display_name} • FORM ${code}</b>
        <small>บันทึกของคนนี้ คนอื่นเปิดดูไม่ได้</small>
      </div>
      <div class="actions">
        <input id="exactRecordNo" placeholder="เลขที่รายการ เช่น ${code}-001">
        ${code==="F-RD-002"?`<input id="exactFiledMonth" type="month" value="${currentYearMonth()}" title="เก็บไว้ในเดือนไหน">`:""}
        ${code==="F-RD-002.1"?`<input id="exactFiledPerson" list="exactEmployeeList" placeholder="เก็บไว้ในชื่อของใคร" title="เก็บไว้ในชื่อของใคร">`:""}
        <button onclick="showSourceRecords('${code}')">ฟอร์มของฉัน</button>
        ${isQPLikeForm(code)?`<div class="qp-exact-link"><input id="qpExactFormulaNo" placeholder="คีย์รหัสสูตร เช่น F-RD-002-001"><button onclick="linkAdminQPFormula(true)">VLOOKUP จากไฟล์สูตร</button></div>`:""}
        ${(code==="F-RD-002"||code==="F-RD-002.1")?`<button class="ai-formula-btn" onclick="openAIFormulaAssistant('${code}')">AI คิดสูตร</button>`:""}
        <button class="primary" onclick="saveExactForm('${code}')">บันทึก</button>
      </div>
    </div>

    

    <div class="excel-sheet-scroll">
      <table class="excel-sheet">${cols}<tbody>${rows}</tbody></table>
    </div>

    <datalist id="exactSupplementCodeList">
      ${supplements.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join("")}
    </datalist>
    <datalist id="exactSupplementNameList">
      ${supplements.map(x=>`<option value="${esc(x.name)}">${esc(x.code)} — ${esc(x.vendor||"")}</option>`).join("")}
    </datalist>
    <datalist id="exactSupplierList">
      ${supNames.map(x=>`<option value="${esc(x)}">`).join("")}
    </datalist>
    <datalist id="exactPackageList">
      ${(window.packageCatalogData||[]).map(x=>`<option value="${esc(x.spec||"")}">${esc(x.category||"")} — ราคา ${esc(x.price??"-")} — ${esc(x.supplier||"")}</option>`).join("")}
    </datalist>
    <datalist id="exactEmployeeList">
      ${(window.employeeListCache||[]).map(x=>`<option value="${esc(x.full_name)}">${esc(x.department||"")}</option>`).join("")}
    </datalist>
  `;

  if(code==="F-RD-002" || code==="F-RD-002.1"){
    setTimeout(recalculateFormulaBoth,0);

    // Exact inputs now exist in the DOM. Link FDA after rendering and
    // again shortly after saved payload/autofill has settled.
    setTimeout(()=>linkFDAForExactFormula(false),20);
    setTimeout(()=>linkFDAForExactFormula(false),200);
    setTimeout(()=>linkFDAForExactFormula(false),600);
  }
  if(isQPLikeForm(code)) setTimeout(recalculateAdminQP,0);
}

function buildAliasPanel(code){ return ""; }

function supplementOptionValue(item){
  const name=String(item?.name||"").trim();
  const variant=String(item?.variant_code||item?.code||"").trim().toUpperCase();
  return variant ? `${name} || ${variant}` : name;
}

function parseSupplementOptionValue(value){
  const raw=String(value||"").trim();
  const sep=" || ";
  const idx=raw.lastIndexOf(sep);
  if(idx<0){
    return {name:raw,variant_code:""};
  }
  return {
    name:raw.slice(0,idx).trim(),
    variant_code:raw.slice(idx+sep.length).trim().toUpperCase()
  };
}

function findSupplementByCode(code){
 const raw=String(code||"").trim().toUpperCase();
 const split=splitMaterialVariantCode(raw);

 // Exact variant match first.
 let item=(window.supplementCodeData||[]).find(x=>
   String(x.variant_code||x.code||"").trim().toUpperCase()===split.variant_code
 );
 if(item)return item;

 // Base-code fallback.
 item=(window.supplementCodeData||[]).find(x=>
   splitMaterialVariantCode(x.variant_code||x.code||"").base_code===split.base_code
 );
 return item||null;
}
function findSupplementByName(value,index=null,group="ingredients"){
 const parsed=parseSupplementOptionValue(value);
 const target=String(parsed.name||"").trim().toLowerCase();

 const matches=(window.supplementCodeData||[]).filter(x=>
   String(x.name||"").trim().toLowerCase()===target
 );

 if(!matches.length)return null;

 // If the datalist selection includes an exact variant code, that is authoritative.
 if(parsed.variant_code){
   const exact=matches.find(x=>
     String(x.variant_code||x.code||"").trim().toUpperCase()===parsed.variant_code
   );
   if(exact)return exact;
 }

 // Keep current row's exact variant if still applicable.
 if(index!==null){
   const currentVariant=getFormulaVariant(group,index,"");
   const exact=matches.find(x=>
     String(x.variant_code||x.code||"").trim().toUpperCase()===
     String(currentVariant||"").trim().toUpperCase()
   );
   if(exact)return exact;
 }

 return matches[0];
}


function refreshFormulaLinkedCalculations(group,index){
  const price=document.querySelector(
    `.excel-input[data-group="${group}"][data-index="${index}"][data-sub="price_kg"]`
  );
  const qty=document.querySelector(
    `.excel-input[data-group="${group}"][data-index="${index}"][data-sub="quantity_mg"]`
  );

  // Touch current live values only; recalculateFormulaBoth reads DOM values.
  if(price)price.value=price.value;
  if(qty)qty.value=qty.value;

  recalculateFormulaBoth();
}


function getSupplementPrice(item){
  if(item==null)return "";
  for(const key of ["price","price_kg","unit_price","pricePerKg","price_per_kg"]){
    const v=item[key];
    if(v!==undefined && v!==null && String(v)!=="")return v;
  }
  return "";
}

function setLinkedFieldValue(group,index,sub,value,{clearOverride=false}={}){
  const el=document.querySelector(
    `.excel-input[data-group="${group}"][data-index="${index}"][data-sub="${sub}"]`
  );
  if(!el)return;

  if(clearOverride){
    delete el.dataset.manualOverride;
  }

  el.value=value??"";

  // Trigger recalculation for numeric linked fields immediately.
  if(sub==="price_kg" || sub==="quantity_mg" || sub==="quantity"){
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  }
}


function resetLinkedMaterialState(group,index){
  // Clear only linked fields that must come from the newly selected variant.
  for(const sub of ["price_kg","supplier","import_country","halal","fda_no"]){
    const el=document.querySelector(
      `.excel-input[data-group="${group}"][data-index="${index}"][data-sub="${sub}"]`
    );
    if(el){
      delete el.dataset.manualOverride;
      el.value="";
    }
  }
}

// F-RD-002 ("สูตร") is the file submitted for อย. registration, so its
// ingredient rows link the substance's registered/อย. name; F-RD-002.1
// ("สูตรผลิต") is for production/costing, so it keeps the product name.
function linkedMaterialDisplayName(item){
  if(!item)return "";
  if(currentExactForm==="F-RD-002")return item.registered_name||item.name||"";
  return item.name||item.registered_name||"";
}

function applyLinkedMaterial(index,item){
 resetLinkedMaterialState("ingredients",index);
 if(!item)return;

 const codeInfo=splitMaterialVariantCode(item.variant_code||item.code||"");
 setFormulaVariant("ingredients",index,codeInfo.variant_code);

 // Visible/base code
 setLinkedFieldValue("ingredients",index,"material_code",codeInfo.base_code);
 setLinkedFieldValue("ingredients",index,"name",linkedMaterialDisplayName(item));
 setLinkedFieldValue("ingredients",index,"supplier",item.vendor||"");
 setLinkedFieldValue("ingredients",index,"import_country",item.origin||"");
 setLinkedFieldValue("ingredients",index,"halal",item.halal||"");

 // IMPORTANT:
 // Price belongs to the selected variant and must refresh every time material changes.
 // Clear old manual/auto state before assigning the new linked price.
 setLinkedFieldValue(
   "ingredients",
   index,
   "price_kg",
   getSupplementPrice(item),
   {clearOverride:true}
 );

 const codeEl=document.querySelector(
   `.excel-input[data-group="ingredients"][data-index="${index}"][data-sub="material_code"]`
 );
 if(codeEl)updateFDAForMaterialCodeInput(codeEl);
 updateFDASpecBadge("ingredients",index,item);

 // Recalculate after DOM has the new price.
 recalculateFormulaBoth();
 setTimeout(recalculateFormulaBoth,0);
}

// Shows a small "ดาวน์โหลด Spec" link right after the FDA-number cell when
// the linked material has an attached อย. spec — the original R&D request
// was "แนบ Spec อย. พร้อมเลข FDA จาก Supplier เมื่อใส่รหัสสาร". Purely an
// injected sibling element; never touches the fixed Excel cell grid itself.
function updateFDASpecBadge(group,index,item){
  const fdaEl=document.querySelector(`.excel-input[data-group="${group}"][data-index="${index}"][data-sub="fda_no"]`);
  if(!fdaEl)return;
  let badge=fdaEl.parentElement?.querySelector(".fda-spec-badge");
  if(item?.spec_url){
    if(!badge){
      badge=document.createElement("button");
      badge.type="button";
      badge.className="fda-spec-badge";
      fdaEl.insertAdjacentElement("afterend",badge);
    }
    badge.textContent="📎 Spec";
    badge.title=item.spec_filename||"ดาวน์โหลด Spec อย.";
    badge.onclick=()=>downloadFDASpec(item.id);
  }else if(badge){
    badge.remove();
  }
}
function linkedPanelCodeChanged(inp){
 const i=Number(inp.dataset.index),item=findSupplementByCode(inp.value);
 if(item)applyLinkedMaterial(i,item);
}
function linkedPanelNameChanged(inp){
 const i=Number(inp.dataset.index);
 const item=findSupplementByName(inp.value,i,"ingredients");
 if(item){
   applyLinkedMaterial(i,item);
   inp.value=linkedMaterialDisplayName(item);
 }
}
function autoLinkIngredient(inp){
 const i=Number(inp.dataset.index);
 const item=inp.dataset.sub==="material_code"
   ? findSupplementByCode(inp.value)
   : findSupplementByName(inp.value,i,"ingredients");

 if(item){
   applyLinkedMaterial(i,item);

   // After choosing a unique "name || variant", show the linked display name only.
   if(inp.dataset.sub==="name")inp.value=linkedMaterialDisplayName(item);
 }
}
function bindAliasPanel(){
 // Initial binding is handled by oninput attributes. This function remains for compatibility.
}
// True when a collected exact-form payload has no user-entered data at all
// (every scalar field blank/null/undefined and every group array empty) --
// used to warn before saving a completely empty form. ingredient_count is
// derived template metadata (always >=1, even on a blank form), not
// user-entered data, so it's ignored here.
function isPayloadEssentiallyEmpty(data){
  for(const [k,v] of Object.entries(data||{})){
    if(k==="ingredient_count")continue;
    if(Array.isArray(v)){
      if(v.length)return false;
    }else if(v && typeof v==="object"){
      if(Object.values(v).some(x=>x!==undefined&&x!==null&&String(x).trim()!==""))return false;
    }else if(v!==undefined && v!==null && String(v).trim()!==""){
      return false;
    }
  }
  return true;
}
// Base implementation collectExactPayload() is later wrapped/extended below
// (manual_cells, ingredient_count, ...) -- kept as a plain top-level
// function (not merged into the wrapper) since the wrapper calls it by
// name via collectExactPayloadOriginal.
function collectExactPayload(){
 const d={};document.querySelectorAll(".excel-input").forEach(e=>{let v=e.value;if(e.type==="number"&&v!=="")v=Number(v);
   if(e.dataset.key)d[e.dataset.key]=v;
   if(e.dataset.group){const g=e.dataset.group,i=+e.dataset.index,k=e.dataset.sub;d[g]??=[];d[g][i]??={};d[g][i][k]=v}
 });
 for(const k of Object.keys(d))if(Array.isArray(d[k]))d[k]=d[k].filter(x=>x&&Object.values(x).some(v=>v!==""&&v!=null));
 return d;
}
const collectExactPayloadOriginal = collectExactPayload;
collectExactPayload = function(){
  const d=collectExactPayloadOriginal();
  d.manual_cells={};
  document.querySelectorAll(".manual-cell-input").forEach(e=>{
    if(!e.dataset.manualCell)return;
    let v=e.value;
    if(e.type==="number" && v!=="")v=Number(v);
    if(v!=="" && v!==null)d.manual_cells[e.dataset.manualCell]=v;
  });
  if(Object.keys(d.manual_cells).length===0)delete d.manual_cells;


  if(currentExactForm==="F-RD-002" || currentExactForm==="F-RD-002.1"){
    d.ingredient_count=Math.max(1,Number(window.formulaIngredientCount?.[currentExactForm]||formulaTemplateCapacity(currentExactForm)));
    d.ingredients ??= [];
    d.ingredients=d.ingredients.slice(0,d.ingredient_count);

    // material_code is the visible/base FDA code.
    // variant_code is stored separately in JS state for price/size selection.
    for(const group of ["ingredients","inactive_ingredients"]){
      if(!Array.isArray(d[group]))continue;
      d[group].forEach((row,i)=>{
        if(!row)return;
        row.material_code=normalizeMaterialCodeValue(row.material_code||"");
        row.variant_code=getFormulaVariant(group,i,row.material_code);
      });
    }
  }
  return collectAdminQPExactFormulaNo(d);
};

window.editingSourceRecordId=null;

async function editOwnSourceRecord(id){
 const rec=await api(`/api/source-forms/record/${id}`);
 window.editingSourceRecordId=id;
 if(rec.form_code==="F-RD-002" || rec.form_code==="F-RD-002.1"){
   const savedCount=Number(rec.data?.ingredient_count)||((rec.data?.ingredients||[]).length)||1;
   window.formulaIngredientCount ??= {};
   window.formulaIngredientCount[rec.form_code]=Math.max(1,Math.floor(savedCount));
 }
 await openPrivateExactForm(rec.form_code);
 $("exactRecordNo").value=rec.record_no||"";
 if(rec.form_code==="F-RD-002" && $("exactFiledMonth")){
   $("exactFiledMonth").value=rec.filed_month||currentYearMonth();
 }
 if(rec.form_code==="F-RD-002.1" && $("exactFiledPerson")){
   $("exactFiledPerson").value=rec.filed_person_name||"";
 }
 populateExactForm(rec.data||{});
 toast("เปิดฟอร์มของฉันเพื่อแก้ไขแล้ว");
}

function populateExactForm(d){
 document.querySelectorAll(".excel-input[data-key]").forEach(e=>{
   const v=d[e.dataset.key];
   if(v!==undefined && v!==null)e.value=v;
 });

 for(const [addr,v] of Object.entries(d.manual_cells||{})){
   const e=document.querySelector(`.manual-cell-input[data-manual-cell="${addr}"]`);
   if(e && v!==undefined && v!==null)e.value=v;
 }

 if(isQPLikeForm(currentExactForm)){
   for(const group of ["qp_ingredients","qp_lines"]){
     (d[group]||[]).forEach((x,i)=>{
       for(const [k,v] of Object.entries(x||{})){
         const e=document.querySelector(`.excel-input[data-group="${group}"][data-index="${i}"][data-sub="${k}"]`);
         if(e && v!==undefined && v!==null)e.value=v;
       }
     });
   }
   adminQPFormulaNo=String(d.formula_no||"");
   const linkBox=document.getElementById("qpExactFormulaNo");if(linkBox)linkBox.value=adminQPFormulaNo;
   setTimeout(recalculateAdminQP,0);
 }

 if(currentExactForm==="ADMIN-JOB"){
   for(const group of ["box_components","active_ingredients","inactive_ingredients"]){
     (d[group]||[]).forEach((x,i)=>{
       for(const [k,v] of Object.entries(x||{})){
         const e=document.querySelector(`.excel-input[data-group="${group}"][data-index="${i}"][data-sub="${k}"]`);
         if(e && v!==undefined && v!==null)e.value=v;
       }
     });
   }
   setTimeout(recalculateAdminJob,0);
 }

 for(const group of ["ingredients","inactive_ingredients"]){
   (d[group]||[]).forEach((x,i)=>{
     const variant=String(x?.variant_code||x?.material_code||"").trim().toUpperCase();
     const base=normalizeMaterialCodeValue(x?.material_code||variant);
     setFormulaVariant(group,i,variant);

     for(const [k,v] of Object.entries(x||{})){
       if(k==="variant_code")continue;
       const e=document.querySelector(
         `.excel-input[data-group="${group}"][data-index="${i}"][data-sub="${k}"]`
       );
       if(!e || v===undefined || v===null)continue;
       e.value=(k==="material_code") ? base : v;
     }
   });
 }

 // Keep alias panel using the base code.
 (d.ingredients||[]).forEach((x,i)=>{
   const base=normalizeMaterialCodeValue(x?.material_code||x?.variant_code||"");
   const map={
     ".alias-code":base,
     ".alias-main":x.name,
     ".alias-alt":x.alternate_name,
     ".ingredient-unit":x.unit,
     ".linked-supplier":x.supplier,
     ".linked-import":x.import_country,
     ".linked-price":x.price_kg,
     ".linked-halal":x.halal
   };
   for(const [sel,v] of Object.entries(map)){
     const e=document.querySelector(`${sel}[data-index="${i}"]`);
     if(e && v!==undefined && v!==null)e.value=v;
   }
 });

 setTimeout(()=>{
   linkFDAForExactFormula(false);
   if(typeof recalculateFormulaBoth==="function")recalculateFormulaBoth();
 },0);
}

saveExactForm=async function(code){
  try{
    if(!code)code=currentExactForm;
    if(!code)throw new Error("ไม่พบรหัสฟอร์มที่กำลังเปิด");

    if(!window.currentPersonAccess?.person_key){
      throw new Error("เซสชันหมดอายุ กรุณาล็อกอินใหม่");
    }

    const data=collectExactPayload();

    if(isPayloadEssentiallyEmpty(data) && !confirm("ฟอร์มนี้ยังไม่มีข้อมูลกรอกเลย ต้องการบันทึกฟอร์มเปล่าหรือไม่?")){
      return;
    }

    if(isQPLikeForm(code)){
      const formulaToolbar=document.getElementById("adminQPFormulaNo");
      if(formulaToolbar?.value?.trim()){
        data.formula_no=formulaToolbar.value.trim();
      }
    }

    const recordInput=document.getElementById("exactRecordNo");
    const recordNo=(recordInput?.value||"").trim() || `${code}-${Date.now()}`;
    const body={record_no:recordNo,status:"DRAFT",data};
    if(code==="F-RD-002"){
      body.filed_month=document.getElementById("exactFiledMonth")?.value||currentYearMonth();
    }
    if(code==="F-RD-002.1"){
      body.filed_person_name=(document.getElementById("exactFiledPerson")?.value||"").trim()||null;
    }

    let result;
    if(window.editingSourceRecordId){
      result=await api(`/api/source-forms/record/${window.editingSourceRecordId}`,{
        method:"PUT",
        body
      });
      // PUT may not always return id in older records.
      result.id=result.id||window.editingSourceRecordId;
    }else{
      result=await api(`/api/source-forms/${encodeURIComponent(code)}`,{
        method:"POST",
        body
      });
      window.editingSourceRecordId=result.id;
    }

    if(recordInput && result?.record_no){
      recordInput.value=result.record_no;
    }

    toast(`บันทึก ${result?.record_no||recordNo} สำเร็จ`);

    // ADMIN-QP / ADMIN-INVOICE: Save first, then download the freshly saved Excel automatically.
    if(isQPLikeForm(code)){
      const recordId=result?.id || window.editingSourceRecordId;
      if(!recordId){
        throw new Error("บันทึกสำเร็จ แต่ไม่พบ Record ID สำหรับสร้าง Excel");
      }

      // Small delay allows UI/save transaction state to settle before export.
      await new Promise(resolve=>setTimeout(resolve,150));
      await exportSourceExcel(recordId);
    }

    if(typeof loadPrivateRecords==="function"){
      try{await loadPrivateRecords(code)}catch(_){}
    }

    return result;
  }catch(e){
    console.error("saveExactForm failed",e);
    toast("บันทึกไม่สำเร็จ: "+(e?.message||e));
    throw e;
  }
};

function sourceRecordRow(x){
  const owner=x.owner||window.formWorkspace?.display_name||"";
  const search=esc(`${x.record_no||""} ${owner}`.toLowerCase());
  return `<tr data-search="${search}"><td>${x.id}</td><td>${esc(x.record_no)}</td><td>${statusBadge(x.status)}</td><td>${esc(owner)}</td><td>${new Date(x.created_at).toLocaleString()}</td><td class="mini-actions"><button onclick="editOwnSourceRecord(${x.id})">แก้ไข</button><button onclick="exportSourceExcel(${x.id})">Excel ต้นฉบับ</button><button onclick="showRecordVersions('source_form',${x.id})">ประวัติ</button></td></tr>`;
}

// Generic client-side search box: filters every [data-search] row inside
// #pageContent by substring match, then hides any .card section whose
// rows are all filtered out (used by the grouped F-RD-002/F-RD-002.1
// views so an empty month/person section doesn't linger on screen).
function filterRecordRows(input){
  const q=(input.value||"").trim().toLowerCase();
  const cards=new Set();
  document.querySelectorAll("#pageContent tr[data-search]").forEach(tr=>{
    const match=!q||tr.dataset.search.includes(q);
    tr.classList.toggle("hidden",!match);
    const card=tr.closest(".card");
    if(card)cards.add(card);
  });
  cards.forEach(card=>{
    const anyVisible=[...card.querySelectorAll("tr[data-search]")].some(tr=>!tr.classList.contains("hidden"));
    const hasRows=card.querySelectorAll("tr[data-search]").length>0;
    card.classList.toggle("hidden",hasRows && !anyVisible && !!q);
  });
}
showSourceRecords=async function(code){
 const rows=await api(`/api/source-forms/${code}`);
 const header=`<div class="card-head"><div class="workspace-note">คุณกำลังอยู่ในพื้นที่ของ <b>${esc(window.formWorkspace?.display_name||"")}</b> — ระบบไม่แสดงฟอร์มของคนอื่น</div><div class="toolbar"><input class="search" placeholder="ค้นหาเลขที่รายการ..." oninput="filterRecordRows(this)"><button onclick="openPrivateExactForm('${code}')">← ฟอร์มใหม่ ${code}</button></div></div>`;

 // F-RD-002: group by the month the user chose to file each record under.
 if(code==="F-RD-002"){
   const groups=new Map();
   for(const x of rows){
     const k=x.filed_month||"";
     if(!groups.has(k))groups.set(k,[]);
     groups.get(k).push(x);
   }
   const sortedKeys=[...groups.keys()].sort((a,b)=>b.localeCompare(a));
   const sections=sortedKeys.length
     ? sortedKeys.map(k=>`<div class="card"><h3>${esc(monthLabel(k))} <small>(${groups.get(k).length} รายการ)</small></h3>${table(["ID","Record No.","Status","Owner","Saved","Action"],groups.get(k).map(sourceRecordRow))}</div>`).join("")
     : '<div class="card"><div class="empty">ยังไม่มีข้อมูล</div></div>';
   $("pageContent").innerHTML=`<div class="card">${header}</div>${sections}`;
   return;
 }

 // F-RD-002.1: group by the person the user chose to file each record under.
 if(code==="F-RD-002.1"){
   const groups=new Map();
   for(const x of rows){
     const k=x.filed_person_name||"";
     if(!groups.has(k))groups.set(k,[]);
     groups.get(k).push(x);
   }
   const sortedKeys=[...groups.keys()].sort((a,b)=>a.localeCompare(b,"th"));
   const sections=sortedKeys.length
     ? sortedKeys.map(k=>`<div class="card"><h3>${esc(k||"ไม่ระบุชื่อ")} <small>(${groups.get(k).length} รายการ)</small></h3>${table(["ID","Record No.","Status","Owner","Saved","Action"],groups.get(k).map(sourceRecordRow))}</div>`).join("")
     : '<div class="card"><div class="empty">ยังไม่มีข้อมูล</div></div>';
   $("pageContent").innerHTML=`<div class="card">${header}</div>${sections}`;
   return;
 }

 const tr=rows.map(sourceRecordRow);
 $("pageContent").innerHTML=`<div class="card">${header}${table(["ID","Record No.","Status","Owner","Saved","Action"],tr)}</div>`;
};




let fdaCodeMap=null;
async function ensureFDACodeMap(force=false){
  if(fdaCodeMap && !force)return fdaCodeMap;

  try{
    // Database is the source of truth.
    const live=await api("/api/fda-materials/map");
    fdaCodeMap=live||{};
    return fdaCodeMap;
  }catch(e){
    console.warn("FDA database map unavailable, using static fallback",e);
    try{
      const r=await fetch("/static/fda_codes.json?v=31.4");
      fdaCodeMap=r.ok ? await r.json() : {};
    }catch(_){
      fdaCodeMap={};
    }
    return fdaCodeMap;
  }
}



window.formulaVariantSelections = window.formulaVariantSelections || {};

function variantStateKey(group,index){
  return `${currentExactForm||""}:${group}:${index}`;
}
function setFormulaVariant(group,index,variantCode){
  window.formulaVariantSelections[variantStateKey(group,index)] =
    String(variantCode||"").trim().toUpperCase();
}
function getFormulaVariant(group,index,baseCode=""){
  return window.formulaVariantSelections[variantStateKey(group,index)] ||
    String(baseCode||"").trim().toUpperCase();
}

function splitMaterialVariantCode(v){
  const raw=String(v??"").trim().toUpperCase();

  // Preferred pattern: BASE.VARIANT (A0001.50)
  const m=raw.match(/^([A-Z]+\d{4})(?:[.](.+))?$/);
  if(m){
    return {
      base_code:m[1],
      variant_code:raw,
      variant:m[2]||""
    };
  }

  // Legacy three/short digit base: A001.50 -> A0001.50
  const legacy=raw.match(/^([A-Z]+)0*(\d{1,4})(?:[.](.+))?$/);
  if(legacy){
    const base=legacy[1]+legacy[2].slice(-4).padStart(4,"0");
    const variant=legacy[3]||"";
    return {
      base_code:base,
      variant_code:variant ? `${base}.${variant}` : base,
      variant
    };
  }

  const base=normalizeMaterialCodeValue(raw);
  return {base_code:base,variant_code:raw,variant:""};
}

function normalizeMaterialCodeValue(v){
  const raw=String(v??"").trim().toUpperCase();

  // Prefer the real ERP material-code pattern: letters + exactly 4 digits.
  // This prevents price/percentage fragments such as ".50" from becoming part of the code.
  const m=raw.match(/[A-Z]+\d{4}/);
  if(m)return m[0];

  // Fallback for legacy codes: strip obvious price suffixes after decimal/comma/space.
  return raw
    .replace(/\s+/g,"")
    .replace(/[.,]\d+$/,"")
    .replace(/[-/]\d+(?:\.\d+)?$/,"");
}

function normalizeFDAMaterialCode(v){
  return normalizeMaterialCodeValue(v);
}


function scheduleFDAFormulaLink(force=false){
  if(currentExactForm!=="F-RD-002" && currentExactForm!=="F-RD-002.1")return;
  setTimeout(()=>linkFDAForExactFormula(force),0);
  setTimeout(()=>linkFDAForExactFormula(force),150);
  setTimeout(()=>linkFDAForExactFormula(force),400);
}

async function updateFDAForMaterialCodeInput(codeEl){
  if(!codeEl)return;
  if(currentExactForm!=="F-RD-002" && currentExactForm!=="F-RD-002.1")return;

  const group=codeEl.dataset.group;
  const idx=codeEl.dataset.index;
  if(!["ingredients","inactive_ingredients"].includes(group))return;

  const fdaEl=document.querySelector(
    `.excel-input[data-group="${group}"][data-index="${idx}"][data-sub="fda_no"]`
  );
  if(!fdaEl){
    console.warn("[FDA LINK] FDA input not found",group,idx);
    return;
  }

  const raw=await ensureFDACodeMap();
  const normalized={};
  Object.entries(raw||{}).forEach(([k,v])=>{
    normalized[normalizeFDAMaterialCode(k)]=String(v??"").trim();
  });

  const code=normalizeFDAMaterialCode(codeEl.value);
  const linked=normalized[code]||"";

  // Material-code changes define the automatic FDA value.
  fdaEl.dataset.manualOverride="";
  fdaEl.value=linked;

  console.debug("[FDA LINK]",code,"=>",linked||"(not found)");
}

async function linkFDAForExactFormula(force=false){
  if(currentExactForm!=="F-RD-002" && currentExactForm!=="F-RD-002.1")return;

  const raw=await ensureFDACodeMap(force);
  const map={};
  Object.entries(raw||{}).forEach(([k,v])=>{
    map[normalizeFDAMaterialCode(k)]=String(v??"").trim();
  });

  for(const group of ["ingredients","inactive_ingredients"]){
    const codeInputs=document.querySelectorAll(
      `.excel-input[data-group="${group}"][data-sub="material_code"]`
    );

    codeInputs.forEach(codeEl=>{
      const idx=codeEl.dataset.index;
      const fdaEl=document.querySelector(
        `.excel-input[data-group="${group}"][data-index="${idx}"][data-sub="fda_no"]`
      );
      if(!fdaEl)return;

      const code=normalizeFDAMaterialCode(codeEl.value);
      const linked=map[code]||"";

      // Auto link follows material code unless user explicitly edited FDA field.
      if(force || fdaEl.dataset.manualOverride!=="1"){
        fdaEl.value=linked;
        if(force) fdaEl.dataset.manualOverride="";
      }
    });
  }
}



let fdaDbEditingId=null;

function fdaDbFields(){
  return [
    ["material_code","รหัสวัตถุดิบ"],
    ["supplier_category","หมวด Supplier"],
    ["product_name","Product name"],
    ["supplier_company","บริษัท Supplier"],
    ["supplier_code","รหัส Supplier"],
    ["coa","COA"],
    ["fda_number","FDA NUMBER"],
    ["registered_name","ชื่อขึ้นทะเบียนของสาร"],
    ["origin_country","ประเทศที่มา"],
    ["price_per_kg","ราคา / กก."],
    ["halal","Halal"],
    ["purity","PURITY"],
    ["assay","สารสำคัญ ASSAY"],
    ["ratio","อัตราส่วน"],
    ["percentage","เปอร์เซ็น %"],
    ["note","หมายเหตุ"],
    ["image_url","รูป / URL"]
  ];
}


async function importFDAMasterNow(){
  try{
    const result=await api("/api/fda-materials/seed",{method:"POST"});
    fdaCodeMap=null;
    toast(result?.result||"นำเข้า FDA master สำเร็จ");
    await loadFDADatabase();
  }catch(e){
    toast("นำเข้า FDA master ไม่สำเร็จ: "+(e?.message||e));
  }
}

let fdaDbCategory="";
let fdaDbCategoryPanelOpen=false;
async function openFDADatabase(){
  fdaDbEditingId=null;
  fdaDbCategory="";
  fdaDbCategoryPanelOpen=false;
  $("pageTitle").textContent="PURCHASE — FDA + รหัสสาร Database";
  $("pageSubtitle").textContent="ฐานข้อมูลกลาง FDA และรหัสสาร • จัดการโดย PURCHASE • R&D ใช้ฐานเดียวกันในการค้นหา";
  $("pageContent").innerHTML=`
    <div class="card fda-db-card">
      <div class="toolbar">
        <input id="fdaDbSearchCode" placeholder="ค้นหาด้วยรหัสสาร เช่น A0001" oninput="fdaDbDebouncedSearch()">
        <input id="fdaDbSearchName" placeholder="ค้นหาด้วยชื่อสาร / ชื่อขึ้นทะเบียน" oninput="fdaDbDebouncedSearch()">
        <div class="actions">
          <button id="fdaCategoryToggleBtn" onclick="toggleFDACategoryPanel()">เลือกหมวดหมู่ ▾</button>
          <button class="primary" onclick="openFDAMaterialEditor()">+ เพิ่มข้อมูล</button>
          <button onclick="loadFDADatabase()">รีเฟรช</button>
          <button onclick="importFDAMasterNow()">นำเข้า FDA Master</button>
        </div>
      </div>
      <div id="fdaDbCategoryTabs" class="fda-category-tabs hidden"></div>
      <div id="fdaDbEditor"></div>
      <div id="fdaDbTable"><div class="muted">กำลังโหลดฐานข้อมูล...</div></div>
    </div>`;
  await loadFDADatabase();
}

function toggleFDACategoryPanel(){
  fdaDbCategoryPanelOpen=!fdaDbCategoryPanelOpen;
  loadFDACategoryTabs();
}

async function loadFDACategoryTabs(){
  const box=document.getElementById("fdaDbCategoryTabs");
  const btn=document.getElementById("fdaCategoryToggleBtn");
  if(!box)return;
  box.classList.toggle("hidden",!fdaDbCategoryPanelOpen);
  if(btn)btn.textContent=fdaDbCategory?`หมวด: ${fdaDbCategory} ▾`:"เลือกหมวดหมู่ ▾";
  if(!fdaDbCategoryPanelOpen)return;
  try{
    const cats=await api("/api/fda-materials/categories");
    const tab=(label,value)=>`<button class="fda-cat-tab${fdaDbCategory===value?" active":""}" onclick="selectFDACategory('${esc(value)}')">${esc(label)}</button>`;
    box.innerHTML=[tab("ทั้งหมด",""),...cats.map(c=>tab(`${c.category} (${c.count})`,c.category))].join("");
  }catch{box.innerHTML="";}
}
function selectFDACategory(category){
  fdaDbCategory=category;
  fdaDbCategoryPanelOpen=false;
  loadFDACategoryTabs();
  loadFDADatabase();
}

let fdaDbSearchTimer=null;
function fdaDbDebouncedSearch(){
  clearTimeout(fdaDbSearchTimer);
  fdaDbSearchTimer=setTimeout(loadFDADatabase,250);
}

async function loadFDADatabase(){
  try{
    const code=document.getElementById("fdaDbSearchCode")?.value||"";
    const name=document.getElementById("fdaDbSearchName")?.value||"";
    const rows=await api(`/api/fda-materials?code=${encodeURIComponent(code)}&name=${encodeURIComponent(name)}&category=${encodeURIComponent(fdaDbCategory)}&limit=1000`);
    const headers=["รหัสสาร","หมวด Supplier","Product name","ชื่อขึ้นทะเบียนของสาร","บริษัท Supplier","รหัส Supplier","ประเทศที่มา","ราคา/กก.","Halal","COA","FDA NUMBER","PURITY","ASSAY","อัตราส่วน","เปอร์เซ็น %","หมายเหตุ","รูป","Spec อย.","จัดการ"];
    const tr=rows.map(x=>`<tr>
      <td><b>${esc(x.material_code)}</b></td>
      <td>${esc(x.supplier_category)}</td>
      <td>${esc(x.product_name)}</td>
      <td>${esc(x.registered_name)}</td>
      <td>${esc(x.supplier_company)}</td>
      <td>${esc(x.supplier_code)}</td>
      <td>${esc(x.origin_country)}</td>
      <td>${esc(x.price_per_kg)}</td>
      <td>${esc(x.halal)}</td>
      <td>${esc(x.coa)}</td>
      <td>${esc(x.fda_number)}</td>
      <td>${esc(x.purity)}</td>
      <td>${esc(x.assay)}</td>
      <td>${esc(x.ratio)}</td>
      <td>${esc(x.percentage)}</td>
      <td>${esc(x.note)}</td>
      <td>${x.image_url?`<a href="${esc(x.image_url)}" target="_blank" rel="noopener">เปิดรูป</a>`:""}</td>
      <td>${x.spec_url?`<button onclick="downloadFDASpec(${x.id})" title="${esc(x.spec_filename)}">ดาวน์โหลด Spec</button>`:'<span class="muted">ไม่มี</span>'}</td>
      <td class="mini-actions">
        <button onclick="openFDAMaterialEditor(${x.id})">แก้ไข</button>
        <button onclick="deleteFDAMaterial(${x.id},'${esc(x.material_code)}')">ลบ</button>
      </td>
    </tr>`);
    $("fdaDbTable").innerHTML=`<div class="fda-db-count">พบ ${rows.length} รายการ</div>${rows.length?table(headers,tr):`<div class="muted" style="padding:36px;text-align:center">ยังไม่มีข้อมูลใน PostgreSQL<br><button onclick="importFDAMasterNow()" style="margin-top:12px">นำเข้า FDA Master ตอนนี้</button></div>`}`;
  }catch(e){
    $("fdaDbTable").innerHTML=`<div class="error">โหลด FDA Database ไม่สำเร็จ: ${esc(e?.message||e)}</div>`;
  }
}

let fdaDbTierRows=[];
function renderFdaTierRows(){
  const box=document.getElementById("fdaTierRows");
  if(!box)return;
  box.innerHTML=fdaDbTierRows.map((t,i)=>`
    <div class="fda-tier-row">
      <input type="number" step="0.01" min="0" value="${esc(t.min_qty_kg??"")}" placeholder="ปริมาณขั้นต่ำ (กก.)" oninput="fdaDbTierRows[${i}].min_qty_kg=this.value">
      <input type="number" step="0.01" value="${esc(t.price_per_kg??"")}" placeholder="ราคา/กก. ที่ปริมาณนี้" oninput="fdaDbTierRows[${i}].price_per_kg=this.value">
      <button onclick="removeFdaTierRow(${i})">ลบ</button>
    </div>`).join("")
    || '<div class="muted">ยังไม่มีระดับราคาตามปริมาณ — จะใช้ "ราคา / กก." ปกติด้านบนเสมอ</div>';
}
function addFdaTierRow(){
  fdaDbTierRows.push({min_qty_kg:"",price_per_kg:""});
  renderFdaTierRows();
}
function removeFdaTierRow(i){
  fdaDbTierRows.splice(i,1);
  renderFdaTierRows();
}

async function openFDAMaterialEditor(id=null){
  fdaDbEditingId=id;
  let d={};
  if(id)d=await api(`/api/fda-materials/${id}`);
  fdaDbTierRows=(d.price_tiers||[]).map(t=>({...t}));
  let suppliers=[];
  try{suppliers=await api("/api/suppliers");}catch{}
  const fields=fdaDbFields().map(([key,label])=>`
    <div class="fda-field ${key==="note"||key==="coa"?"wide":""}">
      <label>${label}</label>
      ${key==="note"||key==="coa"
        ? `<textarea id="fda_${key}">${esc(d[key]||"")}</textarea>`
        : `<input id="fda_${key}" value="${esc(d[key]||"")}" placeholder="ใส่ข้อมูล" ${key==="supplier_code"?'list="fdaSupplierCodeList"':""}>`}
    </div>`).join("");
  $("fdaDbEditor").innerHTML=`
    <div class="fda-editor">
      <div class="fda-editor-title" id="fdaEditorTitle">${id?"แก้ไข FDA / รหัสสาร":"เพิ่ม FDA / รหัสสารใหม่"}</div>
      <div class="fda-editor-grid">${fields}</div>
      <datalist id="fdaSupplierCodeList">${suppliers.map(s=>`<option value="${esc(s.supplier_code)}">${esc(s.name)}</option>`).join("")}</datalist>
      <div class="fda-tier-section">
        <div class="fda-editor-title">ราคาตามปริมาณ (สารรหัส/FDA เดียวกัน ปริมาณต่างกัน ราคาต่างกัน)</div>
        <div id="fdaTierRows"></div>
        <button onclick="addFdaTierRow()">+ เพิ่มระดับราคา</button>
      </div>
      <div class="fda-tier-section">
        <div class="fda-editor-title">แนบ Spec อย. (PDF / รูปภาพ จาก Supplier)</div>
        <input id="fda_spec_file" type="file" accept="application/pdf,image/*">
        ${d.spec_url?`<div style="margin-top:6px"><button onclick="downloadFDASpec(${id})">ดาวน์โหลดไฟล์ปัจจุบัน: ${esc(d.spec_filename||"spec")}</button> <button onclick="removeFDASpec(${id})">ลบไฟล์</button></div>`:'<div class="muted" style="margin-top:6px">ยังไม่มีไฟล์แนบ</div>'}
      </div>
      <div class="actions">
        <button class="primary" onclick="saveFDAMaterial()">บันทึกข้อมูล</button>
        <button onclick="openSupplierCodeManager()">จัดการรหัส Supplier</button>
        <button onclick="closeFDAEditor()">ยกเลิก</button>
      </div>
    </div>`;
  renderFdaTierRows();
  document.getElementById("fda_material_code")?.focus();
  // Only while adding a brand-new record: as the code is typed, check if it
  // already exists and auto-link the existing data in instead of making the
  // user re-type everything (and instead of erroring at save time).
  if(!id){
    document.getElementById("fda_material_code")?.addEventListener("input",fdaDbDebouncedAutoLink);
  }
}

function closeFDAEditor(){
  fdaDbEditingId=null;
  if($("fdaDbEditor"))$("fdaDbEditor").innerHTML="";
}

let fdaDbAutoLinkTimer=null;
function fdaDbDebouncedAutoLink(){
  clearTimeout(fdaDbAutoLinkTimer);
  fdaDbAutoLinkTimer=setTimeout(fdaDbTryAutoLink,400);
}
async function fdaDbTryAutoLink(){
  const raw=(document.getElementById("fda_material_code")?.value||"").trim();
  const titleEl=document.getElementById("fdaEditorTitle");
  if(!raw)return;
  let found=null;
  try{found=await api(`/api/fda-materials/lookup/${encodeURIComponent(raw)}`);}catch{found=null;}
  if(found && found.id){
    for(const [key] of fdaDbFields()){
      if(key==="material_code")continue;
      const el=document.getElementById(`fda_${key}`);
      if(el)el.value=found[key]||"";
    }
    fdaDbTierRows=(found.price_tiers||[]).map(t=>({...t}));
    renderFdaTierRows();
    fdaDbEditingId=found.id;
    if(titleEl)titleEl.textContent=`แก้ไข FDA / รหัสสาร (พบรหัส ${esc(found.material_code)} อยู่แล้ว — ลิงก์ข้อมูลเดิมมาให้)`;
    toast(`พบรหัส ${found.material_code} อยู่แล้ว ลิงก์ข้อมูลเดิมมาให้แล้ว ไม่ต้องกรอกใหม่`);
  }else if(fdaDbEditingId){
    // Was auto-linked to something a moment ago, but the code no longer
    // matches any existing record — back to creating a genuinely new one.
    fdaDbEditingId=null;
    fdaDbTierRows=[];
    renderFdaTierRows();
    if(titleEl)titleEl.textContent="เพิ่ม FDA / รหัสสารใหม่";
  }
}

async function openSupplierCodeManager(){
  openModal("จัดการรหัส Supplier","กำลังโหลด...");
  await renderSupplierCodeManager();
}
async function renderSupplierCodeManager(){
  let suppliers=[];
  try{suppliers=await api("/api/suppliers");}catch(e){$("modalBody").innerHTML=`<div class="error">โหลดไม่สำเร็จ: ${esc(e?.message||e)}</div>`;return;}
  const trRows=suppliers.map(s=>`<tr>
    <td><input id="sup_code_${s.id}" value="${esc(s.supplier_code)}" style="width:110px"></td>
    <td><input id="sup_name_${s.id}" value="${esc(s.name)}"></td>
    <td><input id="sup_country_${s.id}" value="${esc(s.country||"")}" style="width:110px"></td>
    <td class="mini-actions">
      <button onclick="saveSupplierCode(${s.id})">บันทึก</button>
      <button onclick="deleteSupplierCode(${s.id})">ลบ</button>
    </td>
  </tr>`);
  $("modalBody").innerHTML=`
    <div class="fda-editor-title">เพิ่มรหัส Supplier ใหม่</div>
    <div class="fda-editor-grid">
      <div class="fda-field"><label>รหัส Supplier</label><input id="newSupCode" placeholder="เช่น SUP-001"></div>
      <div class="fda-field"><label>ชื่อ Supplier</label><input id="newSupName"></div>
      <div class="fda-field"><label>ประเทศ</label><input id="newSupCountry"></div>
    </div>
    <div class="actions"><button class="primary" onclick="addSupplierCode()">+ เพิ่ม Supplier</button></div>
    <div style="margin-top:14px">${table(["รหัส Supplier","ชื่อ","ประเทศ","จัดการ"],trRows)}</div>
  `;
}
async function addSupplierCode(){
  const supplier_code=$("newSupCode")?.value?.trim();
  const name=$("newSupName")?.value?.trim();
  const country=$("newSupCountry")?.value?.trim()||null;
  if(!supplier_code||!name){toast("กรอกรหัสและชื่อ Supplier ก่อน");return;}
  try{
    await api("/api/suppliers",{method:"POST",body:{supplier_code,name,country}});
    toast("เพิ่ม Supplier แล้ว");
    await renderSupplierCodeManager();
  }catch(e){toast("เพิ่มไม่สำเร็จ: "+(e?.message||e));}
}
async function saveSupplierCode(id){
  const supplier_code=$(`sup_code_${id}`)?.value?.trim();
  const name=$(`sup_name_${id}`)?.value?.trim();
  const country=$(`sup_country_${id}`)?.value?.trim()||null;
  if(!supplier_code||!name){toast("กรอกรหัสและชื่อ Supplier ก่อน");return;}
  try{
    await api(`/api/suppliers/${id}`,{method:"PUT",body:{supplier_code,name,country}});
    toast("บันทึกแล้ว");
    await renderSupplierCodeManager();
  }catch(e){toast("บันทึกไม่สำเร็จ: "+(e?.message||e));}
}
async function deleteSupplierCode(id){
  if(!confirm("ลบ Supplier นี้?"))return;
  try{
    await api(`/api/suppliers/${id}`,{method:"DELETE"});
    toast("ลบแล้ว");
    await renderSupplierCodeManager();
  }catch(e){toast("ลบไม่สำเร็จ: "+(e?.message||e));}
}

async function saveFDAMaterial(){
  try{
    const body={};
    for(const [key] of fdaDbFields()){
      body[key]=document.getElementById(`fda_${key}`)?.value||"";
    }
    if(!body.material_code.trim())throw new Error("กรุณาใส่รหัสวัตถุดิบ");
    body.price_tiers=fdaDbTierRows
      .filter(t=>String(t.min_qty_kg||"").trim()!=="" && String(t.price_per_kg||"").trim()!=="")
      .map(t=>({min_qty_kg:Number(t.min_qty_kg)||0,price_per_kg:Number(t.price_per_kg)}));
    let saved;
    if(fdaDbEditingId){
      saved=await api(`/api/fda-materials/${fdaDbEditingId}`,{method:"PUT",body});
    }else{
      saved=await api("/api/fda-materials",{method:"POST",body});
    }
    const specFile=document.getElementById("fda_spec_file")?.files?.[0];
    if(specFile){
      try{ await uploadFDASpec(saved.id,specFile); }
      catch(e){ toast("บันทึกข้อมูลสำเร็จ แต่แนบ Spec ไม่สำเร็จ: "+(e?.message||e)); }
    }
    // Clear cached FDA map so formula forms see the new/edited record immediately.
    fdaCodeMap=null;
    toast("บันทึกฐาน FDA / รหัสสารสำเร็จ");
    closeFDAEditor();
    await loadFDADatabase();
  }catch(e){
    toast("บันทึก FDA Database ไม่สำเร็จ: "+(e?.message||e));
  }
}

async function deleteFDAMaterial(id,code){
  if(!confirm(`ลบข้อมูล ${code} ใช่หรือไม่?`))return;
  try{
    await api(`/api/fda-materials/${id}`,{method:"DELETE"});
    fdaCodeMap=null;
    toast("ลบข้อมูลแล้ว");
    await loadFDADatabase();
  }catch(e){
    toast("ลบไม่สำเร็จ: "+(e?.message||e));
  }
}

async function uploadFDASpec(id,file){
  const fd=new FormData();
  fd.append("file",file);
  const headers={};
  if(token)headers.Authorization="Bearer "+token;
  const r=await fetch(`/api/fda-materials/${id}/spec`,{method:"POST",headers,body:fd});
  if(!r.ok){
    let msg=`HTTP ${r.status}`;
    try{const d=await r.json();msg=d?.detail||msg;}catch{}
    throw new Error(msg);
  }
  return r.json();
}
async function downloadFDASpec(id){
  await exportExcel(`/api/fda-materials/${id}/spec`);
}
async function removeFDASpec(id){
  if(!confirm("ลบไฟล์ Spec ที่แนบไว้?"))return;
  try{
    await api(`/api/fda-materials/${id}/spec`,{method:"DELETE"});
    toast("ลบไฟล์ Spec แล้ว");
    await openFDAMaterialEditor(id);
  }catch(e){toast("ลบไม่สำเร็จ: "+(e?.message||e));}
}

const DEPARTMENTS=[
 {code:"RD",name:"R&D",desc:"สูตร / สูตรผลิต / Tester / Rate"},
 {code:"ADMIN",name:"ADMIN",desc:"ผู้ใช้ เอกสาร และระบบกลาง"},
 {code:"SALE",name:"SALE",desc:"ความต้องการลูกค้า / Customer"},
 {code:"JOB",name:"JOB",desc:"ติดตามงานและ Job Order"},
 {code:"PLANNING",name:"PLANNING",desc:"แผนการผลิตและ MRP"},
 {code:"STOCK",name:"STOCK",desc:"วัตถุดิบและคลังสินค้า"},
 {code:"PURCHASE",name:"PURCHASE",desc:"จัดซื้อและ Supplier"},
 {code:"PRODUCTION",name:"PRODUCTION",desc:"สูตรผลิตและ Production Order"},
 {code:"GRAPHIC",name:"GRAPHIC",desc:"งานออกแบบและบรรจุภัณฑ์"},
 {code:"QC",name:"QC",desc:"ตรวจสอบคุณภาพการผลิต"},
 {code:"QUALITY",name:"QUALITY",desc:"ระบบคุณภาพ / เอกสาร / FDA"},
 {code:"CEO",name:"CEO",desc:"ภาพรวมบริษัทและ AI Insights"}
];
let currentDepartment=localStorage.getItem("department")||null;
function allowedDepartments(){
 // ADMIN/CEO can always see every department. Otherwise prefer the real
 // employee's own department (set on their account) over the old role->department
 // guess, so one real person can be created in any department regardless of role.
 if(["ADMIN","CEO"].includes(me?.role))return DEPARTMENTS.map(x=>x.code);
 if(me?.department)return [me.department];
 const roleMap={RD_HEAD:["RD"],RD_ASSISTANT:["RD"],RD_OFFICER:["RD"],SALES:["SALE"],JOB:["JOB"],PLANNING:["PLANNING"],STOCK:["STOCK"],PURCHASE:["PURCHASE"],PRODUCTION:["PRODUCTION"],GRAPHIC:["GRAPHIC"],QC:["QC"],QUALITY:["QUALITY"]};
 return roleMap[me?.role]||[];
}
function renderDepartmentPortal(){
 if($("portalUserName")) $("portalUserName").textContent=me?.full_name||"-"; if($("portalUserRole")) $("portalUserRole").textContent=me?.role||"-";
 const allowed=allowedDepartments();
 const items=DEPARTMENTS.filter(d=>allowed.includes(d.code));
 $("departmentGrid").innerHTML=items.map((d,i)=>`<button class="department-card" onclick="enterDepartment('${d.code}')"><div class="department-index">${String(i+1).padStart(2,"0")}</div><div class="department-card-body"><b>${d.name}</b><span>${d.desc}</span></div><div class="department-arrow">→</div></button>`).join("");
}

async function enterDepartmentUnlocked(code){
 if(!allowedDepartments().includes(code)){toast("บัญชีนี้ไม่มีสิทธิ์เข้าแผนก "+code);return;}
 currentDepartment=code;localStorage.setItem("department",code);$("departmentPortal").classList.add("hidden");$("appShell").classList.remove("hidden");$("currentDepartment").textContent=me?.full_name?`${code} • ${me.full_name}`:code;
 document.querySelectorAll(".dept-menu").forEach(x=>x.classList.toggle("dept-visible",x.dataset.dept===code));document.querySelectorAll(".dept-common").forEach(x=>x.classList.add("dept-visible"));
 refreshWorkInboxBadge();
 if(code==="CEO")await openPage("dashboard");else await openDepartmentWorkspace(code);
}
function backToDepartments(){currentDepartment=null;localStorage.removeItem("department");$("appShell").classList.add("hidden");$("departmentPortal").classList.remove("hidden");renderDepartmentPortal();}
async function openDepartmentWorkspace(code){
 const configs={
 RD:{title:"R&D",text:"จัดการสูตร สูตรผลิต Tester และ Rate",cards:[["F-RD-002 สูตร","แบบฟอร์มสูตร R&D","openExactForm('F-RD-002')"],["F-RD-002.1 สูตรผลิต","สูตรสำหรับผลิตจริง","openExactForm('F-RD-002.1')"],["F-RD-003 Tester","ขอทำสินค้าทดลอง","openExactForm('F-RD-003')"],["F-RD-004 Rate","ขอเรทราคา","openExactForm('F-RD-004')"]]},
 SALE:{title:"SALE",text:"รับความต้องการลูกค้าและส่งต่อ R&D",cards:[["F-RD-001 Customer Requirement","รายละเอียดผลิตภัณฑ์ตามความต้องการของลูกค้า","openExactForm('F-RD-001')"],["Customers","ฐานข้อมูลลูกค้า","openPage('customers')"],["Product Development","ติดตามโครงการลูกค้า","openPage('projects')"]]},
 ADMIN:{title:"ADMIN",text:"บริหารผู้ใช้ เอกสาร และข้อมูลกลาง",cards:[["QP / Quotation","ฟอร์ม QP ต้นฉบับ • ลิงก์สูตร / คำนวณอัตโนมัติ","openExactForm('ADMIN-QP')"],["Invoice / ใบแจ้งหนี้","Layout เดียวกับ QP • ใช้ออกใบแจ้งหนี้","openExactForm('ADMIN-INVOICE')"],["Job Description","ฟอร์ม JL ต้นฉบับ • สูตร บรรจุภัณฑ์ ผู้รับผิดชอบออกแบบ/อย.","openExactForm('ADMIN-JOB')"],["Users / Audit","จัดการผู้ใช้และประวัติระบบ","openPage('admin')"],["Original Forms","เอกสารต้นฉบับ","openPage('originalForms')"],["Customers","ฐานข้อมูลลูกค้า","openPage('customers')"]]},
 PLANNING:{title:"PLANNING",text:"วางแผนการผลิตและตรวจ MRP",cards:[["Production / MRP","แผนผลิตและวัตถุดิบที่ต้องใช้","openPage('production')"]]},
 STOCK:{title:"STOCK",text:"จัดการ Stock และวัตถุดิบ",cards:[["Inventory","Stock / Reserved / Available","openPage('inventory')"],["Raw Materials","ฐานวัตถุดิบ","openPage('materials')"],["ใบขอซื้อ (PR)","ขอซื้อวัตถุดิบจากจัดซื้อ","listPurchaseDocs('PR')"]]},
 PURCHASE:{title:"PURCHASE",text:"Supplier การจัดซื้อ และฐานข้อมูลวัตถุดิบกลาง",cards:[["FDA + รหัสสาร Database","ฐานเดียวสำหรับ FDA / รหัสสาร / ชื่อขึ้นทะเบียน / Supplier / ประเทศ / ราคา","openFDADatabase()"],["Package Database","ฐาน Package กลาง • ราคาจริง = ต้นทุน+20%","openPackageDatabase()"],["Suppliers","ฐาน Supplier","openPage('suppliers')"],["Stock Requirement","ตรวจความต้องการวัตถุดิบ","openPage('inventory')"],["ใบสั่งซื้อ (PO)","ส่งให้ผู้จำหน่ายภายนอก","listPurchaseDocs('PO')"],["ใบขอซื้อ (PR)","ที่คลังส่งเข้ามา","listPurchaseDocs('PR')"]]},
 PRODUCTION:{title:"PRODUCTION",text:"สูตรผลิตและคำสั่งผลิต",cards:[["สูตรผลิต","F-RD-002.1","openExactForm('F-RD-002.1')"],["Production / MRP","คำสั่งผลิต","openPage('production')"]]},
 QUALITY:{title:"QUALITY",text:"ระบบคุณภาพ เอกสาร และการขึ้นทะเบียน",cards:[["Registration / FDA","สูตรขึ้นทะเบียน","openPage('registration')"],["Quality Data","ให้ใส่ Data สำหรับ QUALITY","openDepartmentPlaceholder('QUALITY')"]]},
 QC:{title:"QC",text:"ตรวจสอบคุณภาพสินค้า",cards:[["QC Data","ให้ใส่ Data สำหรับ QC","openDepartmentPlaceholder('QC')"]]},
 JOB:{title:"JOB",text:"พื้นที่จัดการงาน",cards:[["JOB Data","ให้ใส่ Data สำหรับ JOB","openDepartmentPlaceholder('JOB')"]]},
 GRAPHIC:{title:"GRAPHIC",text:"พื้นที่งานออกแบบ",cards:[["GRAPHIC Data","ให้ใส่ Data สำหรับ GRAPHIC","openDepartmentPlaceholder('GRAPHIC')"]]}
 };
 const c=configs[code]||{title:code,text:"พื้นที่ทำงาน",cards:[[`${code} Data`,`ให้ใส่ Data สำหรับ ${code}`,`openDepartmentPlaceholder('${code}')`]]};
 $("pageTitle").textContent=c.title;$("pageSubtitle").textContent=c.text;$("pageContent").innerHTML=`<div class="department-workspace-grid">${c.cards.map(x=>`<button class="workspace-feature-card" onclick="${x[2]}"><b>${x[0]}</b><span>${x[1]}</span><i>→</i></button>`).join("")}</div>`;
}
function openDepartmentPlaceholder(code){$("pageTitle").textContent=code;$("pageSubtitle").textContent=`พื้นที่ระบบ ${code}`;$("pageContent").innerHTML=`<div class="card department-placeholder"><h2>${code} Department</h2><div class="need-data">ให้ใส่ Data</div><p>พื้นที่นี้เตรียมไว้สำหรับเพิ่ม Workflow และแบบฟอร์มของแผนก ${code} ภายหลัง</p></div>`;}
function showAllDepartmentOverview(){$("pageTitle").textContent="Department Overview";$("pageSubtitle").textContent="ภาพรวมทุกแผนกสำหรับ CEO";$("pageContent").innerHTML=`<div class="department-overview">${DEPARTMENTS.filter(x=>x.code!=="CEO").map(x=>`<div class="dept-overview-card"><b>${x.name}</b><span>${x.desc}</span><button onclick="enterDepartment('${x.code}')">เปิดแผนก</button></div>`).join("")}</div>`;}

// v13: each department has four separate login accounts.
// The logged-in account is the owner, so no second PIN gate is needed.
openExactFormAccount = async function(code){
    window.formWorkspace = {
        workspace_user_id: me?.id || window.loginUserInfo?.id,
        display_name: me?.full_name || window.loginUserInfo?.name || "ผู้ใช้งาน",
        slot_no: window.loginUserInfo?.person_no || 1,
        workspace_token: "account-owner"
    };
    return openPrivateExactForm(code);
};

window.formulaIngredientCount = window.formulaIngredientCount || {};

function formulaMaxIngredients(code){
  if(code==="F-RD-002" || code==="F-RD-002.1")return Number.POSITIVE_INFINITY;
  return null;
}
window.formulaInactiveIngredientCount = window.formulaInactiveIngredientCount || {};
function selectedInactiveIngredientCount(code){
  if(code!=="F-RD-002")return 0;
  let n=Number(window.formulaInactiveIngredientCount?.[code]||3);
  if(!Number.isFinite(n))n=3;
  return Math.max(1,Math.floor(n));
}

async function askFormulaIngredientCount(code){
  if(code!=="F-RD-002" && code!=="F-RD-002.1")return openExactFormAccount(code);
  const current=Math.max(1,Number(window.formulaIngredientCount[code]||1));
  const inactiveField=code==="F-RD-002"?`
      <h3>ส่วนประกอบที่ไม่สำคัญ (Inactive Ingredient) กี่ตัว?</h3>
      <p>ต้นฉบับมี 3 แถว — พิมพ์มากกว่านี้ได้ ไม่จำกัดจำนวนเช่นกัน</p>
      <input id="formulaInactiveIngredientCountInput" type="number" min="1" step="1" value="${selectedInactiveIngredientCount(code)}" placeholder="เช่น 3, 5, 10">
  `:"";
  openModal(`จำนวนสารใน ${code}`,`
    <div class="ingredient-count-dialog">
      <h3>ต้องการใช้สารกี่ตัว?</h3>
      <p>ไม่จำกัดจำนวนสาร — แถวที่เกินจากฟอร์มเดิมจะต่อท้ายแถวสารสุดท้าย</p>
      <input id="formulaIngredientCountInput" type="number" min="1" step="1" value="${current}" placeholder="เช่น 5, 25, 50, 100">
      <div class="ingredient-count-hint">ไม่จำกัดจำนวนสาร</div>
      ${inactiveField}
      <button class="primary full" onclick="confirmFormulaIngredientCount('${code}')">เปิดฟอร์ม</button>
    </div>`);
}
async function confirmFormulaIngredientCount(code){
  let n=Number(document.getElementById("formulaIngredientCountInput")?.value||1);
  if(!Number.isFinite(n))n=1;
  n=Math.max(1,Math.floor(n));
  window.formulaIngredientCount ??= {}; window.formulaIngredientCount[code]=n;
  if(code==="F-RD-002"){
    let ni=Number(document.getElementById("formulaInactiveIngredientCountInput")?.value||3);
    if(!Number.isFinite(ni))ni=3;
    window.formulaInactiveIngredientCount[code]=Math.max(1,Math.floor(ni));
  }
  closeModal();
  return openExactFormAccount(code);
}


openExactForm = async function(code){
  if(isQPLikeForm(code)){
    return openExactFormAccount(code);
  }
  if(code==="F-RD-002" || code==="F-RD-002.1"){
    return askFormulaIngredientCount(code);
  }
  if(!isExactFormCode(code)){
    toast("ไม่พบแบบฟอร์ม "+code);
    return;
  }
  return openExactFormAccount(code);
};

function departmentFromUsername(username){
 const u=(username||"").toLowerCase();
 const prefixes=["planning","production","purchase","quality","graphic","stock","sale","job","qc","rd","ceo","admin"];
 for(const p of prefixes) if(u===p || u.startsWith(p)) return p==="sale"?"SALE":p.toUpperCase();
 return null;
}


// Logging in with a real employee account IS the department/identity check
// now -- no more per-department PIN, no more "choose คนที่ 1-4 + PIN" gate.
// enterDepartment() is kept only as the name every call site already uses.
async function enterDepartment(code){
  await enterDepartmentUnlocked(code);
}


function ingredientEl(i,sub){
 return document.querySelector(`.excel-input[data-group="ingredients"][data-index="${i}"][data-sub="${sub}"]`);
}
function ingredientNum(i,sub){return readNumber(ingredientEl(i,sub));}
function setIngredientAuto(i,sub,value,digits=6){
 const el=ingredientEl(i,sub);
 setAutoEditable(el,value,digits);
}


let lastAIFormulaDraft=null;
let lastAIFormulaContext=null;
let lastAIFormulaFeedbackSaved=false;

function formValueByKey(key){
  return document.querySelector(`.excel-input[data-key="${key}"]`)?.value||"";
}

async function openAIFormulaAssistant(code){
  if(code!=="F-RD-002" && code!=="F-RD-002.1")return;
  const count=Math.max(1,Number(window.formulaIngredientCount?.[code]||5));
  openModal(`AI คิดสูตรร่าง — ${code}`,`
    <div class="ai-formula-modal">
      <div class="ai-safe-note">AI จะเลือกสารจากฐานรหัสสารจริงในระบบ แต่จะไม่กำหนดปริมาณรับประทานหรือ mg แทน R&D</div>
      <div class="form-grid">
        <div><label>ชื่อผลิตภัณฑ์</label><input id="ai_product_name" value="${esc(formValueByKey("product_name_fda"))}" placeholder="เช่น Brain Support"></div>
        <div><label>ประเภทผลิตภัณฑ์</label><input id="ai_product_type" value="${esc(formValueByKey("product_type"))}" placeholder="Capsule / Powder / Tablet ..."></div>
        <div class="wide"><label>เป้าหมาย / Concept</label><textarea id="ai_objective" placeholder="อธิบายสิ่งที่ต้องการให้ AI ช่วยเลือกสาร"></textarea></div>
        <div class="wide"><label>Requirement ลูกค้า</label><textarea id="ai_requirement" placeholder="เงื่อนไขจากลูกค้า เช่น รูปแบบสินค้า กลุ่มวัตถุดิบที่ต้องการ/ไม่ต้องการ"></textarea></div>
        <div><label>จำนวนสารที่ต้องการในสูตรร่าง</label><input id="ai_count" type="number" min="1" step="1" value="${count}"></div>
        <div><label>ราคาเป้าหมาย (ถ้ามี)</label><input id="ai_target_price" type="number" step="0.01" placeholder="บาท/หน่วย"></div>
        <div class="wide"><label>หมายเหตุเพิ่มเติม</label><textarea id="ai_notes" placeholder="เช่น ต้องการ Halal, หลีกเลี่ยงวัตถุดิบบางประเภท"></textarea></div>
      </div>
      <div class="ai-actions"><button class="primary" onclick="generateAIFormulaDraft('${code}')">ให้ AI คิดสูตรร่าง</button></div>
      <div id="aiFormulaResult"></div>
    </div>`);
}

async function generateAIFormulaDraft(code){
  const box=document.getElementById("aiFormulaResult");
  box.innerHTML='<div class="ai-loading">กำลังวิเคราะห์ Requirement, ฐานรหัสสาร และ Feedback ของ R&D...</div>';
  try{
    const requestBody={
      form_code:code,
      product_name:document.getElementById("ai_product_name")?.value||null,
      product_type:document.getElementById("ai_product_type")?.value||null,
      objective:document.getElementById("ai_objective")?.value||null,
      customer_requirement:document.getElementById("ai_requirement")?.value||null,
      target_price:Number(document.getElementById("ai_target_price")?.value||0)||null,
      desired_ingredient_count:Math.max(1,Math.floor(Number(document.getElementById("ai_count")?.value||5))),
      notes:document.getElementById("ai_notes")?.value||null
    };
    const data=await api("/api/ai/formula-draft",{method:"POST",body:requestBody});
    lastAIFormulaDraft=data;
    lastAIFormulaContext=requestBody;
    lastAIFormulaFeedbackSaved=false;

    const rows=(data.ingredients||[]).map((x,i)=>`<tr>
      <td>${i+1}</td>
      <td><b>${esc(x.variant_code||x.code||"")}</b></td>
      <td>${esc(x.name||"")}</td>
      <td>${esc(x.reason||"")}</td>
      <td>${esc(x.supplier||"")}</td>
      <td>${esc(x.import_country||"")}</td>
      <td>${x.price_kg??"-"}</td>
      <td>${esc(x.halal||"")}</td>
      <td><span class="need-data">R&D ใส่เอง</span></td>
      <td class="ai-feedback-cell">
        <textarea data-ai-feedback="${i}" placeholder="เว้นว่าง = ถูกต้อง / ถ้าผิดให้บอกเหตุผล เช่น ไม่ควรเสนอสารนี้เพราะ..."></textarea>
      </td>
    </tr>`).join("");

    box.innerHTML=`
      <div class="ai-result-card">
        <div class="ai-result-head">
          <b>${data.mode==="openai"?"AI Formula Draft":"AI-assisted Draft"}</b>
          <span>${esc(data.summary||"")}</span>
        </div>
        <div class="ai-learning-note">
          AI ใช้ Feedback ที่เกี่ยวข้อง ${Number(data.feedback_examples_used||0)} รายการในการคิดครั้งนี้<br>
          <b>กติกา:</b> ไม่คอมเมนต์ = สารนี้ถูกต้องในบริบทนี้ • มีคอมเมนต์ = บันทึกเป็นข้อผิดพลาดให้ AI เรียนรู้
        </div>
        <div class="table-wrap"><table><thead><tr>
          <th>#</th><th>Code</th><th>สาร</th><th>เหตุผลที่เสนอ</th><th>Supplier</th><th>Import</th><th>ราคา/kg</th><th>Halal</th><th>ปริมาณ</th><th>คอมเมนต์สอน AI</th>
        </tr></thead><tbody>${rows}</tbody></table></div>
        <div class="ai-warning-list">${(data.warnings||[]).map(w=>`<div>• ${esc(w)}</div>`).join("")}</div>
        <div class="ai-actions">
          <button onclick="saveAIFormulaFeedback('${code}')">บันทึก Feedback ให้ AI</button>
          <button class="primary" onclick="applyAIFormulaDraft('${code}')">นำสารที่ AI เลือกใส่ฟอร์ม</button>
        </div>
        <div id="aiFeedbackStatus"></div>
      </div>`;
  }catch(e){
    box.innerHTML=`<div class="card error">${esc(e.message||String(e))}</div>`;
  }
}

async function saveAIFormulaFeedback(code,quiet=false){
  if(!lastAIFormulaDraft?.ingredients?.length || !lastAIFormulaContext)return null;
  try{
    const items=lastAIFormulaDraft.ingredients.map((x,i)=>(
      {
        material_code:x.code||"",
        material_name:x.name||"",
        suggested_reason:x.reason||"",
        comment:(document.querySelector(`[data-ai-feedback="${i}"]`)?.value||"").trim()
      }
    ));
    const result=await api("/api/ai/formula-feedback",{method:"POST",body:{
      form_code:code,
      product_name:lastAIFormulaContext.product_name,
      product_type:lastAIFormulaContext.product_type,
      objective:lastAIFormulaContext.objective,
      customer_requirement:lastAIFormulaContext.customer_requirement,
      items
    }});
    lastAIFormulaFeedbackSaved=true;
    const status=document.getElementById("aiFeedbackStatus");
    if(status)status.innerHTML=`<div class="ai-feedback-saved">บันทึกการเรียนรู้แล้ว ${result.saved} รายการ • ผ่าน ${result.accepted} • มีคอมเมนต์แก้ไข ${result.rejected}</div>`;
    if(!quiet)toast(`AI Feedback: ผ่าน ${result.accepted} / แก้ไข ${result.rejected}`);
    return result;
  }catch(e){
    if(!quiet)toast("บันทึก Feedback AI ไม่สำเร็จ: "+(e?.message||e));
    return null;
  }
}

async function applyAIFormulaDraft(code){
  if(!lastAIFormulaFeedbackSaved)await saveAIFormulaFeedback(code,true);
  const items=lastAIFormulaDraft?.ingredients||[];
  if(!items.length)return;
  const visibleCount=Math.max(1,Number(window.formulaIngredientCount?.[code]||1));
  if(items.length>visibleCount){
    toast(`ฟอร์มมี ${visibleCount} แถว แต่ AI เลือก ${items.length} สาร กรุณาเปิดฟอร์มใหม่และเลือกจำนวนแถวอย่างน้อย ${items.length}`);
    return;
  }
  items.forEach((x,i)=>{
    const item={code:x.code,name:x.name,vendor:x.supplier,origin:x.import_country,price:x.price_kg,halal:x.halal};
    applyLinkedMaterial(i,item);
  });
  closeModal();
  if(typeof recalculateFormulaBoth==="function")recalculateFormulaBoth();
  toast(`นำสูตรร่าง ${items.length} สารใส่ฟอร์มแล้ว — กรุณาใส่/ตรวจปริมาณโดย R&D`);
}


// LIVE RECALC: every change to quantity or price/kg recalculates immediately.


async function refreshFormulaFDALink(){
  fdaCodeMap=null;
  await linkFDAForExactFormula(true);
  toast("อัปเดต FDA จากฐานข้อมูลแล้ว");
}

window.testFDALink=async function(code){
  const raw=await ensureFDACodeMap(true);
  const normalized={};
  Object.entries(raw||{}).forEach(([k,v])=>{
    normalized[normalizeFDAMaterialCode(k)]=String(v??"").trim();
  });
  const key=normalizeFDAMaterialCode(code);
  const result=normalized[key]||"";
  console.log("[FDA TEST]",key,result);
  return result;
};


document.addEventListener("change",function(e){
  const el=e.target;
  if(!el?.classList?.contains("excel-input"))return;

  if(
    el.dataset.sub==="material_code" &&
    (el.dataset.group==="ingredients" || el.dataset.group==="inactive_ingredients")
  ){
    captureTypedMaterialVariant(el);
    updateFDAForMaterialCodeInput(el);
  }
},true);


document.addEventListener("input",function(e){
  const el=e.target;
  if(!el?.classList?.contains("excel-input"))return;

  if(
    el.dataset.sub==="material_code" &&
    (el.dataset.group==="ingredients" || el.dataset.group==="inactive_ingredients")
  ){
    if(/^[A-Za-z]+\d{4}(?:\..+)?$/.test(String(el.value||"").trim())){
      captureTypedMaterialVariant(el);
    }
    updateFDAForMaterialCodeInput(el);
  }
},true);

window.testMaterialCode=function(v){
  const result=normalizeMaterialCodeValue(v);
  console.log("[MATERIAL CODE TEST]",v,"=>",result);
  return result;
};

window.testVariantCode=function(v){
  const x=splitMaterialVariantCode(v);
  console.log("[VARIANT TEST]",v,x);
  return x;
};


function captureTypedMaterialVariant(el){
  if(!el || el.dataset.sub!=="material_code")return;
  const group=el.dataset.group;
  if(!["ingredients","inactive_ingredients"].includes(group))return;
  const idx=Number(el.dataset.index);
  const raw=String(el.value||"").trim();
  if(!raw)return;
  const info=splitMaterialVariantCode(raw);
  setFormulaVariant(group,idx,info.variant_code);
  el.value=info.base_code;
}

window.inspectMaterialVariantRow=function(group="ingredients",index=0){
  const material=document.querySelector(
    `.excel-input[data-group="${group}"][data-index="${index}"][data-sub="material_code"]`
  )?.value||"";
  const variant=getFormulaVariant(group,index,material);
  const fda=document.querySelector(
    `.excel-input[data-group="${group}"][data-index="${index}"][data-sub="fda_no"]`
  )?.value||"";
  const result={material_code:material,variant_code:variant,fda_no:fda};
  console.log("[ROW CODE CHECK]",result);
  return result;
};

window.inspectRealtimeIngredientPrice=function(group="ingredients",index=0){
  const get=sub=>document.querySelector(
    `.excel-input[data-group="${group}"][data-index="${index}"][data-sub="${sub}"]`
  )?.value||"";
  const result={
    variant_code:getFormulaVariant(group,index,get("material_code")),
    material_code:get("material_code"),
    name:get("name"),
    quantity_mg:get("quantity_mg"),
    price_kg:get("price_kg"),
    fda_no:get("fda_no")
  };
  console.log("[REALTIME PRICE CHECK]",result);
  return result;
};

window.inspectSupplementVariant=function(value){
  const parsed=parseSupplementOptionValue(value);
  const item=parsed.variant_code
    ? (window.supplementCodeData||[]).find(x=>
        String(x.variant_code||x.code||"").trim().toUpperCase()===parsed.variant_code)
    : findSupplementByName(value);
  const result=item?{
    name:item.name,
    variant_code:item.variant_code||item.code,
    base_code:splitMaterialVariantCode(item.variant_code||item.code||"").base_code,
    price:getSupplementPrice(item),
    vendor:item.vendor||""
  }:null;
  console.log("[SUPPLEMENT VARIANT]",result);
  return result;
};


// v31.21 MASTER-EXACT REALTIME RECALC
// Calculation rules below are transcribed from the two attached original Excel masters.
// Every recalculation reads CURRENT DOM values only; calculated cells are read-only.
function forceCalcValue(el,value,digits=6){
  if(!el)return;
  delete el.dataset.manualOverride;
  el.value=fmtCalc(Number.isFinite(Number(value))?Number(value):0,digits);
}
function forceCalcAddr(addr,value,digits=6){
  const el=document.querySelector(`.formula-auto-input[data-calc-cell="${addr}"]`)
    ||document.querySelector(`.manual-cell-input[data-manual-cell="${addr}"]`);
  forceCalcValue(el,value,digits);
}
function formulaGroupIndexes(group){
  return [...new Set([...document.querySelectorAll(`.excel-input[data-group="${group}"]`)]
    .map(e=>Number(e.dataset.index)).filter(Number.isFinite))].sort((a,b)=>a-b);
}
function formulaField(group,index,sub){
  return document.querySelector(`.excel-input[data-group="${group}"][data-index="${index}"][data-sub="${sub}"]`);
}
function sumAllIndexes(indexes,sub,group="ingredients"){
  let x=0;
  for(const i of indexes)x+=readNumber(formulaField(group,i,sub));
  return x;
}
// F-RD-002 inactive row cost: rows 0-2 are the original master cells (real
// AI39/AI40/AI41 addresses, auto-formula cells), while any extra appended
// row (idx 3+) has no master address and stores its row cost via the same
// group/index/sub field system as everything else.
function inactiveRowCost(i){
  if(i<=2){
    return readNumber(document.querySelector(`.formula-auto-input[data-calc-cell="AI${39+i}"]`));
  }
  return readNumber(formulaField("inactive_ingredients",i,"row_cost"));
}
function sumRangeIndexes(indexes,from,to,sub,group="ingredients"){
  let x=0;
  for(const i of indexes){if(i>=from&&i<=to)x+=readNumber(formulaField(group,i,sub));}
  return x;
}
// Same material_code/FDA number, different total quantity needed for this
// production run -> a different price_per_kg when bulk tiers are set up for
// it (see PURCHASE > FDA + รหัสสาร Database > ราคาตามปริมาณ).
function resolveTieredPrice(item,qtyKg){
  if(!item)return "";
  const base=getSupplementPrice(item);
  const tiers=Array.isArray(item.price_tiers)?item.price_tiers:[];
  if(!tiers.length)return base;
  let applicable=base;
  const sorted=[...tiers].sort((a,b)=>Number(a.min_qty_kg||0)-Number(b.min_qty_kg||0));
  for(const t of sorted){
    if(Number(qtyKg||0)>=Number(t.min_qty_kg||0) && t.price_per_kg!==undefined && t.price_per_kg!==null && String(t.price_per_kg)!==""){
      applicable=t.price_per_kg;
    }
  }
  return applicable;
}
// Re-resolve a row's price_kg from its linked material's quantity tiers, using
// the total kg this production run needs of it (qty_mg per unit * order qty).
// Never touches a price the user has manually typed/overridden.
function applyTieredPriceForRow(group,index,qtyKg){
  const priceEl=formulaField(group,index,"price_kg");
  if(!priceEl||priceEl.dataset.manualOverride==="1")return;
  const codeVal=formulaField(group,index,"material_code")?.value||"";
  const variant=getFormulaVariant(group,index,"");
  const item=findSupplementByCode(variant||codeVal);
  if(!item)return;
  const tiers=Array.isArray(item.price_tiers)?item.price_tiers:[];
  if(!tiers.length)return;
  const resolved=resolveTieredPrice(item,qtyKg);
  if(resolved!=="" && String(priceEl.value)!==String(resolved)){
    priceEl.value=resolved;
  }
}

recalculateFormulaBoth=function(){
  if(currentExactForm!=="F-RD-002" && currentExactForm!=="F-RD-002.1")return;
  const orderQty=readNumber(document.querySelector('.excel-input[data-key="order_quantity"]'));
  const active=formulaGroupIndexes("ingredients");

  if(currentExactForm==="F-RD-002"){
    const inactive=formulaGroupIndexes("inactive_ingredients");
    const inactiveMax=Math.max(2,selectedInactiveIngredientCount(currentExactForm)-1);
    const inactiveOn=inactive.filter(i=>i>=0&&i<=inactiveMax);

    // Zr = Tr*$I$11/1,000,000 ; AIr = AEr/1,000,000*Tr -- every active row
    // that exists, index 0 (row 16) included. The raw master's own T36
    // formula is "=SUM(T17:Y35)", which SKIPS row 16 -- that's exactly why
    // entering 10 then 20 in the first two rows showed a subtotal of 20
    // instead of 30. Corrected below: every active row counts.
    for(const i of active){
      const qty=readNumber(formulaField("ingredients",i,"quantity_mg"));
      const prodKg=qty*orderQty/1000000;
      applyTieredPriceForRow("ingredients",i,prodKg);
      const price=readNumber(formulaField("ingredients",i,"price_kg"));
      forceCalcValue(formulaField("ingredients",i,"production_kg"),prodKg,6);
      forceCalcValue(formulaField("ingredients",i,"row_cost"),price/1000000*qty,9);
    }

    // Same per-row treatment for every inactive row that exists (the
    // original 3-row template, plus any extra rows from the unlimited-count
    // feature).
    for(const i of inactiveOn){
      const qty=readNumber(formulaField("inactive_ingredients",i,"quantity_mg"));
      const prodKg=qty*orderQty/1000000;
      applyTieredPriceForRow("inactive_ingredients",i,prodKg);
      const price=readNumber(formulaField("inactive_ingredients",i,"price_kg"));
      forceCalcValue(formulaField("inactive_ingredients",i,"production_kg"),prodKg,6);
      const rowCost=price/1000000*qty;
      if(i<=2){
        forceCalcAddr(`AI${39+i}`,rowCost,9);
      }else{
        forceCalcValue(formulaField("inactive_ingredients",i,"row_cost"),rowCost,9);
      }
    }

    // Active subtotal: every active row, including row 16/index 0 (see
    // comment above). Inactive subtotal: every inactive row that exists,
    // kept fully separate from the active total -- this is the "sum active
    // and inactive separately" fix.
    const activeQty=sumAllIndexes(active,"quantity_mg","ingredients");
    const activeProd=sumAllIndexes(active,"production_kg","ingredients");
    const inactiveQty=sumAllIndexes(inactiveOn,"quantity_mg","inactive_ingredients");
    const inactiveProd=sumAllIndexes(inactiveOn,"production_kg","inactive_ingredients");

    // Grand total = active subtotal + inactive subtotal, nothing else.
    // The raw master's T42="SUM(T23:Y41)" range overlaps T36 itself (T36
    // sits inside T23:T41), so it silently double-counts part of the active
    // rows on top of the inactive ones -- that's the "Caosule #0" row in the
    // screenshot showing 30 (itself part active/part inactive mashed
    // together) on top of an already-wrong active subtotal of 20, for a
    // "Total" of 50. Corrected: a clean active + inactive sum.
    const totalQty=activeQty+inactiveQty;
    const totalProd=activeProd+inactiveProd;

    // Percent-of-grand-total for every row, active and inactive alike --
    // both now reference the same grand total, replacing the master's own
    // broken/blank "T54" reference that inactive rows used to point to.
    for(const i of active){
      const qty=readNumber(formulaField("ingredients",i,"quantity_mg"));
      forceCalcValue(formulaField("ingredients",i,"percent"),totalQty?qty*100/totalQty:0,6);
    }
    for(const i of inactiveOn){
      const qty=readNumber(formulaField("inactive_ingredients",i,"quantity_mg"));
      forceCalcValue(formulaField("inactive_ingredients",i,"percent"),totalQty?qty*100/totalQty:0,6);
    }
    const activePct=sumAllIndexes(active,"percent","ingredients");
    const inactivePct=sumAllIndexes(inactiveOn,"percent","inactive_ingredients");

    // T36/Z36/AD36 = active subtotal (now correctly includes row 16).
    forceCalcAddr("T36",activeQty,6); forceCalcAddr("Z36",activeProd,6); forceCalcAddr("AD36",activePct,6);
    // T42/Z42/AD42 = inactive subtotal only (the cell the raw master mislabels
    // "Caosule #0" via its broken overlapping SUM range -- see above).
    forceCalcAddr("T42",inactiveQty,6); forceCalcAddr("Z42",inactiveProd,6); forceCalcAddr("AD42",inactivePct,6);
    // T43/Z43/AD43 = grand total = active + inactive, no double counting.
    forceCalcAddr("T43",totalQty,6); forceCalcAddr("Z43",totalProd,6); forceCalcAddr("AD43",activePct+inactivePct,6);

    // Bottom summary: K44/K45 are the grand total (active+inactive); K47 is
    // the grand total ingredient cost with the master's *120 markup rule --
    // matches the corrected export formulas (K44=SUM(T<total_row>),
    // K47=SUM(AI16:AL<inactive_last>)*120, both spanning active+inactive).
    const rowCostAll=sumAllIndexes(active,"row_cost","ingredients")+inactiveOn.reduce((s,i)=>s+inactiveRowCost(i),0);
    const k44=totalQty;
    const k45=totalProd;
    const k47=rowCostAll*120;
    const k48=readNumber(document.querySelector('.manual-cell-input[data-manual-cell="K48"]'));
    forceCalcAddr("K44",k44,6); forceCalcAddr("K45",k45,6); forceCalcAddr("K47",k47,9);
    forceCalcAddr("AO47",orderQty*k47,2); forceCalcAddr("AO48",orderQty*k48,2);
    forceCalcAddr("K49",k48-k47,9); forceCalcAddr("AO49",orderQty*(k48-k47),2);
    return;
  }

  // F-RD-002.1 original main table is rows 16-27 ONLY (12 ingredients).
  const rows=active.filter(i=>i>=0&&i<=11);
  let p28=0,v28=0,z28=0;
  // จำนวน Tester: originally a hardcoded "=30/0.981" in the master formula
  // (AP31). The "/0.981" did not generalize to a custom count (confirmed
  // against a real record: 100 testers on a 10mg/200mg formula must give
  // exactly 1000mg/20000mg, not 1019.36/20387.3) — so pack_mg is now simply
  // quantity_mg * tester count. Blank keeps the original default of 30.
  const testerQtyEl=document.querySelector('.manual-cell-input[data-manual-cell="AP31"]');
  const testerQtyRaw=testerQtyEl?.value?.trim();
  const testerQty=testerQtyRaw?Number(testerQtyRaw):30;
  const ap31=Number.isFinite(testerQty)&&testerQty>0?testerQty:30;
  for(const i of rows){
    const qty=readNumber(formulaField("ingredients",i,"quantity_mg"));
    const prod=qty*orderQty/1000000;
    applyTieredPriceForRow("ingredients",i,prod);
    const price=readNumber(formulaField("ingredients",i,"price_kg"));
    const rowCost=price/1000000*qty;
    const packMg=qty*ap31;
    const quantityG=packMg/1000;
    const testerCost=price/1000000*packMg;
    forceCalcValue(formulaField("ingredients",i,"production_kg"),prod,6);
    forceCalcValue(formulaField("ingredients",i,"row_cost"),rowCost,9);
    forceCalcValue(formulaField("ingredients",i,"pack_mg"),packMg,6);
    forceCalcValue(formulaField("ingredients",i,"quantity_g"),quantityG,6);
    forceCalcValue(formulaField("ingredients",i,"pack_price_mg"),testerCost,9);
    p28+=qty; v28+=prod;
  }
  for(const i of rows){
    const qty=readNumber(formulaField("ingredients",i,"quantity_mg"));
    const pct=p28?qty*100/p28:0;
    forceCalcValue(formulaField("ingredients",i,"percent"),pct,6);
    z28+=pct;
  }
  forceCalcAddr("P28",p28,6); forceCalcAddr("V28",v28,6); forceCalcAddr("Z28",z28,6);
  // AP31 is now the user-editable "จำนวน Tester" input itself — never
  // force-overwrite it here (that would undo what the user just typed).

  // AN28 = SUM(AN20:AN27): price/pack rows indexes 4..11 only.
  const an28=sumRangeIndexes(rows,4,11,"price_pack");
  const packagingCost=readNumber(document.querySelector('.manual-cell-input[data-manual-cell="AE31"]'))
    ||readNumber(document.querySelector('.generic-excel-edit[data-manual-cell="AE31"]'));
  forceCalcAddr("AN28",an28,6);
  forceCalcAddr("AO28",packagingCost*ap31,9); // exact AO28 = AE31*AP31

  // K33 = SUM(AE16:AH31) => active row costs + AE31 packaging cost.
  const ingredientRowCost=sumRangeIndexes(rows,0,11,"row_cost");
  const k33=ingredientRowCost+packagingCost;
  const o33=k33-packagingCost;
  const k34=readNumber(document.querySelector('.manual-cell-input[data-manual-cell="K34"]'));
  const o34=k34-packagingCost;
  const k35=k34-k33;
  const o35=o34-o33;
  const z35=o34?o35*100/o34:0;
  // Overall margin % including packaging cost: K35*100/K34 (Z35 above is
  // the ingredient-only margin, which excludes AE31's packaging cost).
  const z36=k34?k35*100/k34:0;
  forceCalcAddr("K33",k33,9); forceCalcAddr("O33",o33,9); forceCalcAddr("AO33",orderQty*k33,2);
  forceCalcAddr("O34",o34,9); forceCalcAddr("AO34",orderQty*k34,2);
  forceCalcAddr("K35",k35,9); forceCalcAddr("O35",o35,9); forceCalcAddr("Z35",z35,6); forceCalcAddr("AO35",orderQty*k35,2);
  forceCalcAddr("Z36",z36,6);

  // K36 = SUM(AQ20:AQ28): only rows 20-27 have ingredient tester costs in the supplied master.
  const k36=sumRangeIndexes(rows,4,11,"pack_price_mg");
  forceCalcAddr("K36",k36,9);
  // IMPORTANT: master AO36 = AO35 - AN28 (not AO35 - K36).
  forceCalcAddr("AO36",orderQty*k35-an28,2);
};

// Capture every direct edit, including fields rendered as generic/manual cells.
document.addEventListener("input",function(e){
  const el=e.target;
  if(!el)return;
  if(currentExactForm==="F-RD-002" || currentExactForm==="F-RD-002.1"){
    if(el.classList?.contains("excel-input") || el.classList?.contains("manual-cell-input")){
      recalculateFormulaBoth();
    }
  }else if(isQPLikeForm(currentExactForm) && el.classList?.contains("excel-input")){
    recalculateAdminQP();
  }
},true);


// v31.19 ADMIN-QP derived fields also always follow current inputs (ADMIN-INVOICE too).
recalculateAdminQP=function(){
  if(!isQPLikeForm(currentExactForm))return;
  const get=k=>document.querySelector(`.excel-input[data-key="${k}"]`);
  const force=(k,v,d=2)=>{const e=get(k);if(e){delete e.dataset.manualOverride;e.value=fmtCalc(v,d);}};
  let ingredientTotal=0;
  for(let i=0;i<16;i++)ingredientTotal+=readNumber(qpExactEl(i,"quantity_mg"));
  force("ingredient_total_mg",ingredientTotal,3);
  let subtotal=0;
  for(let i=0;i<13;i++){
    const qty=readNumber(qpLineEl(i,"quantity"));
    const price=readNumber(qpLineEl(i,"unit_price"));
    const calc=qty*price;
    const amount=qpLineEl(i,"amount");
    if(amount){delete amount.dataset.manualOverride;amount.value=fmtCalc(calc,2);}
    subtotal+=calc;
  }
  const discount=readNumber(get("discount"));
  const after=Math.max(0,subtotal-discount);
  const vat=after*0.07,grand=after+vat;
  force("subtotal",subtotal,2);force("after_discount",after,2);force("vat7",vat,2);force("grand_total",grand,2);
  force("installment_1",grand*0.5,2);force("installment_2",grand*0.5,2);
};

// ADMIN-JOB (Job Description / JL): active/inactive ingredient percentage
// is qty-of-this-row / total-qty-of-all-rows * 100, recalculated live as
// any quantity_mg field changes -- mirrors the real form's own numbers
// (e.g. 700mg of 1200mg total = 58.33%).
recalculateAdminJob=function(){
  if(currentExactForm!=="ADMIN-JOB")return;
  const groupEl=(group,i,sub)=>document.querySelector(`.excel-input[data-group="${group}"][data-index="${i}"][data-sub="${sub}"]`);
  const groups=[["active_ingredients",15],["inactive_ingredients",5]];
  let total=0;
  for(const [group,cap] of groups)
    for(let i=0;i<cap;i++)total+=readNumber(groupEl(group,i,"quantity_mg"));
  for(const [group,cap] of groups){
    for(let i=0;i<cap;i++){
      const qty=readNumber(groupEl(group,i,"quantity_mg"));
      const pctEl=groupEl(group,i,"percentage");
      if(pctEl)pctEl.value=total>0?fmtCalc(qty/total*100,4):"";
    }
  }
  const totalEl=document.querySelector('.excel-input[data-key="ingredient_total_mg"]');
  if(totalEl)totalEl.value=total>0?fmtCalc(total,3):"";
  const totalPctEl=document.querySelector('.excel-input[data-key="ingredient_total_percent"]');
  if(totalPctEl)totalPctEl.value=total>0?"100":"";
};
