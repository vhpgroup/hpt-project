const ITEMS_KEY = "project_import_manager_v3_items";
const PROJECTS_KEY = "project_import_manager_v3_projects";
const SETTINGS_KEY = "project_import_manager_v3_settings";
const LEGACY_KEY = "project_import_manager_v2";

const seedItems = [
  {id:"i1",project:"Bệnh viện Phổi Thanh Hóa",owner:"HPT",bid:"IB2600343748",order:"1",name:"Bộ máy tính để bàn lắp ráp",unit:"Bộ",plan:21,received:21,date:"2026-07-29",model:"Core i7-12700 / Dell E2225HM",maker:"HPT",location:"Thanh Hóa"},
  {id:"i2",project:"BV Sức khỏe tâm thần Thái Bình",owner:"HPT",bid:"IB2600349912",order:"1",name:"Máy tính để bàn Dell Tower",unit:"Bộ",plan:10,received:10,date:"2026-07-29",model:"Dell ECT1250",maker:"Dell",location:"Thái Bình"},
  {id:"i3",project:"BV Sức khỏe tâm thần Thái Bình",owner:"HPT",bid:"IB2600349912",order:"2",name:"Máy quét tài liệu",unit:"Chiếc",plan:11,received:11,date:"2026-07-29",model:"HP ScanJet Pro 2000 S2",maker:"HP",location:"Thái Bình"},
  {id:"i4",project:"Nhiệt điện Quảng Ninh",owner:"Vision",bid:"IB2600403822",order:"1",name:"Microsoft 365 Business Standard",unit:"License",plan:246,received:null,date:"",model:"Microsoft 365",maker:"Microsoft",location:"Quảng Ninh"},
  {id:"i5",project:"Bệnh viện Đa khoa Sa Đéc",owner:"Vision",bid:"IB2600411034",order:"1",name:"Máy vân tay",unit:"Cái",plan:30,received:0,date:"2026-08-01",model:"ZK9500",maker:"ZKTeco",location:"Đồng Tháp"},
  {id:"i6",project:"Bệnh viện Đa khoa Sa Đéc",owner:"Vision",bid:"IB2600411034",order:"2",name:"Máy in mã vạch",unit:"Cái",plan:16,received:6,date:"2026-08-01",model:"ZD230TA",maker:"Zebra",location:"Đồng Tháp"},
  {id:"i7",project:"Bệnh viện Đa khoa Sa Đéc",owner:"Vision",bid:"IB2600411034",order:"3",name:"Thiết bị thu phát Wi-Fi 6",unit:"Cái",plan:20,received:12,date:"2026-08-01",model:"RG-RAP2260",maker:"Ruijie",location:"Đồng Tháp"},
  {id:"i8",project:"Quản lý bay miền Trung",owner:"HPT",bid:"IB2600367211",order:"1",name:"Máy tính xách tay",unit:"Cái",plan:15,received:15,date:"2026-07-29",model:"ThinkBook 14 G7",maker:"Lenovo",location:"Đà Nẵng"},
  {id:"i9",project:"Quản lý bay miền Trung",owner:"HPT",bid:"IB2600367211",order:"2",name:"Màn hình chuyên dụng",unit:"Cái",plan:18,received:8,date:"2026-07-29",model:"Dell P2425H",maker:"Dell",location:"Đà Nẵng"},
  {id:"i10",project:"Công ty Truyền tải điện 3",owner:"HPT",bid:"IB2600372028",order:"1",name:"Máy tính để bàn",unit:"Bộ",plan:25,received:0,date:"2026-08-04",model:"Dell 7020 SFF",maker:"Dell",location:"Khánh Hòa"},
  {id:"i11",project:"Công ty Truyền tải điện 3",owner:"HPT",bid:"IB2600372028",order:"2",name:"Máy in laser đen trắng",unit:"Cái",plan:8,received:0,date:"2026-08-04",model:"HP LaserJet Pro",maker:"HP",location:"Khánh Hòa"},
  {id:"i12",project:"Bệnh viện Da Liễu Trung ương",owner:"HPT",bid:"IB2600380124",order:"1",name:"Máy tính để bàn chuyên dụng",unit:"Bộ",plan:54,received:54,date:"2026-08-03",model:"Dell OptiPlex",maker:"Dell",location:"Hà Nội"},
  {id:"i13",project:"Bệnh viện Da Liễu Trung ương",owner:"HPT",bid:"IB2600380124",order:"2",name:"Máy tính xách tay",unit:"Chiếc",plan:12,received:3,date:"2026-08-03",model:"HP ProBook",maker:"HP",location:"Hà Nội"},
  {id:"i14",project:"Đại học Ngân hàng TP.HCM",owner:"HPT",bid:"IB2600385370",order:"1",name:"Bộ lưu điện UPS 20KVA",unit:"Bộ",plan:1,received:0,date:"2026-08-04",model:"CyberPower OLS3S20KE",maker:"CyberPower",location:"TP.HCM"},
  {id:"i15",project:"Đại học Ngân hàng TP.HCM",owner:"HPT",bid:"IB2600385370",order:"2",name:"Vật tư phụ và nhân công lắp đặt",unit:"Gói",plan:1,received:null,date:"",model:"",maker:"",location:"TP.HCM"}
];

let items = loadItems();
let projects = loadProjects(items);
let settings = loadSettings(items,projects);
let editingId = null;
let editingProjectId = null;
let projectPage = 1;
let inventoryPage = 1;
let activeView = "overview";
let pendingConfirmAction = null;

function loadItems(){
  try {
    const saved = localStorage.getItem(ITEMS_KEY) || localStorage.getItem(LEGACY_KEY);
    if(saved) return JSON.parse(saved);
  } catch (_) {}
  return structuredClone(seedItems);
}

function deriveProjects(sourceItems){
  const map = new Map();
  sourceItems.forEach(item => {
    if(!map.has(item.project)){
      map.set(item.project, {
        id: "p" + map.size,
        name: item.project,
        owner: item.owner || "",
        bid: item.bid || "",
        location: item.location || ""
      });
    }
  });
  return [...map.values()];
}

function loadProjects(sourceItems){
  try {
    const saved = localStorage.getItem(PROJECTS_KEY);
    if(saved) return JSON.parse(saved);
  } catch (_) {}
  return deriveProjects(sourceItems);
}

function loadSettings(sourceItems,sourceProjects){
  const defaults={
    systemName:"Điều phối nhập hàng",
    pageSize:10,
    owners:[...new Set([...sourceProjects.map(x=>x.owner),...sourceItems.map(x=>x.owner)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi")),
    units:[...new Set(sourceItems.map(x=>x.unit).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi")),
    makers:[...new Set(sourceItems.map(x=>x.maker).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"))
  };
  try {
    const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if(saved) return {...defaults,...saved,owners:Array.isArray(saved.owners)?saved.owners:defaults.owners,units:Array.isArray(saved.units)?saved.units:defaults.units,makers:Array.isArray(saved.makers)?saved.makers:defaults.makers};
  } catch (_) {}
  return defaults;
}

function saveItems(){ localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); }
function saveProjects(){ localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); }
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function persistAll(){ saveItems(); saveProjects(); saveSettings(); }
function pageSize(){ const value=Number(settings.pageSize); return [5,10,20,50].includes(value)?value:10; }
function ensureSettingValue(kind,value){ if(!value||settings[kind].some(item=>item.toLowerCase()===value.toLowerCase()))return;settings[kind].push(value);settings[kind].sort((a,b)=>a.localeCompare(b,"vi")); }
function numberOrNull(value){ if(value === null || value === undefined || value === "") return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function statusOf(item){ const planned=numberOrNull(item.plan), received=numberOrNull(item.received); if(received===null) return "Chưa cập nhật"; if(received===0) return "Chưa nhập"; if(planned!==null && received>=planned) return "Hoàn thành"; return "Đang nhập"; }
function progressOf(item){ const p=numberOrNull(item.plan), r=numberOrNull(item.received); return p && r!==null ? Math.min(100,Math.round(r/p*100)) : 0; }
function remainingOf(item){ const p=numberOrNull(item.plan), r=numberOrNull(item.received); return p===null || r===null ? null : Math.max(0,p-r); }
function formatNumber(value){ return value===null || value==="" ? "—" : Number(value).toLocaleString("vi-VN"); }
function escapeHTML(value){ return String(value??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function className(value){ return value.replaceAll(" ","-"); }
function latestDate(list){ return list.map(x=>x.date).filter(Boolean).sort().reverse()[0] || "—"; }
function projectByName(name){ return projects.find(project => project.name === name); }

function upsertProjectFromItem(item){
  const existing = projectByName(item.project);
  if(existing){
    existing.owner = item.owner || existing.owner;
    existing.bid = item.bid || existing.bid;
    existing.location = item.location || existing.location;
    return;
  }
  projects.push({id:"p"+Date.now(),name:item.project,owner:item.owner,bid:item.bid,location:item.location});
}

function projectSummaries(){
  const map = new Map();
  projects.forEach(project => map.set(project.name, {
    id: project.id,
    name: project.name,
    owner: project.owner,
    bid: project.bid,
    location: project.location,
    total: 0,
    done: 0,
    progress: 0,
    pending: 0,
    unknown: 0,
    items: []
  }));

  items.forEach(item=>{
    if(!map.has(item.project)){
      const fallback = {id:"auto-"+item.project,name:item.project,owner:item.owner,bid:item.bid,location:item.location,total:0,done:0,progress:0,pending:0,unknown:0,items:[]};
      map.set(item.project, fallback);
    }
    const p=map.get(item.project); p.total++; p.items.push(item);
    if(!p.owner) p.owner = item.owner;
    if(!p.bid) p.bid = item.bid;
    if(!p.location) p.location = item.location;
    const status=statusOf(item);
    if(status==="Hoàn thành")p.done++; else if(status==="Đang nhập")p.progress++; else if(status==="Chưa nhập")p.pending++; else p.unknown++;
  });
  return [...map.values()].map(p=>({...p,pct:p.total?Math.round(p.done/p.total*100):0,last:latestDate(p.items)})).sort((a,b)=>b.pct-a.pct || b.total-a.total || a.name.localeCompare(b.name,"vi"));
}

function renderMetrics(){
  const statuses=items.map(statusOf); const done=statuses.filter(x=>x==="Hoàn thành").length; const active=statuses.filter(x=>x==="Đang nhập").length; const pending=statuses.filter(x=>x==="Chưa nhập").length; const completePct=items.length?Math.round(done/items.length*100):0;
  const cards=[
    ["Dự án đang theo dõi",projects.length,`${items.length} dòng hàng hóa`,"#087f8c","#e7f6f6"],
    ["Hoàn thành",done,`${completePct}% tổng danh mục`,"#16825d","#e8f7f0"],
    ["Đang nhập",active,"Cần tiếp tục theo dõi","#c87810","#fff3dc"],
    ["Chưa nhập",pending,"Chưa phát sinh số lượng","#ca493c","#feebe8"],
    ["Chưa cập nhật",statuses.filter(x=>x==="Chưa cập nhật").length,"Thiếu dữ liệu thực tế","#66758a","#eef2f6"]
  ];
  document.getElementById("metricGrid").innerHTML=cards.map(([label,value,hint,color,soft])=>`<article class="metric-card" style="--accent:${color};--accent-soft:${soft}"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-hint">${hint}</div></article>`).join("");
}

function renderStatusChart(){
  const statuses=["Hoàn thành","Đang nhập","Chưa nhập","Chưa cập nhật"]; const colors=["#16825d","#c87810","#ca493c","#8b98a9"]; const counts=statuses.map(s=>items.filter(i=>statusOf(i)===s).length); const max=Math.max(...counts,1);
  document.getElementById("statusChart").innerHTML=statuses.map((status,i)=>`<div class="chart-row"><div class="chart-label">${status}</div><div class="chart-track"><div class="chart-bar" style="width:${counts[i]/max*100}%;background:${colors[i]}"></div></div><div class="chart-value">${counts[i]}</div></div>`).join("");
}

function renderAttention(){
  const rows=projectSummaries().filter(p=>p.total === 0 || p.pct<100).sort((a,b)=>(b.pending+b.unknown)-(a.pending+a.unknown) || a.pct-b.pct).slice(0,4);
  document.getElementById("attentionList").innerHTML=rows.length?rows.map(p=>`<button class="attention-item" data-project="${escapeHTML(p.name)}"><span><strong>${escapeHTML(p.name)}</strong><p>${p.total ? `${p.pending} chưa nhập · ${p.unknown} chưa cập nhật` : "Chưa có dòng hàng hóa"}</p></span><span class="attention-score">${p.total ? p.pct + "%" : "Mới"}</span></button>`).join(""):`<div class="empty-state">Không có dự án cần chú ý.</div>`;
  document.querySelectorAll(".attention-item").forEach(btn=>btn.addEventListener("click",()=>openProject(btn.dataset.project)));
}

function renderPagination(containerId,currentPage,totalItems,onPageChange){
  const container=document.getElementById(containerId); const size=pageSize(); const totalPages=Math.max(1,Math.ceil(totalItems/size));
  container.innerHTML=`<span class="pagination-info">${size} dòng / trang · Trang ${currentPage} / ${totalPages}</span><button class="page-button" data-page="${currentPage-1}" ${currentPage===1?"disabled":""}>Back</button><button class="page-button" data-page="${currentPage+1}" ${currentPage===totalPages?"disabled":""}>Next</button>`;
  container.querySelectorAll(".page-button:not(:disabled)").forEach(button=>button.addEventListener("click",()=>onPageChange(Number(button.dataset.page))));
}

function renderProjectTable(){
  const q=document.getElementById("projectSearch").value.trim().toLowerCase(); const owner=document.getElementById("projectOwnerFilter").value;
  const rows=projectSummaries().filter(p=>(!q||p.name.toLowerCase().includes(q)||String(p.bid||"").toLowerCase().includes(q))&&(!owner||p.owner===owner));
  const size=pageSize(); const totalPages=Math.max(1,Math.ceil(rows.length/size)); projectPage=Math.min(projectPage,totalPages); const pageRows=rows.slice((projectPage-1)*size,projectPage*size);
  document.getElementById("projectTableBody").innerHTML=rows.length?pageRows.map(p=>`<tr data-project="${escapeHTML(p.name)}"><td class="project-name">${escapeHTML(p.name)}<span class="subline">${escapeHTML(p.bid||"Chưa có mã TBMT")}${p.location ? " · " + escapeHTML(p.location) : ""}</span></td><td><span class="owner-badge owner-${escapeHTML(p.owner)}">${escapeHTML(p.owner||"Chưa rõ")}</span></td><td class="number">${p.total}</td><td class="number" style="color:var(--green)">${p.done}</td><td class="number" style="color:var(--amber)">${p.progress}</td><td class="number" style="color:var(--red)">${p.pending}</td><td class="progress-cell"><div class="progress-caption"><b>${p.total?p.pct+"%":"—"}</b><span>${p.done}/${p.total}</span></div><div class="progress-line"><span style="width:${p.pct}%;background:${p.pct===100?'var(--green)':p.pct?'var(--amber)':'var(--red)'}"></span></div></td><td>${p.last}</td><td><div class="row-actions"><button class="icon-button add-item-project" data-project="${escapeHTML(p.name)}" title="Thêm hàng hóa cho dự án">+</button><button class="icon-button edit-project" data-project="${escapeHTML(p.name)}" title="Sửa dự án">✎</button><button class="icon-button danger delete-project" data-project="${escapeHTML(p.name)}" title="Xóa dự án">×</button></div></td></tr>`).join(""):`<tr><td colspan="9" class="empty-state">Không có dự án phù hợp.</td></tr>`;
  renderPagination("projectPagination",projectPage,rows.length,page=>{projectPage=page;renderProjectTable();});
  document.querySelectorAll("#projectTableBody tr[data-project]").forEach(row=>{row.style.cursor="pointer";row.addEventListener("click",()=>openProject(row.dataset.project));});
  document.querySelectorAll(".add-item-project").forEach(btn=>btn.addEventListener("click",event=>{event.stopPropagation();openModal(null,btn.dataset.project);}));
  document.querySelectorAll(".edit-project").forEach(btn=>btn.addEventListener("click",event=>{event.stopPropagation();openProjectModal(btn.dataset.project);}));
  document.querySelectorAll(".delete-project").forEach(btn=>btn.addEventListener("click",event=>{event.stopPropagation();deleteProject(btn.dataset.project);}));
}

function filteredItems(){
  const q=document.getElementById("itemSearch").value.trim().toLowerCase(); const project=document.getElementById("projectFilter").value; const owner=document.getElementById("ownerFilter").value; const status=document.getElementById("statusFilter").value;
  return items.filter(item=>{
    const hay=[item.project,item.name,item.model,item.maker,item.bid,item.location].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(!project||item.project===project)&&(!owner||item.owner===owner)&&(!status||statusOf(item)===status);
  });
}

function renderInventory(){
  const rows=filteredItems(); const size=pageSize(); const totalPages=Math.max(1,Math.ceil(rows.length/size)); inventoryPage=Math.min(inventoryPage,totalPages); const start=(inventoryPage-1)*size; const pageRows=rows.slice(start,start+size);
  document.getElementById("resultSummary").textContent=rows.length?`Hiển thị ${start+1}-${Math.min(start+size,rows.length)} / ${rows.length} dòng phù hợp · ${items.length} dòng tổng cộng`:`Không có dòng phù hợp · ${items.length} dòng tổng cộng`;
  document.getElementById("inventoryTableBody").innerHTML=rows.length?pageRows.map(item=>{
    const status=statusOf(item), progress=progressOf(item), remaining=remainingOf(item);
    return `<tr><td class="item-title"><div class="project-ref">${escapeHTML(item.owner)} · ${escapeHTML(item.project)}</div>${escapeHTML(item.name)}<span class="subline">${escapeHTML(item.model||item.bid||"")}</span></td><td>${escapeHTML(item.unit)}</td><td class="number">${formatNumber(item.plan)}</td><td class="number">${formatNumber(item.received)}</td><td class="number">${formatNumber(remaining)}</td><td class="progress-cell"><div class="progress-caption"><b>${item.received===null?"—":progress+"%"}</b></div><div class="progress-line"><span style="width:${progress}%;background:${status==="Hoàn thành"?'var(--green)':status==="Đang nhập"?'var(--amber)':'var(--red)'}"></span></div></td><td><span class="status-badge status-${className(status)}">${status}</span></td><td>${escapeHTML(item.date||"—")}</td><td><div class="row-actions"><button class="icon-button edit-item" data-id="${item.id}" title="Sửa">✎</button><button class="icon-button danger delete-item" data-id="${item.id}" title="Xóa">×</button></div></td></tr>`;
  }).join(""):`<tr><td colspan="9" class="empty-state">Không có dòng hàng hóa phù hợp bộ lọc.</td></tr>`;
  document.querySelectorAll(".edit-item").forEach(btn=>btn.addEventListener("click",()=>openModal(btn.dataset.id)));
  document.querySelectorAll(".delete-item").forEach(btn=>btn.addEventListener("click",()=>deleteItem(btn.dataset.id)));
  renderPagination("inventoryPagination",inventoryPage,rows.length,page=>{inventoryPage=page;renderInventory();});
}

function fillSelects(){
  const projectNames=[...new Set([...projects.map(x=>x.name),...items.map(x=>x.project)])].sort((a,b)=>a.localeCompare(b,"vi")); const owners=[...new Set([...projects.map(x=>x.owner),...items.map(x=>x.owner)].filter(Boolean))].sort();
  const setOptions=(id,first,values)=>{const el=document.getElementById(id),previous=el.value;el.innerHTML=`<option value="">${first}</option>`+values.map(v=>`<option>${escapeHTML(v)}</option>`).join("");el.value=values.includes(previous)?previous:"";};
  setOptions("projectFilter","Tất cả dự án",projectNames); setOptions("ownerFilter","Tất cả đơn vị",owners); setOptions("projectOwnerFilter","Tất cả đơn vị",owners);
}

function renderSettings(){
  document.getElementById("systemNameSetting").value=settings.systemName;
  document.getElementById("pageSizeSetting").value=String(pageSize());
  document.getElementById("systemNameHeading").textContent=settings.systemName;
  document.title=settings.systemName;
  const groups=[
    ["owners","ownerSettingsList","ownerOptions"],
    ["units","unitSettingsList","unitOptions"],
    ["makers","makerSettingsList","makerOptions"]
  ];
  groups.forEach(([kind,listId,dataListId])=>{
    document.getElementById(listId).innerHTML=settings[kind].length?settings[kind].map(value=>`<span class="setting-chip">${escapeHTML(value)}<button type="button" data-setting="${kind}" data-value="${escapeHTML(value)}" aria-label="Xóa ${escapeHTML(value)}">×</button></span>`).join(""):`<span class="small-note">Chưa có dữ liệu cấu hình.</span>`;
    document.getElementById(dataListId).innerHTML=settings[kind].map(value=>`<option value="${escapeHTML(value)}"></option>`).join("");
  });
  document.querySelectorAll(".setting-chip button").forEach(button=>button.addEventListener("click",()=>{
    const kind=button.dataset.setting; settings[kind]=settings[kind].filter(value=>value!==button.dataset.value); saveSettings(); renderSettings(); fillSelects(); showToast("Đã xóa khỏi cấu hình");
  }));
}

function renderAll(){ fillSelects(); renderMetrics(); renderStatusChart(); renderAttention(); renderProjectTable(); renderInventory(); renderSettings(); }

function switchView(view){
  const views=["overview","inventory","settings"]; const index=Math.max(0,views.indexOf(view)); activeView=views[index];
  document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.view===view)); document.querySelectorAll(".view").forEach(v=>v.classList.remove("active")); document.getElementById(view+"View").classList.add("active");
  const titles={overview:"Tổng quan nhập hàng",inventory:"Danh mục hàng hóa",settings:"Cài đặt website"};
  const descriptions={overview:"Theo dõi nhanh tiến độ, điểm nghẽn và những dự án cần cập nhật.",inventory:"Tìm kiếm, cập nhật và kiểm soát từng dòng hàng theo dự án.",settings:"Quản lý các lựa chọn dùng chung và cách hiển thị dữ liệu."};
  document.getElementById("pageTitle").textContent=titles[view]; document.getElementById("pageDescription").textContent=descriptions[view];
  document.getElementById("backViewButton").disabled=index===0; document.getElementById("nextViewButton").disabled=index===views.length-1; document.getElementById("viewStep").textContent=`${index+1} / ${views.length}`;
}
function openProject(project){ document.getElementById("projectFilter").value=project; inventoryPage=1; switchView("inventory"); renderInventory(); window.scrollTo({top:0,behavior:"smooth"}); }

const fieldMap={project:"fieldProject",owner:"fieldOwner",name:"fieldName",unit:"fieldUnit",plan:"fieldPlan",received:"fieldReceived",date:"fieldDate",bid:"fieldBid",order:"fieldOrder",model:"fieldModel",maker:"fieldMaker",location:"fieldLocation"};
function openModal(id=null, projectName=null){
  editingId=id; document.getElementById("itemForm").reset(); document.getElementById("modalTitle").textContent=id?"Sửa hàng hóa":"Thêm hàng hóa";
  if(id){const item=items.find(x=>x.id===id);Object.entries(fieldMap).forEach(([key,field])=>document.getElementById(field).value=item[key]??"");} else {document.getElementById("fieldDate").value=new Date().toISOString().slice(0,10);}
  if(!id && projectName){
    const project=projectSummaries().find(x=>x.name===projectName);
    document.getElementById("fieldProject").value=project?.name||projectName;
    document.getElementById("fieldOwner").value=project?.owner||"";
    document.getElementById("fieldBid").value=project?.bid||"";
    document.getElementById("fieldLocation").value=project?.location||"";
  }
  const modal=document.getElementById("modalBackdrop"); modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); setTimeout(()=>document.getElementById(projectName?"fieldName":"fieldProject").focus(),50);
}
function closeModal(){const modal=document.getElementById("modalBackdrop");modal.classList.remove("open");modal.setAttribute("aria-hidden","true");editingId=null;}
function saveForm(event){
  event.preventDefault(); const data={}; Object.entries(fieldMap).forEach(([key,field])=>data[key]=document.getElementById(field).value.trim()); data.plan=numberOrNull(data.plan); data.received=numberOrNull(data.received);
  ensureSettingValue("owners",data.owner); ensureSettingValue("units",data.unit); ensureSettingValue("makers",data.maker);
  if(editingId){const index=items.findIndex(x=>x.id===editingId);items[index]={...items[index],...data};upsertProjectFromItem(items[index]);showToast("Đã cập nhật hàng hóa");} else {const item={id:"u"+Date.now(),...data};items.unshift(item);upsertProjectFromItem(item);showToast("Đã thêm hàng hóa mới");}
  persistAll(); closeModal(); renderAll();
}
function openConfirmModal(message,onConfirm){pendingConfirmAction=onConfirm;document.getElementById("confirmModalMessage").textContent=message;const modal=document.getElementById("confirmModalBackdrop");modal.classList.add("open");modal.setAttribute("aria-hidden","false");setTimeout(()=>document.getElementById("cancelConfirmModal").focus(),50);}
function closeConfirmModal(){pendingConfirmAction=null;const modal=document.getElementById("confirmModalBackdrop");modal.classList.remove("open");modal.setAttribute("aria-hidden","true");}
function acceptConfirmAction(){const action=pendingConfirmAction;closeConfirmModal();if(action)action();}
function deleteItem(id){const item=items.find(x=>x.id===id);if(!item)return;openConfirmModal(`Xóa “${item.name}” khỏi dự án ${item.project}?`,()=>{items=items.filter(x=>x.id!==id);persistAll();renderAll();showToast("Đã xóa dòng hàng");});}

function openProjectModal(projectName=null){
  editingProjectId=null; document.getElementById("projectForm").reset();
  document.getElementById("projectModalTitle").textContent=projectName?"Sửa dự án":"Thêm dự án";
  if(projectName){
    const summary=projectSummaries().find(x=>x.name===projectName); const record=projectByName(projectName) || summary;
    editingProjectId=record.id;
    document.getElementById("projectNameField").value=record.name||"";
    document.getElementById("projectOwnerField").value=record.owner||"";
    document.getElementById("projectBidField").value=record.bid||"";
    document.getElementById("projectLocationField").value=record.location||"";
  }
  const modal=document.getElementById("projectModalBackdrop"); modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); setTimeout(()=>document.getElementById("projectNameField").focus(),50);
}
function closeProjectModal(){const modal=document.getElementById("projectModalBackdrop");modal.classList.remove("open");modal.setAttribute("aria-hidden","true");editingProjectId=null;}
function saveProject(event){
  event.preventDefault();
  const data={
    name: document.getElementById("projectNameField").value.trim(),
    owner: document.getElementById("projectOwnerField").value.trim(),
    bid: document.getElementById("projectBidField").value.trim(),
    location: document.getElementById("projectLocationField").value.trim()
  };
  const duplicated=projects.some(project=>project.name===data.name && project.id!==editingProjectId);
  if(duplicated){showToast("Tên dự án đã tồn tại");return;}
  ensureSettingValue("owners",data.owner);
  if(editingProjectId){
    const record=projects.find(project=>project.id===editingProjectId);
    const oldName=record.name;
    Object.assign(record,data);
    items=items.map(item=>item.project===oldName?{...item,project:data.name,owner:data.owner,bid:data.bid,location:data.location}:item);
    showToast("Đã cập nhật dự án");
  } else {
    projects.unshift({id:"p"+Date.now(),...data});
    showToast("Đã thêm dự án mới");
  }
  persistAll(); closeProjectModal(); renderAll();
}
function deleteProject(projectName){
  const related=items.filter(item=>item.project===projectName).length;
  const message=related?`Xóa dự án “${projectName}” và ${related} dòng hàng hóa thuộc dự án này?`:`Xóa dự án “${projectName}”?`;
  openConfirmModal(message,()=>{projects=projects.filter(project=>project.name!==projectName);items=items.filter(item=>item.project!==projectName);persistAll();renderAll();showToast("Đã xóa dự án");});
}

function exportCSV(){
  const headers=["Dự án","Đơn vị","Mã TBMT","STT","Hàng hóa","ĐVT","Kế hoạch","Đã nhập","Còn lại","Tiến độ","Trạng thái","Cập nhật","Ký mã hiệu","Hãng SX","Địa điểm"]; const quote=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const rows=filteredItems().map(i=>[i.project,i.owner,i.bid,i.order,i.name,i.unit,i.plan,i.received,remainingOf(i),progressOf(i)+"%",statusOf(i),i.date,i.model,i.maker,i.location]); const blob=new Blob(["\ufeff"+[headers,...rows].map(r=>r.map(quote).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="danh-muc-hang-nhap.csv";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast(`Đã xuất ${rows.length} dòng`);
}
let toastTimer; function showToast(message){const toast=document.getElementById("toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);}

document.querySelectorAll(".nav-button").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.view)));
document.getElementById("backViewButton").addEventListener("click",()=>{const views=["overview","inventory","settings"];switchView(views[Math.max(0,views.indexOf(activeView)-1)]);window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("nextViewButton").addEventListener("click",()=>{const views=["overview","inventory","settings"];switchView(views[Math.min(views.length-1,views.indexOf(activeView)+1)]);window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("addButton").addEventListener("click",()=>openModal()); document.getElementById("exportButton").addEventListener("click",exportCSV);
document.getElementById("addProjectButton").addEventListener("click",()=>openProjectModal());
document.getElementById("closeModal").addEventListener("click",closeModal); document.getElementById("cancelModal").addEventListener("click",closeModal); document.getElementById("itemForm").addEventListener("submit",saveForm);
document.getElementById("closeProjectModal").addEventListener("click",closeProjectModal); document.getElementById("cancelProjectModal").addEventListener("click",closeProjectModal); document.getElementById("projectForm").addEventListener("submit",saveProject);
document.getElementById("cancelConfirmModal").addEventListener("click",closeConfirmModal); document.getElementById("acceptConfirmModal").addEventListener("click",acceptConfirmAction);
document.getElementById("modalBackdrop").addEventListener("click",event=>{if(event.target.id==="modalBackdrop")closeModal();}); document.getElementById("projectModalBackdrop").addEventListener("click",event=>{if(event.target.id==="projectModalBackdrop")closeProjectModal();}); document.getElementById("confirmModalBackdrop").addEventListener("click",event=>{if(event.target.id==="confirmModalBackdrop")closeConfirmModal();});
document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeModal();closeProjectModal();closeConfirmModal();}});
["projectSearch","projectOwnerFilter"].forEach(id=>document.getElementById(id).addEventListener("input",()=>{projectPage=1;renderProjectTable();}));
["itemSearch","projectFilter","ownerFilter","statusFilter"].forEach(id=>document.getElementById(id).addEventListener("input",()=>{inventoryPage=1;renderInventory();}));
document.getElementById("clearFilters").addEventListener("click",()=>{["itemSearch","projectFilter","ownerFilter","statusFilter"].forEach(id=>document.getElementById(id).value="");inventoryPage=1;renderInventory();});
document.getElementById("generalSettingsForm").addEventListener("submit",event=>{event.preventDefault();settings.systemName=document.getElementById("systemNameSetting").value.trim()||"Điều phối nhập hàng";settings.pageSize=Number(document.getElementById("pageSizeSetting").value);projectPage=1;inventoryPage=1;saveSettings();renderAll();showToast("Đã lưu cấu hình website");});
document.querySelectorAll(".setting-add-form").forEach(form=>form.addEventListener("submit",event=>{event.preventDefault();const input=form.querySelector("input");const before=settings[form.dataset.setting].length;ensureSettingValue(form.dataset.setting,input.value.trim());if(settings[form.dataset.setting].length===before){showToast("Giá trị đã tồn tại");return;}saveSettings();input.value="";renderSettings();showToast("Đã thêm cấu hình");}));
renderAll();
switchView("overview");
