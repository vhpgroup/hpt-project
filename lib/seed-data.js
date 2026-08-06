/**
 * Dữ liệu mẫu theo mô hình v2: dự án → gói thầu → dòng hàng → đợt nhập.
 * Đặt SEED_DEMO_DATA=false để khởi tạo database rỗng.
 */

export const seedProjects = [
  { id: "pj-thanhhoa-phoi", name: "Bệnh viện Phổi Thanh Hóa",       location: "Thanh Hóa" },
  { id: "pj-thaibinh-tt",   name: "BV Sức khỏe tâm thần Thái Bình", location: "Thái Bình" },
  { id: "pj-quangninh-nd",  name: "Nhiệt điện Quảng Ninh",          location: "Quảng Ninh" },
  { id: "pj-sadec-dk",      name: "Bệnh viện Đa khoa Sa Đéc",       location: "Đồng Tháp" },
  { id: "pj-qlb-mientrung", name: "Quản lý bay miền Trung",         location: "Đà Nẵng" },
  { id: "pj-ttd3",          name: "Công ty Truyền tải điện 3",      location: "Khánh Hòa" },
  { id: "pj-dalieu-tw",     name: "Bệnh viện Da Liễu Trung ương",   location: "Hà Nội" },
  { id: "pj-dhnh-hcm",      name: "Đại học Ngân hàng TP.HCM",       location: "TP.HCM" },
];

export const seedPackages = [
  { id: "pk-thanhhoa-1", projectId: "pj-thanhhoa-phoi", code: "IB2600343748", name: "Mua sắm thiết bị CNTT",       owner: "HPT",    location: "Thanh Hóa",  deadline: "2026-08-30" },
  { id: "pk-thaibinh-1", projectId: "pj-thaibinh-tt",   code: "IB2600349912", name: "Trang thiết bị tin học",      owner: "HPT",    location: "Thái Bình",  deadline: "2026-08-15" },
  { id: "pk-quangninh-1",projectId: "pj-quangninh-nd",  code: "IB2600403822", name: "Bản quyền phần mềm",          owner: "Vision", location: "Quảng Ninh", deadline: "2026-09-30" },
  { id: "pk-sadec-1",    projectId: "pj-sadec-dk",      code: "IB2600411034", name: "Thiết bị mạng và kiểm soát",  owner: "Vision", location: "Đồng Tháp",  deadline: "2026-08-20" },
  { id: "pk-qlb-1",      projectId: "pj-qlb-mientrung", code: "IB2600367211", name: "Máy tính và màn hình",        owner: "HPT",    location: "Đà Nẵng",    deadline: "2026-08-25" },
  { id: "pk-ttd3-1",     projectId: "pj-ttd3",          code: "IB2600372028", name: "Thiết bị văn phòng",          owner: "HPT",    location: "Khánh Hòa",  deadline: "2026-08-12" },
  { id: "pk-dalieu-1",   projectId: "pj-dalieu-tw",     code: "IB2600380124", name: "Máy tính chuyên dụng",        owner: "HPT",    location: "Hà Nội",     deadline: "2026-09-10" },
  { id: "pk-dhnh-1",     projectId: "pj-dhnh-hcm",      code: "IB2600385370", name: "Hệ thống điện và lắp đặt",    owner: "HPT",    location: "TP.HCM",     deadline: "2026-08-18" },
];

/** `receipts` rỗng = chưa cập nhật; đợt nhập qty 0 = đã xác nhận chưa nhập được gì. */
export const seedItems = [
  { id: "i1",  packageId: "pk-thanhhoa-1", orderNo: "1", name: "Bộ máy tính để bàn lắp ráp",      unit: "Bộ",      planQty: 21,  model: "Core i7-12700 / Dell E2225HM", maker: "HPT",        receipts: [{ qty: 12, date: "2026-07-20" }, { qty: 9, date: "2026-07-29" }] },
  { id: "i2",  packageId: "pk-thaibinh-1", orderNo: "1", name: "Máy tính để bàn Dell Tower",      unit: "Bộ",      planQty: 10,  model: "Dell ECT1250",                 maker: "Dell",       receipts: [{ qty: 10, date: "2026-07-29" }] },
  { id: "i3",  packageId: "pk-thaibinh-1", orderNo: "2", name: "Máy quét tài liệu",               unit: "Chiếc",   planQty: 11,  model: "HP ScanJet Pro 2000 S2",       maker: "HP",         receipts: [{ qty: 11, date: "2026-07-29" }] },
  { id: "i4",  packageId: "pk-quangninh-1",orderNo: "1", name: "Microsoft 365 Business Standard", unit: "License", planQty: 246, model: "Microsoft 365",                maker: "Microsoft",  receipts: [] },
  { id: "i5",  packageId: "pk-sadec-1",    orderNo: "1", name: "Máy vân tay",                     unit: "Cái",     planQty: 30,  model: "ZK9500",                       maker: "ZKTeco",     receipts: [{ qty: 0, date: "2026-08-01", note: "Nhà cung cấp báo chậm giao" }] },
  { id: "i6",  packageId: "pk-sadec-1",    orderNo: "2", name: "Máy in mã vạch",                  unit: "Cái",     planQty: 16,  model: "ZD230TA",                      maker: "Zebra",      receipts: [{ qty: 6, date: "2026-08-01" }] },
  { id: "i7",  packageId: "pk-sadec-1",    orderNo: "3", name: "Thiết bị thu phát Wi-Fi 6",       unit: "Cái",     planQty: 20,  model: "RG-RAP2260",                   maker: "Ruijie",     receipts: [{ qty: 8, date: "2026-07-25" }, { qty: 4, date: "2026-08-01" }] },
  { id: "i8",  packageId: "pk-qlb-1",      orderNo: "1", name: "Máy tính xách tay",               unit: "Cái",     planQty: 15,  model: "ThinkBook 14 G7",              maker: "Lenovo",     receipts: [{ qty: 15, date: "2026-07-29" }] },
  { id: "i9",  packageId: "pk-qlb-1",      orderNo: "2", name: "Màn hình chuyên dụng",            unit: "Cái",     planQty: 18,  model: "Dell P2425H",                  maker: "Dell",       receipts: [{ qty: 8, date: "2026-07-29" }] },
  { id: "i10", packageId: "pk-ttd3-1",     orderNo: "1", name: "Máy tính để bàn",                 unit: "Bộ",      planQty: 25,  model: "Dell 7020 SFF",                maker: "Dell",       receipts: [{ qty: 0, date: "2026-08-04" }] },
  { id: "i11", packageId: "pk-ttd3-1",     orderNo: "2", name: "Máy in laser đen trắng",          unit: "Cái",     planQty: 8,   model: "HP LaserJet Pro",              maker: "HP",         receipts: [{ qty: 0, date: "2026-08-04" }] },
  { id: "i12", packageId: "pk-dalieu-1",   orderNo: "1", name: "Máy tính để bàn chuyên dụng",     unit: "Bộ",      planQty: 54,  model: "Dell OptiPlex",                maker: "Dell",       receipts: [{ qty: 30, date: "2026-07-28" }, { qty: 24, date: "2026-08-03" }] },
  { id: "i13", packageId: "pk-dalieu-1",   orderNo: "2", name: "Máy tính xách tay",               unit: "Chiếc",   planQty: 12,  model: "HP ProBook",                   maker: "HP",         receipts: [{ qty: 3, date: "2026-08-03" }] },
  { id: "i14", packageId: "pk-dhnh-1",     orderNo: "1", name: "Bộ lưu điện UPS 20KVA",           unit: "Bộ",      planQty: 1,   model: "CyberPower OLS3S20KE",         maker: "CyberPower", receipts: [{ qty: 0, date: "2026-08-04" }] },
  { id: "i15", packageId: "pk-dhnh-1",     orderNo: "2", name: "Vật tư phụ và nhân công lắp đặt", unit: "Gói",     planQty: 1,   model: "",                             maker: "",           receipts: [] },
];
