const STORAGE_KEY = "project_import_manager_v2";

const seedItems = [
  {id:"i1",project:"Bệnh viện Phổi Thanh Hóa",owner:"HPT",bid:"IB2600343748",order:"1",name:"Bộ máy tính để bàn lắp ráp",unit:"Bộ",plan:21,received:21,date:"2026-07-29",model:"Core i7-12700 / Dell E2225HM",maker:"HPT",location:"Thanh Hóa"},
  {id:"i2",project:"BV Sức khỏe tâm thần Thái Bình",owner:"HPT",bid:"IB2600349912",order:"1",name:"Máy tính để bàn Dell Tower",unit:"Bộ",plan:10,received:10,date:"2026-07-29",model:"Dell ECT1250",maker:"Dell",location:"Thái Bình"},
  {id:"i3",project:"BV Sức khỏe tâm thần Thái Bình",owner:"HPT",bid:"IB2600349912",order:"2",name:"Máy quét tài liệu",unit:"Chiếc",plan:11,received:11,date:"2026-07-29",model:"HP ScanJet Pro 2000 S2",maker:"HP",location:"Thái Bình"},
  {id:"i4",project:"Nhiệt điện Quảng Ninh",owner:"Vision",bid:"IB2600403822",order:"1",name:"Microsoft 365 Business Standard",unit:"License",plan:246,received:null,date:"",model:"Microsoft 365",maker:"Microsoft",location:"Quảng Ninh"},
  {id:"i5",project:"Bệnh viện Đa khoa Sa Đéc",owner:"Vision",bid:"IB2600411034",order:"1",name:"Máy vân tay",unit:"Cái",plan:30,received:0,date:"2026-08-01",model:"ZK9500",maker:"ZKTeco",location:"Đồng Tháp"},
  {id:"i6",project:"Bệnh viện Đa khoa Sa Đéc",owner:"Vision",bid:"IB2600411034",order:"2",name:"Máy in mã vạch",unit:"Cái",plan:16,received:6,date:"2026-08-01",model:"ZD230TA",maker:"Zebra",location:"Đồng Tháp"},
  {id:"i7",project:"Bệnh viện Đa khoa Sa Đéc",owner:"Vision",bid:"IB2600411034",order:"3",name:"Thiết bị thu phát Wi‑Fi 6",unit:"Cái",plan:20,received:12,date:"2026-08-01",model:"RG-RAP2260",maker:"Ruijie",location:"Đồng Tháp"},
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
let editingId = null;

function loadItems(){
  try { const saved = localStorage.getItem(STORAGE_KEY); if(saved) return JSON.parse(saved); } catch (_) {}
  return structuredClone(seedItems);
}
function saveItems(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function numberOrNull(value){ if(value === null || value === undefined || value === "") return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function statusOf(item){ const planned=numberOrNull(item.plan), received=numberOrNull(item.received); if(received===null) return "Chưa cập nhật"; if(received===0) return "Chưa nhập"; if(planned!==null && received>=planned) return "Hoàn thành"; return "Đang nhập"; }
function progressOf(item){ const p=numberOrNull(item.plan), r=numberOrNull(item.received); return p && r!==null ? Math.min(100,Math.round(r/p*100)) : 0; }
function remainingOf(item){ const p=numberOrNull(item.plan), r=numberOrNull(item.received); return p===null || r===null ? null : Math.max(0,p-r); }
function formatNumber(value){ return value===null || value==="" ? "—" : Number(value).toLocaleString("vi-VN"); }
function escapeHTML(value){ return String(value??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function className(value){ return value.replaceAll(" ","-"); }
function latestDate(list){ return list.map(x=>x.date).filter(Boolean).sort().reverse()[0] || "—"; }

function projectSummaries(){
  const map = new Map();
  items.forEach(item=>{
    if(!map.has(item.project)) map.set(item.project,{name:item.project,owner:item.owner,total:0,done:0,progress:0,pending:0,unknown:0,items:[]});
    const p=map.get(item.project); p.total++; p.items.push(item);
    const status=statusOf(item);
    if(status==="Hoàn thành")p.done++; else if(status==="Đang nhập")p.progress++; else if(status==="Chưa nhập")p.pending++; else p.unknown++;
  });
  return [...map.values()].map(p=>({...p,pct:p.total?Math.round(p.done/p.total*100):0,last:latestDate(p.items)})).sort((a,b)=>b.pct-a.pct || b.total-a.total);
}

function renderMetrics(){
  const statuses=items.map(statusOf); const projects=new Set(items.map(x=>x.project)).size; const done=statuses.filter(x=>x==="Hoàn thành").length; const active=statuses.filter(x=>x==="Đang nhập").length; const pending=statuses.filter(x=>x==="Chưa nhập").length; const completePct=items.length?Math.round(done/items.length*100):0;
  const cards=[
    ["Dự án đang theo dõi",projects,`${items.length} dòng hàng hóa`,"#087f8c","#e7f6f6"],
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
  const rows=projectSummaries().filter(p=>p.pct<100).sort((a,b)=>(b.pending+b.unknown)-(a.pending+a.unknown) || a.pct-b.pct).slice(0,4);
  document.getElementById("attentionList").innerHTML=rows.length?rows.map(p=>`<button class="attention-item" data-project="${escapeHTML(p.name)}"><span><strong>${escapeHTML(p.name)}</strong><p>${p.pending} chưa nhập · ${p.unknown} chưa cập nhật</p></span><span class="attention-score">${p.pct}%</span></button>`).join(""):`<div class="empty-state">Không có dự án cần chú ý.</div>`;
  document.querySelectorAll(".attention-item").forEach(btn=>btn.addEventListener("click",()=>openProject(btn.dataset.project)));
}

function renderProjectTable(){
  const q=document.getElementById("projectSearch").value.trim().toLowerCase(); const owner=document.getElementById("projectOwnerFilter").value;
  const rows=projectSummaries().filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!owner||p.owner===owner));
  document.getElementById("projectTableBody").innerHTML=rows.length?rows.map(p=>`<tr data-project="${escapeHTML(p.name)}"><td class="project-name">${escapeHTML(p.name)}<span class="subline">${escapeHTML(p.items[0]?.bid||"Chưa có mã TBMT")}</span></td><td><span class="owner-badge owner-${escapeHTML(p.owner)}">${escapeHTML(p.owner)}</span></td><td class="number">${p.total}</td><td class="number" style="color:var(--green)">${p.done}</td><td class="number" style="color:var(--amber)">${p.progress}</td><td class="number" style="color:var(--red)">${p.pending}</td><td class="progress-cell"><div class="progress-caption"><b>${p.pct}%</b><span>${p.done}/${p.total}</span></div><div class="progress-line"><span style="width:${p.pct}%;background:${p.pct===100?'var(--green)':p.pct?'var(--amber)':'var(--red)'}"></span></div></td><td>${p.last}</td></tr>`).join(""):`<tr><td colspan="8" class="empty-state">Không có dự án phù hợp.</td></tr>`;
  document.querySelectorAll("#projectTableBody tr[data-project]").forEach(row=>{row.style.cursor="pointer";row.addEventListener("click",()=>openProject(row.dataset.project));});
}

function filteredItems(){
  const q=document.getElementById("itemSearch").value.trim().toLowerCase(); const project=document.getElementById("projectFilter").value; const owner=document.getElementById("ownerFilter").value; const status=document.getElementById("statusFilter").value;
  return items.filter(item=>{
    const hay=[item.project,item.name,item.model,item.maker,item.bid,item.location].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(!project||item.project===project)&&(!owner||item.owner===owner)&&(!status||statusOf(item)===status);
  });
}

function renderInventory(){
  const rows=filteredItems(); document.getElementById("resultSummary").textContent=`Hiển thị ${rows.length} / ${items.length} dòng hàng hóa`;
  document.getElementById("inventoryTableBody").innerHTML=rows.length?rows.map(item=>{
    const status=statusOf(item), progress=progressOf(item), remaining=remainingOf(item);
    return `<tr><td class="item-title"><div class="project-ref">${escapeHTML(item.owner)} · ${escapeHTML(item.project)}</div>${escapeHTML(item.name)}<span class="subline">${escapeHTML(item.model||item.bid||"")}</span></td><td>${escapeHTML(item.unit)}</td><td class="number">${formatNumber(item.plan)}</td><td class="number">${formatNumber(item.received)}</td><td class="number">${formatNumber(remaining)}</td><td class="progress-cell"><div class="progress-caption"><b>${item.received===null?"—":progress+"%"}</b></div><div class="progress-line"><span style="width:${progress}%;background:${status==="Hoàn thành"?'var(--green)':status==="Đang nhập"?'var(--amber)':'var(--red)'}"></span></div></td><td><span class="status-badge status-${className(status)}">${status}</span></td><td>${escapeHTML(item.date||"—")}</td><td><div class="row-actions"><button class="icon-button edit-item" data-id="${item.id}" title="Sửa">✎</button><button class="icon-button danger delete-item" data-id="${item.id}" title="Xóa">×</button></div></td></tr>`;
  }).join(""):`<tr><td colspan="9" class="empty-state">Không có dòng hàng hóa phù hợp bộ lọc.</td></tr>`;
  document.querySelectorAll(".edit-item").forEach(btn=>btn.addEventListener("click",()=>openModal(btn.dataset.id)));
  document.querySelectorAll(".delete-item").forEach(btn=>btn.addEventListener("click",()=>deleteItem(btn.dataset.id)));
}

function fillSelects(){
  const projects=[...new Set(items.map(x=>x.project))].sort((a,b)=>a.localeCompare(b,"vi")); const owners=[...new Set(items.map(x=>x.owner))].sort();
  const setOptions=(id,first,values)=>{const el=document.getElementById(id),previous=el.value;el.innerHTML=`<option value="">${first}</option>`+values.map(v=>`<option>${escapeHTML(v)}</option>`).join("");el.value=values.includes(previous)?previous:"";};
  setOptions("projectFilter","Tất cả dự án",projects); setOptions("ownerFilter","Tất cả đơn vị",owners); setOptions("projectOwnerFilter","Tất cả đơn vị",owners);
}

function renderAll(){ fillSelects(); renderMetrics(); renderStatusChart(); renderAttention(); renderProjectTable(); renderInventory(); }

function switchView(view){
  document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.view===view)); document.querySelectorAll(".view").forEach(v=>v.classList.remove("active")); document.getElementById(view+"View").classList.add("active");
  document.getElementById("pageTitle").textContent=view==="overview"?"Tổng quan nhập hàng":"Danh mục hàng hóa"; document.getElementById("pageDescription").textContent=view==="overview"?"Theo dõi nhanh tiến độ, điểm nghẽn và những dự án cần cập nhật.":"Tìm kiếm, cập nhật và kiểm soát từng dòng hàng theo dự án.";
}
function openProject(project){ document.getElementById("projectFilter").value=project; switchView("inventory"); renderInventory(); window.scrollTo({top:0,behavior:"smooth"}); }

const fieldMap={project:"fieldProject",owner:"fieldOwner",name:"fieldName",unit:"fieldUnit",plan:"fieldPlan",received:"fieldReceived",date:"fieldDate",bid:"fieldBid",order:"fieldOrder",model:"fieldModel",maker:"fieldMaker",location:"fieldLocation"};
function openModal(id=null){
  editingId=id; document.getElementById("itemForm").reset(); document.getElementById("modalTitle").textContent=id?"Sửa hàng hóa":"Thêm hàng hóa";
  if(id){const item=items.find(x=>x.id===id);Object.entries(fieldMap).forEach(([key,field])=>document.getElementById(field).value=item[key]??"");} else {document.getElementById("fieldDate").value=new Date().toISOString().slice(0,10);}
  const modal=document.getElementById("modalBackdrop"); modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); setTimeout(()=>document.getElementById("fieldProject").focus(),50);
}
function closeModal(){const modal=document.getElementById("modalBackdrop");modal.classList.remove("open");modal.setAttribute("aria-hidden","true");editingId=null;}
function saveForm(event){
  event.preventDefault(); const data={}; Object.entries(fieldMap).forEach(([key,field])=>data[key]=document.getElementById(field).value.trim()); data.plan=numberOrNull(data.plan); data.received=numberOrNull(data.received);
  if(editingId){const index=items.findIndex(x=>x.id===editingId);items[index]={...items[index],...data};showToast("Đã cập nhật hàng hóa");} else {items.unshift({id:"u"+Date.now(),...data});showToast("Đã thêm hàng hóa mới");}
  saveItems(); closeModal(); renderAll();
}
function deleteItem(id){const item=items.find(x=>x.id===id);if(!confirm(`Xóa “${item.name}” khỏi dự án ${item.project}?`))return;items=items.filter(x=>x.id!==id);saveItems();renderAll();showToast("Đã xóa dòng hàng");}
function exportCSV(){
  const headers=["Dự án","Đơn vị","Mã TBMT","STT","Hàng hóa","ĐVT","Kế hoạch","Đã nhập","Còn lại","Tiến độ","Trạng thái","Cập nhật","Ký mã hiệu","Hãng SX","Địa điểm"]; const quote=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const rows=filteredItems().map(i=>[i.project,i.owner,i.bid,i.order,i.name,i.unit,i.plan,i.received,remainingOf(i),progressOf(i)+"%",statusOf(i),i.date,i.model,i.maker,i.location]); const blob=new Blob(["\ufeff"+[headers,...rows].map(r=>r.map(quote).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="danh-muc-hang-nhap.csv";a.click();URL.revokeObjectURL(a.href);showToast(`Đã xuất ${rows.length} dòng`);
}
let toastTimer; function showToast(message){const toast=document.getElementById("toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2200);}

document.querySelectorAll(".nav-button").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.view)));
document.getElementById("addButton").addEventListener("click",()=>openModal()); document.getElementById("exportButton").addEventListener("click",exportCSV);
document.getElementById("closeModal").addEventListener("click",closeModal); document.getElementById("cancelModal").addEventListener("click",closeModal); document.getElementById("itemForm").addEventListener("submit",saveForm);
document.getElementById("modalBackdrop").addEventListener("click",event=>{if(event.target.id==="modalBackdrop")closeModal();}); document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal();});
["projectSearch","projectOwnerFilter"].forEach(id=>document.getElementById(id).addEventListener("input",renderProjectTable));
["itemSearch","projectFilter","ownerFilter","statusFilter"].forEach(id=>document.getElementById(id).addEventListener("input",renderInventory));
document.getElementById("clearFilters").addEventListener("click",()=>{["itemSearch","projectFilter","ownerFilter","statusFilter"].forEach(id=>document.getElementById(id).value="");renderInventory();});
renderAll();
