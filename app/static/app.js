window.loginUserInfo=null;

const SOURCE_FORMS={
"F-RD-001":{title:"รายละเอียดผลิตภัณฑ์ตามความต้องการของลูกค้า",sections:[
 ["1. ข้อมูลลูกค้า",[["customer_name","นามลูกค้า / Customer name"],["customer_code","รหัสลูกค้า / ID"]]],
 ["2. ข้อมูลผลิตภัณฑ์",[["product_category","หมวดหมู่ผลิตภัณฑ์"],["product_form","รูปแบบผลิตภัณฑ์/ปริมาณ (แคปซูล/ตอกเม็ด/ชงดื่ม/กรอกปาก/เม็ดฟู่)"],["objective","วัตถุประสงค์ตามที่ต้องการ","textarea"],["product_detail","ประสิทธิภาพผลิตภัณฑ์ รายละเอียดเพิ่มเติม","textarea"]]],
 ["3. ข้อมูลสารสกัด",[["ingredients","สารสกัดที่ลูกค้าต้องการใส่ในผลิตภัณฑ์เป็นตัวหลัก","ingredients10"]]],
 ["4. ข้อมูลบรรจุภัณฑ์",[["order_capsule","จำนวนสั่งผลิต - แคปซูล"],["order_sachet","จำนวนสั่งผลิต - ซอง"],["order_tablet","จำนวนสั่งผลิต - เม็ด"],["packaging","บรรจุภัณฑ์ / ซองชงดื่ม"]]],
 ["5. ส่วนของ RD อาหารเสริม",[["formula_rates","เลขที่สูตร (F) และ ราคา/1 หน่วยการผลิต","rates5"]]]
]},
"F-RD-002":{title:"สูตร",sections:[
 ["ข้อมูลหัวสูตร",[["customer_name","นามผู้ซื้อ"],["formula_no","เลขที่สูตร"],["product_type","ประเภทของผลิตภัณฑ์"],["date","วันที่","date"],["product_name_fda","ชื่อผลิตภัณฑ์ / เลข อย."],["salesperson","พนักงานขาย"],["order_quantity","จำนวนที่สั่งผลิต"],["order_unit","หน่วย"]]],
 ["Active Ingredient",[["ingredients","Active Ingredient / Quantity (Mg.) / Price Kg / Supplier / Import / รหัสสาร / Halal","formula20"]]],
 ["ต้นทุนและเรทราคา",[["selling_price","ราคาขาย / หน่วย"],["rate_note","เรทราคา / หมายเหตุ","textarea"]]]
]},
"F-RD-002.1":{title:"สูตรผลิต",sections:[
 ["สูตรผลิตจริง",[["customer_name","นามผู้ซื้อ"],["formula_no","เลขที่สูตร"],["product_type","ประเภทของผลิตภัณฑ์"],["date","วันที่","date"],["product_name_fda","ชื่อผลิตภัณฑ์ / เลข อย."],["salesperson","พนักงานขาย"],["order_quantity","จำนวนที่สั่งผลิต"],["order_unit","หน่วย"]]],
 ["สารสกัดและต้นทุนผลิต",[["ingredients","สารสกัด / ปริมาณ / Supplier / รหัสวัตถุดิบ","formula20"]]],
 ["ขั้นตอนการผสมสารและใช้ตะแกรง",[["mixing_steps","ขั้นตอนการผสม 1–6","textarea"],["water_amount","ปริมาณน้ำที่ใช้"],["capsule_size_color","ขนาด/สี แคปซูล"],["tablet_shape","รูปทรงเม็ดตอก"],["sachet_size","ขนาดซองบรรจุ"]]],
 ["Planning",[["send_planning","ส่งให้ Planning ผลิต","select"]]]
]},
"F-RD-003":{title:"แบบฟอร์มขอทำสินค้าทดลอง / TESTER REQUEST FORM",sections:[
 ["ข้อมูลอ้างอิง",[["quotation_no","อ้างอิงใบเสนอราคาเลขที่ / Quotation No.Ref."],["formula_no","เลขที่สูตร / Formula No."],["customer_name","ชื่อ-สกุล ลูกค้า / Customer Name"],["receipt_no","เลขที่ใบเสร็จ"]]],
 ["ความต้องการ",[["customer_needed","ความต้องการของลูกค้า หรือการแก้ไขขอปรับสินค้าทดลอง / Customer Needed","textarea"],["characteristic","ลักษณะของตัวทดลอง (Capsule/Tablet/Instant Powder/Powder/Other)"],["packaging","การบรรจุ (กระปุก/แผง 3/4/10/15)"],["quantity","จำนวน / Quality"],["delivery_date","วันจัดส่ง / Delivery Date (7-14 วัน)","date"],["tester_type","ประเภทของตัวทดลอง (ฟรี/ซื้อ/ซื้อเพิ่ม)"],["price","ราคา บาท"],["payin_ref","Pay-in / เอกสารอ้างอิง"],["requester","ผู้ขอทำสินค้าตัวทดลอง"],["rd_maker","ผู้จัดทำสินค้าตัวทดลอง / R&D"]]]
]},
"F-RD-004":{title:"แบบฟอร์มการขอเรทราคา",sections:[
 ["ข้อมูลลูกค้าและสูตร",[["customer_name","ชื่อลูกค้า / Customer name"],["customer_code","รหัสลูกค้า / Code"],["op_no","เลขที่ OP (ใบเสนอราคา)"],["formula_no","เลขที่ F- (เลขสูตร)"],["formula_name","ชื่อสูตร / Formula"],["product_name","ชื่อสินค้า / Product Name"]]],
 ["เรทราคา",[["rates","จำนวน (เม็ด/แคปซูล/ซอง) / ราคา-หน่วย / หมายเหตุ","rates10"]]],
 ["อนุมัติ",[["rd_approver","หัวหน้า RD / จนท.RD"],["sales_approver","Sales Executive"],["approval_date","วันที่","date"]]]
]}};
function fieldHtml(code,f){
 const [key,label,type]=f;
 if(type==="textarea")return `<div class="wide"><label>${label}</label><textarea data-key="${key}" placeholder="ให้ใส่ Data"></textarea></div>`;
 if(type==="date")return `<div><label>${label}</label><input data-key="${key}" type="date"></div>`;
 if(type==="select")return `<div><label>${label}</label><select data-key="${key}"><option value="">ให้ใส่ Data</option><option value="YES">ส่ง Planning</option><option value="NO">ยังไม่ส่ง</option></select></div>`;
 if(type==="ingredients10")return `<div class="wide">${rowsHtml("ingredients",10,["ชื่อสารสกัด","ปริมาณ"],["name","amount"])}</div>`;
 if(type==="formula20")return `<div class="wide">${formulaRows(20)}</div>`;
 if(type==="rates5")return `<div class="wide">${rowsHtml("formula_rates",5,["เลขที่สูตร (F)","ราคา / 1 หน่วย"],["formula_no","price"])}</div>`;
 if(type==="rates10")return `<div class="wide">${rowsHtml("rates",10,["จำนวน","ราคา / หน่วย","หมายเหตุ"],["quantity","price_unit","note"])}</div>`;
 return `<div><label>${label}</label><input data-key="${key}" placeholder="ให้ใส่ Data"></div>`;
}
function rowsHtml(group,n,labels,keys){let h=`<div class="source-grid-table"><div class="sg-head">No.</div>${labels.map(x=>`<div class="sg-head">${x}</div>`).join("")}`;for(let i=0;i<n;i++){h+=`<div>${i+1}</div>${keys.map(k=>`<div><input data-group="${group}" data-index="${i}" data-sub="${k}" placeholder="ให้ใส่ Data"></div>`).join("")}`;}return h+"</div>"}
function formulaRows(n){let h=`<div class="formula-source-table"><div class="sg-head">No.</div><div class="sg-head">สารสกัด</div><div class="sg-head">Quantity mg</div><div class="sg-head">Price/kg</div><div class="sg-head">Supplier</div><div class="sg-head">Import</div><div class="sg-head">รหัสสาร</div><div class="sg-head">Halal</div>`;for(let i=0;i<n;i++)h+=`<div>${i+1}</div><div><input data-group="ingredients" data-index="${i}" data-sub="name"></div><div><input type="number" data-group="ingredients" data-index="${i}" data-sub="quantity_mg"></div><div><input type="number" data-group="ingredients" data-index="${i}" data-sub="price_kg"></div><div><input data-group="ingredients" data-index="${i}" data-sub="supplier"></div><div><input data-group="ingredients" data-index="${i}" data-sub="import_country"></div><div><input data-group="ingredients" data-index="${i}" data-sub="material_code"></div><div><input data-group="ingredients" data-index="${i}" data-sub="halal"></div>`;return h+"</div>"}
async function openSourceForm(code){
 const f=SOURCE_FORMS[code];
 if(!f){toast("ไม่พบแบบฟอร์ม "+code);return;}
 currentPage="source:"+code;
 document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.formCode===code));
 $("pageTitle").textContent=`${code} — ${f.title}`;
 $("pageSubtitle").textContent="กรอกข้อมูลตามช่องในเอกสารต้นฉบับ";
 let body=`<div class="source-form"><div class="source-doc-head"><b>ชื่อแบบฟอร์ม : ${f.title}</b><span>เลขที่แบบฟอร์ม : ${code}</span><span>แก้ไขครั้งที่ : 0</span></div>`;
 f.sections.forEach(s=>{body+=`<section><h3>${s[0]}</h3><div class="form-grid">${s[1].map(x=>fieldHtml(code,x)).join("")}</div></section>`});
 body+=`<div class="toolbar"><input id="sourceRecordNo" placeholder="เลขที่รายการ / เช่น ${code}-001"><div class="actions"><button class="primary" onclick="saveSourceForm('${code}')">บันทึกตามฟอร์มต้นฉบับ</button><button onclick="showSourceRecords('${code}')">รายการที่บันทึก</button></div></div></div>`;$("pageContent").innerHTML=body;
}
function collectSourceData(){
 const d={};document.querySelectorAll("[data-key]").forEach(e=>d[e.dataset.key]=e.value);
 document.querySelectorAll("[data-group]").forEach(e=>{const g=e.dataset.group,i=+e.dataset.index,k=e.dataset.sub;d[g]??=[];d[g][i]??={};d[g][i][k]=e.value});
 for(const k of Object.keys(d))if(Array.isArray(d[k]))d[k]=d[k].filter(x=>x&&Object.values(x).some(v=>v!==""));
 return d;
}
async function saveSourceForm(code){const no=$("sourceRecordNo").value.trim()||`${code}-${Date.now()}`;const r=await api(`/api/source-forms/${code}`,{method:"POST",body:{record_no:no,status:"DRAFT",data:collectSourceData()}});toast("บันทึกแล้ว — กด Excel ตามต้นฉบับ เพื่อดาวน์โหลดฟอร์มจริง");await showSourceRecords(code)}
async function showSourceRecords(code){const rows=await api(`/api/source-forms/${code}`);const tr=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.record_no)}</td><td>${statusBadge(x.status)}</td><td>${new Date(x.created_at).toLocaleString()}</td><td><button class="primary" onclick="exportSourceExcel(${x.id})">ดาวน์โหลด Excel ต้นฉบับที่กรอกแล้ว</button></td></tr>`);$("pageContent").innerHTML=`<div class="card"><div class="toolbar"><button onclick="openSourceForm('${code}')">← กลับไปกรอก ${code}</button></div>${table(["ID","Record No.","Status","Saved","Export"],tr)}</div>`}
async function exportSourceExcel(id){
  try{
    if(!id)throw new Error("ไม่พบ Record ID");
    if(!window.currentPersonAccess?.person_key){
      throw new Error("กรุณาเลือกคนที่ 1-4 และใส่รหัสก่อน");
    }
    return await exportExcel(`/api/source-forms/record/${id}/excel`);
  }catch(e){
    console.error("exportSourceExcel failed",e);
    alert("ดาวน์โหลด Excel ไม่สำเร็จ: "+(e?.message||e));
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
function logout(){localStorage.removeItem("token");localStorage.removeItem("loginUserInfo");token="";me=null;window.loginUserInfo=null;window.departmentAccessSession={};window.currentPersonAccess=null;window.currentPersonAccess=null;$("appShell").classList.add("hidden");$("departmentPortal")?.classList.add("hidden");$("loginPage").classList.remove("hidden");}

async function bootstrap(){
  try{
    me=await api("/api/ui/me");
    $("userName").textContent=me.full_name;
    $("userRole").textContent=me.role;
    if($("adminNav")) $("adminNav").classList.toggle("hidden",me.role!=="ADMIN" && me.role!=="RD_HEAD");
    $("loginPage").classList.add("hidden");
    const loginInfo=window.loginUserInfo||{};
    const forcedDept=departmentFromUsername(loginInfo.username);
    if(forcedDept && !["ADMIN","CEO"].includes(forcedDept)){
      $("departmentPortal").classList.add("hidden");
      $("appShell").classList.remove("hidden");
      await enterDepartment(forcedDept);
    }else{
      $("appShell").classList.add("hidden");
      $("departmentPortal").classList.remove("hidden");
      renderDepartmentPortal();
      if(currentDepartment)await enterDepartment(currentDepartment);
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
 admin:["Admin","Users และ Audit Log"]
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
    alert("ดาวน์โหลด Excel ไม่สำเร็จ: "+(e?.message||e));
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

async function renderAdmin(){
 if(!["ADMIN","RD_HEAD"].includes(me.role)){throw new Error("Permission denied")}
 const audits=await api("/api/ui/audit");
 let users=[]; if(me.role==="ADMIN")users=await api("/api/ui/users");
 const userRows=users.map(x=>`<tr><td>${esc(x.username)}</td><td>${esc(x.full_name)}</td><td>${esc(x.role)}</td><td>${x.is_active?"Active":"Inactive"}</td></tr>`);
 const auditRows=audits.map(x=>`<tr><td>${x.id}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)}</td><td>${x.entity_id??"-"}</td><td>${x.user_id??"-"}</td><td>${x.created_at}</td></tr>`);
 $("pageContent").innerHTML=`${me.role==="ADMIN"?`<div class="card"><h3>Users</h3>${table(["Username","Name","Role","Status"],userRows)}</div>`:""}<div class="card"><h3>Audit Log</h3>${table(["ID","Action","Entity","Entity ID","User ID","Time"],auditRows)}</div>`;
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

const renderers={originalForms:renderOriginalForms,customers:renderCustomers,dashboard:renderDashboard,projects:renderProjects,formulas:renderFormulas,testers:renderTesters,rates:renderRates,materials:renderMaterials,suppliers:renderSuppliers,inventory:renderInventory,registration:renderRegistration,production:renderProduction,ai:renderAI,admin:renderAdmin};

function openModal(title,html){$("modalTitle").textContent=title;$("modalBody").innerHTML=html;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
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
   exactFormsCache=await fetch("/static/exact_forms.json?v=31.23",{cache:"no-store"}).then(r=>r.json());
   // ADMIN-INVOICE reuses the exact ADMIN-QP layout (same master workbook,
   // same cells) — only the title text differs, which the export step
   // rewrites server-side. Alias it here instead of duplicating the file.
   if(exactFormsCache["ADMIN-QP"] && !exactFormsCache["ADMIN-INVOICE"]) exactFormsCache["ADMIN-INVOICE"]=exactFormsCache["ADMIN-QP"];
 }
 if(!exactFieldsCache){
   exactFieldsCache=await fetch("/static/exact_fields.json?v=31.23",{cache:"no-store"}).then(r=>r.json());
   if(exactFieldsCache["ADMIN-QP"] && !exactFieldsCache["ADMIN-INVOICE"]) exactFieldsCache["ADMIN-INVOICE"]=exactFieldsCache["ADMIN-QP"];
 }
 if(!window.supplementCodeData) try{window.supplementCodeData=await api("/api/fda-materials/catalog/live")}catch{window.supplementCodeData=[]}
 // Package master data now lives in a real database (with cost -> +20% real
 // price, and an official name) instead of the static catalog JSON.
 if(!window.packageCatalogData) try{window.packageCatalogData=await api("/api/packaging")}catch{window.packageCatalogData=[]}
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
function exactInput(field,addr,cellValue){
 const common=`class="excel-input" data-addr="${addr}" ${field.key?`data-key="${field.key}"`:""} ${field.group?`data-group="${field.group}" data-index="${field.index}" data-sub="${field.sub}"`:""}`;
 const placeholder=field.placeholder||"พิมพ์ข้อมูล";
 if(field.type==="select") return `<select ${common}><option value="">เลือก/แก้ไข</option>${(field.options||[]).map(x=>`<option ${String(cellValue)==String(x)?"selected":""}>${esc(x)}</option>`).join("")}</select>`;
 if(field.type==="date_today") return `<input ${common} type="date" value="${new Date().toISOString().slice(0,10)}">`;
 if(field.type==="date") return `<input ${common} type="date">`;
 if(field.type==="date_text") return `<input ${common} type="text" inputmode="numeric" placeholder="DD/MM/YYYY" oninput="this.value=this.value.replace(/[^0-9\/\-]/g,'')">`;
 if(field.type==="package") return `<input ${common} type="text" list="exactPackageList" placeholder="พิมพ์ค้นหา Package" oninput="applyPackageSelection(this)">`;
 if(field.type==="number_auto") return `<input ${common} class="excel-input" type="number" step="0.000000001" placeholder="คำนวณอัตโนมัติ" readonly tabindex="-1">`;
 if(field.type==="number") return `<input ${common} type="number" step="0.000001" placeholder="${esc(placeholder)}" oninput="${isQPLikeForm(currentExactForm)?'recalculateAdminQP()':'recalculateFormulaBoth()'}" onchange="${isQPLikeForm(currentExactForm)?'recalculateAdminQP()':'recalculateFormulaBoth()'}">`;
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
async function openExactFormLegacy(code){
 await loadExactAssets();currentExactForm=code;
  if(code==='F-RD-002'||code==='F-RD-002.1') setTimeout(()=>scheduleFDAFormulaLink(false),50);
 document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));document.querySelector(`.exact-form-nav[data-form="${code}"]`)?.classList.add("active");
 const titles={"F-RD-001":"รายละเอียดผลิตภัณฑ์ตามความต้องการของลูกค้า","F-RD-002":"สูตร","F-RD-002.1":"สูตรผลิต","F-RD-003":"แบบฟอร์มขอทำสินค้าทดลอง","F-RD-004":"แบบฟอร์มการขอเรทราคา",
    "ADMIN-QP":"QP / Quotation","ADMIN-INVOICE":"Invoice / ใบแจ้งหนี้"};
 $("pageTitle").textContent=`${code} — ${titles[code]}`;$("pageSubtitle").textContent="หน้ากรอกข้อมูลยึด Layout จาก Excel ต้นฉบับจริง";
 const form=exactFormsCache[code],fmap=exactFieldMap(code,form),skip=new Set(),mergeTL={};
 for(const m of form.merges||[]){mergeTL[xlAddr(m.r1,m.c1)]=m;for(let r=m.r1;r<=m.r2;r++)for(let c=m.c1;c<=m.c2;c++)if(!(r===m.r1&&c===m.c1))skip.add(xlAddr(r,c))}
 let cols=`<colgroup>${form.widths.map(w=>`<col style="width:${Math.max(4,Number(w))*7.2}px">`).join("")}</colgroup>`, rows="";
 for(let r=1;r<=form.maxRow;r++){
   rows+=`<tr style="height:${Number(form.heights?.[r]||15)*1.33}px">`;
   for(let c=1;c<=form.maxCol;c++){const a=xlAddr(r,c);if(skip.has(a))continue;const ce=form.cells[a]||{},mg=mergeTL[a],field=fmap[a],calcInput=formulaAutoInputForCell(code,a,ce.v),manualInput=manualInputForCell(code,a,ce.v);
      rows+=`<td ${mg?`rowspan="${mg.r2-mg.r1+1}" colspan="${mg.c2-mg.c1+1}"`:""} style="${cellStyle(ce)}">${calcInput||(field?exactInput(field,a,ce.v):(manualInput||`<span class="excel-cell-text">${esc(ce.v||"")}</span>`))}</td>`;
   }rows+="</tr>";
 }
 const supplements=(window.supplementCodeData||[]);
 const supNames=[...new Set(supplements.map(x=>x.vendor).filter(Boolean))];
 $("pageContent").innerHTML=`<div class="exact-form-toolbar"><div><b>FORM ต้นฉบับ ${code}</b><small>กรอกเฉพาะช่องข้อมูล ส่วนโครงสร้างเอกสารคงตาม Excel เดิม</small></div><div class="actions"><input id="exactRecordNo" placeholder="เลขที่รายการ เช่น ${code}-001"><button onclick="showSourceRecords('${code}')">รายการที่บันทึก</button><button class="primary" onclick="saveExactForm('${code}')">บันทึก</button></div></div>
 <div class="excel-sheet-scroll"><table class="excel-sheet">${cols}<tbody>${rows}</tbody></table></div>
 <datalist id="exactSupplementCodeList">${supplements.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join("")}</datalist>
 <datalist id="exactSupplementNameList">${supplements.map(x=>`<option value="${esc(supplementOptionValue(x))}">${esc(x.variant_code||x.code||"")} — ราคา ${esc(getSupplementPrice(x))} — ${esc(x.vendor||"")}</option>`).join("")}</datalist>
 <datalist id="exactSupplierList">${supNames.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`;
}
function collectExactPayload(){
 const d={};document.querySelectorAll(".excel-input").forEach(e=>{let v=e.value;if(e.type==="number"&&v!=="")v=Number(v);
   if(e.dataset.key)d[e.dataset.key]=v;
   if(e.dataset.group){const g=e.dataset.group,i=+e.dataset.index,k=e.dataset.sub;d[g]??=[];d[g][i]??={};d[g][i][k]=v}
 });
 for(const k of Object.keys(d))if(Array.isArray(d[k]))d[k]=d[k].filter(x=>x&&Object.values(x).some(v=>v!==""&&v!=null));
 return d;
}
async function saveExactForm(code){
 const no=$("exactRecordNo").value.trim()||`${code}-${Date.now()}`;
 const x=await api(`/api/source-forms/${code}`,{method:"POST",body:{record_no:no,status:"DRAFT",data:collectExactPayload()}});
 toast("บันทึกข้อมูลลงฟอร์มต้นฉบับแล้ว");
 await showSourceRecords(code);
}


window.formWorkspace = null;

async function openExactForm(code){
  await openWorkspaceChooser(code);
}

async function openWorkspaceChooser(code){
  const slots = await api("/api/form-workspaces");
  const cards = slots.map(x => `
    <button class="workspace-card" onclick="workspacePinPrompt(${x.slot_no},'${esc(x.display_name)}','${code}')">
      <div class="workspace-no">${x.slot_no}</div>
      <b>${esc(x.display_name)}</b>
      <small>ใส่รหัสก่อนเข้าฟอร์ม</small>
    </button>
  `).join("");

  openModal(`เลือกผู้ใช้งาน — ${code}`, `
    <div class="workspace-grid">${cards}</div>
    <div class="workspace-note">
      แต่ละคนจะเห็น แก้ไข และ Export ได้เฉพาะฟอร์มของตัวเองเท่านั้น
    </div>
  `);
}

function workspacePinPrompt(slot, name, code){
  openModal(`${name} — ใส่รหัส`, `
    <div class="pin-box">
      <div class="workspace-no">${slot}</div>
      <h3>${esc(name)}</h3>
      <input id="workspacePin" type="password" inputmode="numeric" placeholder="รหัส PIN" autofocus>
      <button class="primary full" onclick="workspaceLogin(${slot},'${code}')">เข้าสู่พื้นที่ของฉัน</button>
      <div id="workspacePinError" class="error"></div>
    </div>
  `);
}

async function workspaceLogin(slot, code){
  try{
    const x = await api("/api/form-workspaces/login", {
      method:"POST",
      body:{slot_no:slot, pin:$("workspacePin").value}
    });
    window.formWorkspace = x;
    closeModal();
    toast(`เข้าสู่ ${x.display_name}`);
    await openPrivateExactForm(code);
  }catch(e){
    $("workspacePinError").textContent = e.message;
  }
}



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
  setLinkedFieldValue("inactive_ingredients",i,"name",item.name||"");
  setLinkedFieldValue("inactive_ingredients",i,"supplier",item.vendor||"");
  setLinkedFieldValue("inactive_ingredients",i,"import_country",item.origin||"");
  setLinkedFieldValue("inactive_ingredients",i,"halal",item.halal||"");
  setLinkedFieldValue(
    "inactive_ingredients",i,"price_kg",getSupplementPrice(item),{clearOverride:true}
  );

  if(inp.dataset.sub==="name")inp.value=item.name||"";

  const codeEl=document.querySelector(
    `.excel-input[data-group="inactive_ingredients"][data-index="${i}"][data-sub="material_code"]`
  );
  if(codeEl)updateFDAForMaterialCodeInput(codeEl);

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
    "P28","V28","Z28","AN28","AO28","AP31",
    "K33","O33","AO33","O34","AO34","K35","O35","Z35","AO35","K36","AO36"
  ])
};

function formulaAutoInputForCell(code,addr,currentValue){
  if(!FORMULA_AUTO_CELLS?.[code]?.has(addr))return null;
  const val=(currentValue===undefined||currentValue===null||String(currentValue)==="#DIV/0!")?"":String(currentValue);
  return `<input class="excel-input manual-cell-input formula-auto-input" data-manual-cell="${addr}" data-calc-cell="${addr}" type="number" step="0.000001" value="${esc(val==="0"?"":val)}" placeholder="คำนวณอัตโนมัติ" readonly tabindex="-1">`;
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

function recalculateFormulaBothLegacy1(){
  if(currentExactForm!=="F-RD-002" && currentExactForm!=="F-RD-002.1")return;

  const count=selectedFormulaIngredientCount(currentExactForm);
  const orderQty=readNumber(document.querySelector('.excel-input[data-key="order_quantity"]'));

  // Calculation Master rules:
  // production kg = quantity mg * order quantity / 1,000,000
  // row cost = price/kg / 1,000,000 * quantity mg
  // % = quantity / total quantity * 100
  let activeQty=0;
  let inactiveQty=0;

  for(let i=0;i<count;i++)activeQty+=ingredientNum(i,"quantity_mg");

  const inactiveIndexes=[...new Set(
    [...document.querySelectorAll('.excel-input[data-group="inactive_ingredients"]')]
      .map(e=>Number(e.dataset.index))
      .filter(Number.isFinite)
  )];

  for(const i of inactiveIndexes){
    inactiveQty+=readNumber(document.querySelector(
      `.excel-input[data-group="inactive_ingredients"][data-index="${i}"][data-sub="quantity_mg"]`
    ));
  }

  const totalQty=activeQty+inactiveQty;
  let activeProd=0,inactiveProd=0;
  let activeRowCost=0,inactiveRowCost=0;

  for(let i=0;i<count;i++){
    const qty=ingredientNum(i,"quantity_mg");
    const priceKg=ingredientNum(i,"price_kg");
    const prod=qty*orderQty/1000000;
    const pct=totalQty>0?qty*100/totalQty:0;

    // In the master workbook the column titled Price/Mg stores row cost:
    // =SUM(AE16/1000000*T16)
    // WEB COST FORMULA — must exactly match Excel:
    // ราคา / 1,000,000 * ปริมาณ
    // Example: AE16 / 1000000 * T16
    const rowCost=priceKg/1000000*qty;

    setIngredientAuto(i,"production_kg",prod,6);
    setIngredientAuto(i,"percent",pct,6);

    // Row cost must always follow price/kg and quantity live.
    // Do not keep a stale manual override here.
    const rowCostEl=ingredientEl(i,"row_cost");
    if(rowCostEl){
      rowCostEl.dataset.manualOverride="";
      rowCostEl.value=fmtCalc(rowCost,9);
    }

    activeProd+=prod;
    activeRowCost+=rowCost;
  }

  for(const i of inactiveIndexes){
    const get=sub=>document.querySelector(
      `.excel-input[data-group="inactive_ingredients"][data-index="${i}"][data-sub="${sub}"]`
    );
    const qty=readNumber(get("quantity_mg"));
    const priceKg=readNumber(get("price_kg"));
    const prod=qty*orderQty/1000000;
    const pct=totalQty>0?qty*100/totalQty:0;
    // Same exact web formula for inactive ingredient.
    const rowCost=priceKg/1000000*qty;

    setAutoEditable(get("production_kg"),prod,6);
    setAutoEditable(get("percent"),pct,6);

    const rowCostEl=get("row_cost");
    if(rowCostEl){
      rowCostEl.dataset.manualOverride="";
      rowCostEl.value=fmtCalc(rowCost,9);
    }

    inactiveProd+=prod;
    inactiveRowCost+=rowCost;
  }

  const totalProd=activeProd+inactiveProd;

  if(currentExactForm==="F-RD-002"){
    // Master workbook:
    // K29 = total quantity
    // K30 = total production
    // K32 = SUM(row costs) * 120
    // AO32 = order quantity * cost/unit
    // AO33 = order quantity * sale/unit
    // K34/AO34 = profit
    const costPerUnit=(activeRowCost+inactiveRowCost)*120;

    setCalculatedCell("K44",totalQty,6);
    setCalculatedCell("K45",totalProd,6);
    setCalculatedCell("K47",costPerUnit,6);

    const salePerUnit=getInactiveCell("K48");
    const totalCost=orderQty*costPerUnit;
    const totalSale=orderQty*salePerUnit;

    setCalculatedCell("AO47",totalCost,6);
    setCalculatedCell("AO48",totalSale,6);
    setCalculatedCell("K49",salePerUnit-costPerUnit,6);
    setCalculatedCell("AO49",totalSale-totalCost,6);
  }

  if(currentExactForm==="F-RD-002.1"){
    // Formula production keeps its packaging/tester-specific model,
    // but ingredient calculations use the same Calculation Master rules.
    const costPerUnit=activeRowCost+inactiveRowCost;
    setCalculatedCell("K33",costPerUnit,6);

    const salePerUnit=getInactiveCell("K34");
    const totalCost=orderQty*costPerUnit;
    const totalSale=orderQty*salePerUnit;

    setCalculatedCell("AO33",totalCost,6);
    setCalculatedCell("AO34",totalSale,6);
    setCalculatedCell("K35",salePerUnit-costPerUnit,6);
    setCalculatedCell("AO35",totalSale-totalCost,6);
  }
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


let adminQPFormulaNo="";
function qpExactEl(i,sub){return document.querySelector(`.excel-input[data-group="qp_ingredients"][data-index="${i}"][data-sub="${sub}"]`)}
function qpLineEl(i,sub){return document.querySelector(`.excel-input[data-group="qp_lines"][data-index="${i}"][data-sub="${sub}"]`)}
function recalculateAdminQP(){
 if(!isQPLikeForm(currentExactForm))return;
 const get=k=>document.querySelector(`.excel-input[data-key="${k}"]`);
 const set=(k,v,d=2)=>{const e=get(k);if(e&&e.dataset.manualOverride!=="1")e.value=fmtCalc(v,d)};
 let ingredientTotal=0;
 for(let i=0;i<16;i++) ingredientTotal+=Number(qpExactEl(i,"quantity_mg")?.value||0)||0;
 set("ingredient_total_mg",ingredientTotal,3);
 let subtotal=0;
 for(let i=0;i<13;i++){
   const qty=Number(qpLineEl(i,"quantity")?.value||0)||0;
   const price=Number(qpLineEl(i,"unit_price")?.value||0)||0;
   const amount=qpLineEl(i,"amount");
   const calc=qty*price;
   if(amount && amount.dataset.manualOverride!=="1") amount.value=fmtCalc(calc,2);
   subtotal+=Number(amount?.value||calc||0)||0;
 }
 const discount=Number(get("discount")?.value||0)||0;
 const after=Math.max(0,subtotal-discount);
 const vat=after*0.07, grand=after+vat;
 set("subtotal",subtotal,2);set("after_discount",after,2);set("vat7",vat,2);set("grand_total",grand,2);
 set("installment_1",grand*0.5,2);set("installment_2",grand*0.5,2);
}
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
 }catch(err){if(force)alert("ลิงก์เลขที่สูตรไม่ได้: "+(err?.message||err))}
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
  return ["F-RD-001","F-RD-002","F-RD-002.1","F-RD-003","F-RD-004","ADMIN-QP","ADMIN-INVOICE"].includes(code);
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
    "ADMIN-INVOICE":"Invoice / ใบแจ้งหนี้"
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
        <button onclick="showSourceRecords('${code}')">ฟอร์มของฉัน</button>
        ${isQPLikeForm(code)?`<div class="qp-exact-link"><input id="qpExactFormulaNo" placeholder="คีย์รหัสสูตร เช่น F-RD-002-001"><button onclick="linkAdminQPFormula(true)">VLOOKUP จากไฟล์สูตร</button></div>`:""}
        ${(code==="F-RD-002"||code==="F-RD-002.1")?`<button class="ai-formula-btn" onclick="openAIFormulaAssistant('${code}')">AI คิดสูตร</button>`:""}
        <button class="primary" onclick="saveExactForm('${code}')">บันทึก</button>
        <button onclick="window.formWorkspace=null;openWorkspaceChooser('${code}')">เปลี่ยนคน</button>
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

function applyLinkedMaterial(index,item){
 resetLinkedMaterialState("ingredients",index);
 if(!item)return;

 const codeInfo=splitMaterialVariantCode(item.variant_code||item.code||"");
 setFormulaVariant("ingredients",index,codeInfo.variant_code);

 // Visible/base code
 setLinkedFieldValue("ingredients",index,"material_code",codeInfo.base_code);
 setLinkedFieldValue("ingredients",index,"name",item.name||"");
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

 // Recalculate after DOM has the new price.
 recalculateFormulaBoth();
 setTimeout(recalculateFormulaBoth,0);
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
   inp.value=item.name||"";
 }
}
function autoLinkIngredient(inp){
 const i=Number(inp.dataset.index);
 const item=inp.dataset.sub==="material_code"
   ? findSupplementByCode(inp.value)
   : findSupplementByName(inp.value,i,"ingredients");

 if(item){
   applyLinkedMaterial(i,item);

   // After choosing a unique "name || variant", show the human-readable name only.
   if(inp.dataset.sub==="name")inp.value=item.name||"";
 }
}
function bindAliasPanel(){
 // Initial binding is handled by oninput attributes. This function remains for compatibility.
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

const saveExactFormNewOnly=saveExactForm;
saveExactForm=async function(code){
  try{
    if(!code)code=currentExactForm;
    if(!code)throw new Error("ไม่พบรหัสฟอร์มที่กำลังเปิด");

    if(!window.currentPersonAccess?.person_key){
      throw new Error("กรุณาเลือกคนที่ 1-4 และใส่รหัสก่อน");
    }

    const data=collectExactPayload();

    if(isQPLikeForm(code)){
      const formulaToolbar=document.getElementById("adminQPFormulaNo");
      if(formulaToolbar?.value?.trim()){
        data.formula_no=formulaToolbar.value.trim();
      }
    }

    const recordInput=document.getElementById("exactRecordNo");
    const recordNo=(recordInput?.value||"").trim() || `${code}-${Date.now()}`;
    const body={record_no:recordNo,status:"DRAFT",data};

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
    alert("บันทึกไม่สำเร็จ: "+(e?.message||e));
    throw e;
  }
};

showSourceRecords=async function(code){
 const rows=await api(`/api/source-forms/${code}`);
 const tr=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.record_no)}</td><td>${statusBadge(x.status)}</td><td>${esc(x.owner||window.formWorkspace?.display_name||"")}</td><td>${new Date(x.created_at).toLocaleString()}</td><td class="mini-actions"><button onclick="editOwnSourceRecord(${x.id})">แก้ไข</button><button onclick="exportSourceExcel(${x.id})">Excel ต้นฉบับ</button></td></tr>`);
 $("pageContent").innerHTML=`<div class="card"><div class="workspace-note">คุณกำลังอยู่ในพื้นที่ของ <b>${esc(window.formWorkspace?.display_name||"")}</b> — ระบบไม่แสดงฟอร์มของคนอื่น</div><div class="toolbar"><button onclick="openPrivateExactForm('${code}')">← ฟอร์มใหม่ ${code}</button></div>${table(["ID","Record No.","Status","Owner","Saved","Action"],tr)}</div>`;
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
    alert("นำเข้า FDA master ไม่สำเร็จ: "+(e?.message||e));
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
    const headers=["รหัสสาร","หมวด Supplier","Product name","ชื่อขึ้นทะเบียนของสาร","บริษัท Supplier","รหัส Supplier","ประเทศที่มา","ราคา/กก.","Halal","COA","FDA NUMBER","PURITY","ASSAY","อัตราส่วน","เปอร์เซ็น %","หมายเหตุ","รูป","จัดการ"];
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

async function openFDAMaterialEditor(id=null){
  fdaDbEditingId=id;
  let d={};
  if(id)d=await api(`/api/fda-materials/${id}`);
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
      <div class="actions">
        <button class="primary" onclick="saveFDAMaterial()">บันทึกข้อมูล</button>
        <button onclick="openSupplierCodeManager()">จัดการรหัส Supplier</button>
        <button onclick="closeFDAEditor()">ยกเลิก</button>
      </div>
    </div>`;
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
    fdaDbEditingId=found.id;
    if(titleEl)titleEl.textContent=`แก้ไข FDA / รหัสสาร (พบรหัส ${esc(found.material_code)} อยู่แล้ว — ลิงก์ข้อมูลเดิมมาให้)`;
    toast(`พบรหัส ${found.material_code} อยู่แล้ว ลิงก์ข้อมูลเดิมมาให้แล้ว ไม่ต้องกรอกใหม่`);
  }else if(fdaDbEditingId){
    // Was auto-linked to something a moment ago, but the code no longer
    // matches any existing record — back to creating a genuinely new one.
    fdaDbEditingId=null;
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
    if(fdaDbEditingId){
      await api(`/api/fda-materials/${fdaDbEditingId}`,{method:"PUT",body});
    }else{
      await api("/api/fda-materials",{method:"POST",body});
    }
    // Clear cached FDA map so formula forms see the new/edited record immediately.
    fdaCodeMap=null;
    toast("บันทึกฐาน FDA / รหัสสารสำเร็จ");
    closeFDAEditor();
    await loadFDADatabase();
  }catch(e){
    alert("บันทึก FDA Database ไม่สำเร็จ: "+(e?.message||e));
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
    alert("ลบไม่สำเร็จ: "+(e?.message||e));
  }
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
 const roleMap={RD_HEAD:["RD"],RD_ASSISTANT:["RD"],RD_OFFICER:["RD"],SALES:["SALE"],JOB:["JOB"],PLANNING:["PLANNING"],STOCK:["STOCK"],PURCHASE:["PURCHASE"],PRODUCTION:["PRODUCTION"],GRAPHIC:["GRAPHIC"],QC:["QC"],QUALITY:["QUALITY"],CEO:DEPARTMENTS.map(x=>x.code),ADMIN:DEPARTMENTS.map(x=>x.code)};
 return roleMap[me?.role]||[];
}
function renderDepartmentPortal(){
 if($("portalUserName")) $("portalUserName").textContent=me?.full_name||"-"; if($("portalUserRole")) $("portalUserRole").textContent=me?.role||"-";
 const allowed=allowedDepartments();
 const items=DEPARTMENTS.filter(d=>allowed.includes(d.code));
 $("departmentGrid").innerHTML=items.map((d,i)=>`<button class="department-card" onclick="enterDepartment('${d.code}')"><div class="department-index">${String(i+1).padStart(2,"0")}</div><div class="department-card-body"><b>${d.name}</b><span>${d.desc}</span></div><div class="department-arrow">→</div></button>`).join("");
}

async function enterDepartmentUnlocked(code){
 if(!allowedDepartments().includes(code)){alert("บัญชีนี้ไม่มีสิทธิ์เข้าแผนก "+code);return;}
 currentDepartment=code;localStorage.setItem("department",code);$("departmentPortal").classList.add("hidden");$("appShell").classList.remove("hidden");$("currentDepartment").textContent=window.currentPersonAccess?`${code} • คนที่ ${window.currentPersonAccess.person_no}`:code;
 document.querySelectorAll(".dept-menu").forEach(x=>x.classList.toggle("dept-visible",x.dataset.dept===code));document.querySelectorAll(".dept-common").forEach(x=>x.classList.add("dept-visible"));
 if(code==="CEO")await openPage("dashboard");else await openDepartmentWorkspace(code);
}
function backToDepartments(){currentDepartment=null;localStorage.removeItem("department");window.formWorkspace=null;window.departmentAccessSession={};$("appShell").classList.add("hidden");$("departmentPortal").classList.remove("hidden");renderDepartmentPortal();}
async function openDepartmentWorkspace(code){
 const configs={
 RD:{title:"R&D",text:"จัดการสูตร สูตรผลิต Tester และ Rate",cards:[["F-RD-002 สูตร","แบบฟอร์มสูตร R&D","openExactForm('F-RD-002')"],["F-RD-002.1 สูตรผลิต","สูตรสำหรับผลิตจริง","openExactForm('F-RD-002.1')"],["F-RD-003 Tester","ขอทำสินค้าทดลอง","openExactForm('F-RD-003')"],["F-RD-004 Rate","ขอเรทราคา","openExactForm('F-RD-004')"]]},
 SALE:{title:"SALE",text:"รับความต้องการลูกค้าและส่งต่อ R&D",cards:[["F-RD-001 Customer Requirement","รายละเอียดผลิตภัณฑ์ตามความต้องการของลูกค้า","openExactForm('F-RD-001')"],["Customers","ฐานข้อมูลลูกค้า","openPage('customers')"],["Product Development","ติดตามโครงการลูกค้า","openPage('projects')"]]},
 ADMIN:{title:"ADMIN",text:"บริหารผู้ใช้ เอกสาร และข้อมูลกลาง",cards:[["QP / Quotation","ฟอร์ม QP ต้นฉบับ • ลิงก์สูตร / คำนวณอัตโนมัติ","openExactForm('ADMIN-QP')"],["Invoice / ใบแจ้งหนี้","Layout เดียวกับ QP • ใช้ออกใบแจ้งหนี้","openExactForm('ADMIN-INVOICE')"],["Users / Audit","จัดการผู้ใช้และประวัติระบบ","openPage('admin')"],["Original Forms","เอกสารต้นฉบับ","openPage('originalForms')"],["Customers","ฐานข้อมูลลูกค้า","openPage('customers')"]]},
 PLANNING:{title:"PLANNING",text:"วางแผนการผลิตและตรวจ MRP",cards:[["Production / MRP","แผนผลิตและวัตถุดิบที่ต้องใช้","openPage('production')"]]},
 STOCK:{title:"STOCK",text:"จัดการ Stock และวัตถุดิบ",cards:[["Inventory","Stock / Reserved / Available","openPage('inventory')"],["Raw Materials","ฐานวัตถุดิบ","openPage('materials')"]]},
 PURCHASE:{title:"PURCHASE",text:"Supplier การจัดซื้อ และฐานข้อมูลวัตถุดิบกลาง",cards:[["FDA + รหัสสาร Database","ฐานเดียวสำหรับ FDA / รหัสสาร / ชื่อขึ้นทะเบียน / Supplier / ประเทศ / ราคา","openFDADatabase()"],["Package Database","ฐาน Package กลาง • ราคาจริง = ต้นทุน+20%","openPackageDatabase()"],["Suppliers","ฐาน Supplier","openPage('suppliers')"],["Stock Requirement","ตรวจความต้องการวัตถุดิบ","openPage('inventory')"]]},
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
async function askFormulaIngredientCount(code){
  if(code!=="F-RD-002" && code!=="F-RD-002.1")return openExactFormAccount(code);
  const current=Math.max(1,Number(window.formulaIngredientCount[code]||1));
  openModal(`จำนวนสารใน ${code}`,`
    <div class="ingredient-count-dialog">
      <h3>ต้องการใช้สารกี่ตัว?</h3>
      <p>ไม่จำกัดจำนวนสาร — แถวที่เกินจากฟอร์มเดิมจะต่อท้ายแถวสารสุดท้าย</p>
      <input id="formulaIngredientCountInput" type="number" min="1" step="1" value="${current}" placeholder="เช่น 5, 25, 50, 100">
      <div class="ingredient-count-hint">ไม่จำกัดจำนวนสาร</div>
      <button class="primary full" onclick="confirmFormulaIngredientCount('${code}')">เปิดฟอร์ม</button>
    </div>`);
}
async function confirmFormulaIngredientCount(code){
  let n=Number(document.getElementById("formulaIngredientCountInput")?.value||1);
  if(!Number.isFinite(n))n=1;
  n=Math.max(1,Math.floor(n));
  window.formulaIngredientCount ??= {}; window.formulaIngredientCount[code]=n;
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
const bootstrapV13Original = bootstrap;


window.departmentAccessSession = window.departmentAccessSession || {};

async function enterDepartment(code){
  // Ask for a department PIN every time the user chooses a department.
  openModal(`รหัสเข้าแผนก ${code}`,`
    <div class="department-pin-box">
      <div class="department-pin-icon">${esc(code)}</div>
      <h3>กรอกรหัสแผนก</h3>
      <p>ต้องใส่รหัสก่อนเข้าสู่พื้นที่ ${esc(code)}</p>
      <input id="departmentPinInput" type="password" inputmode="numeric" maxlength="8" placeholder="รหัสแผนก">
      <button class="primary full" onclick="verifyDepartmentPin('${code}')">เข้าสู่แผนก</button>
      <div id="departmentPinError" class="error"></div>
    </div>
  `);
  setTimeout(()=>document.getElementById("departmentPinInput")?.focus(),50);
}

async function verifyDepartmentPin(code){
  const pin=(document.getElementById("departmentPinInput")?.value||"").trim();
  try{
    await api("/api/department-access/verify",{
      method:"POST",
      body:{department:code,code:pin}
    });
    window.departmentAccessSession[code]=true;
    closeModal();
    await chooseDepartmentPerson(code);
  }catch(e){
    const box=document.getElementById("departmentPinError");
    if(box)box.textContent=e.message||"รหัสแผนกไม่ถูกต้อง";
  }
}


window.currentPersonAccess=null;

async function chooseDepartmentPerson(code){
  const cards=[1,2,3,4].map(n=>`
    <button class="person-card" onclick="personPinPrompt('${code}',${n})">
      <div class="person-avatar">${n}</div>
      <b>คนที่ ${n}</b>
      <small>ใส่รหัสส่วนตัวก่อนเข้า</small>
    </button>`).join("");
  openModal(`${code} — เลือกผู้ใช้งาน`,`
    <div class="person-grid">${cards}</div>
    <div class="workspace-note">ข้อมูลของแต่ละคนจะแยกจากกัน คนอื่นจะไม่เห็นฟอร์มของคนนี้</div>
  `);
}

function personPinPrompt(dept,personNo){
  openModal(`${dept} — คนที่ ${personNo}`,`
    <div class="department-pin-box">
      <div class="person-avatar large">${personNo}</div>
      <h3>รหัสของคนที่ ${personNo}</h3>
      <input id="personPinInput" type="password" inputmode="numeric" maxlength="8" placeholder="รหัสส่วนตัว">
      <button class="primary full" onclick="verifyPersonPin('${dept}',${personNo})">เข้าสู่พื้นที่ของฉัน</button>
      <div id="personPinError" class="error"></div>
    </div>
  `);
  setTimeout(()=>document.getElementById("personPinInput")?.focus(),50);
}

async function verifyPersonPin(dept,personNo){
  try{
    const x=await api("/api/department-access/verify-person",{
      method:"POST",
      body:{
        department:dept,
        person_no:personNo,
        code:(document.getElementById("personPinInput")?.value||"").trim()
      }
    });
    window.currentPersonAccess=x;
    window.formWorkspace={
      workspace_user_id:me?.id,
      display_name:`${dept} - คนที่ ${personNo}`,
      slot_no:personNo,
      workspace_token:"person-owner"
    };
    closeModal();
    toast(`${dept} คนที่ ${personNo}`);
    await enterDepartmentUnlocked(dept);
  }catch(e){
    const box=document.getElementById("personPinError");
    if(box)box.textContent=e.message||"รหัสไม่ถูกต้อง";
  }
}


function ingredientEl(i,sub){
 return document.querySelector(`.excel-input[data-group="ingredients"][data-index="${i}"][data-sub="${sub}"]`);
}
function ingredientNum(i,sub){return readNumber(ingredientEl(i,sub));}
function setIngredientAuto(i,sub,value,digits=6){
 const el=ingredientEl(i,sub);
 setAutoEditable(el,value,digits);
}
function recalculateFormulaBothLegacy2(){
 if(currentExactForm!=="F-RD-002" && currentExactForm!=="F-RD-002.1")return;
 const count=Math.max(1,Number(window.formulaIngredientCount?.[currentExactForm]||formulaTemplateCapacity(currentExactForm)));
 const orderQty=readNumber(document.querySelector('.excel-input[data-key="order_quantity"]'));

 let activeQty=0;
 for(let i=0;i<count;i++)activeQty+=ingredientNum(i,"quantity_mg");

 let totalProd=0,ingredientCostPerUnit=0;
 for(let i=0;i<count;i++){
   const qty=ingredientNum(i,"quantity_mg");
   const priceKg=ingredientNum(i,"price_kg");
   const prodKg=orderQty>0?qty*orderQty/1000000:0;
   const pct=activeQty>0?qty/activeQty*100:0;
   const priceMg=priceKg/1000000;
   setIngredientAuto(i,"production_kg",prodKg,6);
   setIngredientAuto(i,"percent",pct,6);
   setIngredientAuto(i,"price_mg",priceMg,9);
   totalProd+=prodKg;
   ingredientCostPerUnit+=qty*priceMg;
 }

 // Preserve the original lower tables and update summary cells when present.
 if(currentExactForm==="F-RD-002"){
   setCalculatedCell("K44",activeQty);
   setCalculatedCell("K45",totalProd);
   setCalculatedCell("K47",ingredientCostPerUnit);
   const salePerUnit=getInactiveCell("K48");
   const totalCost=ingredientCostPerUnit*orderQty;
   const totalSale=salePerUnit*orderQty;
   setCalculatedCell("AO47",totalCost);
   setCalculatedCell("AO48",totalSale);
   setCalculatedCell("K49",salePerUnit-ingredientCostPerUnit);
   setCalculatedCell("AO49",totalSale-totalCost);
 }
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
    if(!quiet)alert("บันทึก Feedback AI ไม่สำเร็จ: "+(e?.message||e));
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
function sumRangeIndexes(indexes,from,to,sub,group="ingredients"){
  let x=0;
  for(const i of indexes){if(i>=from&&i<=to)x+=readNumber(formulaField(group,i,sub));}
  return x;
}
recalculateFormulaBoth=function(){
  if(currentExactForm!=="F-RD-002" && currentExactForm!=="F-RD-002.1")return;
  const orderQty=readNumber(document.querySelector('.excel-input[data-key="order_quantity"]'));
  const active=formulaGroupIndexes("ingredients");

  if(currentExactForm==="F-RD-002"){
    const inactive=formulaGroupIndexes("inactive_ingredients");

    // Original rows 16-35: Zr = Tr*$I$11/1,000,000 ; AIr = AEr/1,000,000*Tr
    for(const i of active){
      if(i<0||i>19)continue;
      const qty=readNumber(formulaField("ingredients",i,"quantity_mg"));
      const price=readNumber(formulaField("ingredients",i,"price_kg"));
      forceCalcValue(formulaField("ingredients",i,"production_kg"),qty*orderQty/1000000,6);
      forceCalcValue(formulaField("ingredients",i,"row_cost"),price/1000000*qty,9);
    }

    // T36 in the master is SUM(T17:Y35): active indexes 1..19 (row 16 is intentionally excluded).
    const t36=sumRangeIndexes(active,1,19,"quantity_mg");
    const z36=sumRangeIndexes(active,1,19,"production_kg");
    for(const i of active){
      if(i<0||i>19)continue;
      const qty=readNumber(formulaField("ingredients",i,"quantity_mg"));
      forceCalcValue(formulaField("ingredients",i,"percent"),t36?qty*100/t36:0,6);
    }
    const ad36=sumRangeIndexes(active,1,19,"percent");
    forceCalcAddr("T36",t36,6); forceCalcAddr("Z36",z36,6); forceCalcAddr("AD36",ad36,6);

    // Original inactive rows 39-41. Production and row cost follow the same row formulas.
    // The original workbook references T54 for inactive %, which is blank in the supplied master;
    // therefore the web shows 0 instead of a stale/#DIV0 value until that master denominator exists.
    for(const i of inactive){
      if(i<0||i>2)continue;
      const qty=readNumber(formulaField("inactive_ingredients",i,"quantity_mg"));
      const price=readNumber(formulaField("inactive_ingredients",i,"price_kg"));
      forceCalcValue(formulaField("inactive_ingredients",i,"production_kg"),qty*orderQty/1000000,6);
      forceCalcValue(formulaField("inactive_ingredients",i,"percent"),0,6);
      forceCalcAddr(`AI${39+i}`,price/1000000*qty,9);
    }

    // T42 = SUM(T23:Y41), Z42 = SUM(Z23:AC41), AD42 = SUM(AD23:AD41)
    // This means active rows 23-35 (indexes 7..19) + inactive rows 39-41.
    // EXACT master ranges:
    // T42 = SUM(T23:Y41) = rows 23-35 + T36 total + inactive rows 39-41.
    // Z42 = SUM(Z23:AC41) = rows 23-35 + Z36 total + inactive rows 39-41.
    // AD42 = SUM(AD23:AD41) = rows 23-35 + AD36 total + inactive rows 39-41.
    const inactiveQty39to41=sumRangeIndexes(inactive,0,2,"quantity_mg","inactive_ingredients");
    const inactiveProd39to41=sumRangeIndexes(inactive,0,2,"production_kg","inactive_ingredients");
    const inactivePct39to41=sumRangeIndexes(inactive,0,2,"percent","inactive_ingredients");
    const t42=sumRangeIndexes(active,7,19,"quantity_mg")+t36+inactiveQty39to41;
    const z42=sumRangeIndexes(active,7,19,"production_kg")+z36+inactiveProd39to41;
    const ad42=sumRangeIndexes(active,7,19,"percent")+ad36+inactivePct39to41;
    forceCalcAddr("T42",t42,6); forceCalcAddr("Z42",z42,6); forceCalcAddr("AD42",ad42,6);

    // EXACT master ranges:
    // T43 = T42 + T36
    // Z43 = SUM(Z24:AC42) = rows 24-35 + Z36 + inactive 39-41 + Z42
    // AD43 = SUM(AD24:AD42) = rows 24-35 + AD36 + inactive 39-41 + AD42
    const z24to35=sumRangeIndexes(active,8,19,"production_kg");
    const ad24to35=sumRangeIndexes(active,8,19,"percent");
    forceCalcAddr("T43",t42+t36,6);
    forceCalcAddr("Z43",z24to35+z36+inactiveProd39to41+z42,6);
    forceCalcAddr("AD43",ad24to35+ad36+inactivePct39to41+ad42,6);

    // Bottom summary in master: K44/K45/K47 all exclude row 16 and use rows 17-35.
    const k44=t36;
    const k45=z36;
    const k47=sumRangeIndexes(active,1,19,"row_cost");
    const k48=readNumber(document.querySelector('.manual-cell-input[data-manual-cell="K48"]'));
    forceCalcAddr("K44",k44,6); forceCalcAddr("K45",k45,6); forceCalcAddr("K47",k47,9);
    forceCalcAddr("AO47",orderQty*k47,2); forceCalcAddr("AO48",orderQty*k48,2);
    forceCalcAddr("K49",k48-k47,9); forceCalcAddr("AO49",orderQty*(k48-k47),2);
    return;
  }

  // F-RD-002.1 original main table is rows 16-27 ONLY (12 ingredients).
  const rows=active.filter(i=>i>=0&&i<=11);
  let p28=0,v28=0,z28=0;
  const ap31=30/0.981; // exact original formula AP31 = 30/0.981
  for(const i of rows){
    const qty=readNumber(formulaField("ingredients",i,"quantity_mg"));
    const price=readNumber(formulaField("ingredients",i,"price_kg"));
    const prod=qty*orderQty/1000000;
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
  forceCalcAddr("AP31",ap31,9);

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
  forceCalcAddr("K33",k33,9); forceCalcAddr("O33",o33,9); forceCalcAddr("AO33",orderQty*k33,2);
  forceCalcAddr("O34",o34,9); forceCalcAddr("AO34",orderQty*k34,2);
  forceCalcAddr("K35",k35,9); forceCalcAddr("O35",o35,9); forceCalcAddr("Z35",z35,6); forceCalcAddr("AO35",orderQty*k35,2);

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
