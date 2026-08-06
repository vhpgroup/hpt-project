/**
 * Dữ liệu mẫu, chuyển từ mảng `seedItems` hardcode trong bản vanilla-JS cũ
 * sang dạng chuẩn hoá (project tách khỏi item).
 *
 * Đặt SEED_DEMO_DATA=false để khởi tạo database rỗng, không nạp dữ liệu này.
 */

export const seedProjects = [
  { id: "p-thanhhoa-phoi",  name: "Bệnh viện Phổi Thanh Hóa",          owner: "HPT",    bid: "IB2600343748", location: "Thanh Hóa" },
  { id: "p-thaibinh-tt",    name: "BV Sức khỏe tâm thần Thái Bình",    owner: "HPT",    bid: "IB2600349912", location: "Thái Bình" },
  { id: "p-quangninh-nd",   name: "Nhiệt điện Quảng Ninh",             owner: "Vision", bid: "IB2600403822", location: "Quảng Ninh" },
  { id: "p-sadec-dk",       name: "Bệnh viện Đa khoa Sa Đéc",          owner: "Vision", bid: "IB2600411034", location: "Đồng Tháp" },
  { id: "p-qlb-mientrung",  name: "Quản lý bay miền Trung",            owner: "HPT",    bid: "IB2600367211", location: "Đà Nẵng" },
  { id: "p-ttd3",           name: "Công ty Truyền tải điện 3",         owner: "HPT",    bid: "IB2600372028", location: "Khánh Hòa" },
  { id: "p-dalieu-tw",      name: "Bệnh viện Da Liễu Trung ương",      owner: "HPT",    bid: "IB2600380124", location: "Hà Nội" },
  { id: "p-dhnh-hcm",       name: "Đại học Ngân hàng TP.HCM",          owner: "HPT",    bid: "IB2600385370", location: "TP.HCM" },
];

export const seedItems = [
  { id: "i1",  projectId: "p-thanhhoa-phoi", orderNo: "1", name: "Bộ máy tính để bàn lắp ráp",        unit: "Bộ",      planQty: 21,  receivedQty: 21,   receivedDate: "2026-07-29", model: "Core i7-12700 / Dell E2225HM", maker: "HPT" },
  { id: "i2",  projectId: "p-thaibinh-tt",   orderNo: "1", name: "Máy tính để bàn Dell Tower",        unit: "Bộ",      planQty: 10,  receivedQty: 10,   receivedDate: "2026-07-29", model: "Dell ECT1250",                 maker: "Dell" },
  { id: "i3",  projectId: "p-thaibinh-tt",   orderNo: "2", name: "Máy quét tài liệu",                 unit: "Chiếc",   planQty: 11,  receivedQty: 11,   receivedDate: "2026-07-29", model: "HP ScanJet Pro 2000 S2",       maker: "HP" },
  { id: "i4",  projectId: "p-quangninh-nd",  orderNo: "1", name: "Microsoft 365 Business Standard",   unit: "License", planQty: 246, receivedQty: null, receivedDate: null,         model: "Microsoft 365",                maker: "Microsoft" },
  { id: "i5",  projectId: "p-sadec-dk",      orderNo: "1", name: "Máy vân tay",                       unit: "Cái",     planQty: 30,  receivedQty: 0,    receivedDate: "2026-08-01", model: "ZK9500",                       maker: "ZKTeco" },
  { id: "i6",  projectId: "p-sadec-dk",      orderNo: "2", name: "Máy in mã vạch",                    unit: "Cái",     planQty: 16,  receivedQty: 6,    receivedDate: "2026-08-01", model: "ZD230TA",                      maker: "Zebra" },
  { id: "i7",  projectId: "p-sadec-dk",      orderNo: "3", name: "Thiết bị thu phát Wi-Fi 6",         unit: "Cái",     planQty: 20,  receivedQty: 12,   receivedDate: "2026-08-01", model: "RG-RAP2260",                   maker: "Ruijie" },
  { id: "i8",  projectId: "p-qlb-mientrung", orderNo: "1", name: "Máy tính xách tay",                 unit: "Cái",     planQty: 15,  receivedQty: 15,   receivedDate: "2026-07-29", model: "ThinkBook 14 G7",              maker: "Lenovo" },
  { id: "i9",  projectId: "p-qlb-mientrung", orderNo: "2", name: "Màn hình chuyên dụng",              unit: "Cái",     planQty: 18,  receivedQty: 8,    receivedDate: "2026-07-29", model: "Dell P2425H",                  maker: "Dell" },
  { id: "i10", projectId: "p-ttd3",          orderNo: "1", name: "Máy tính để bàn",                   unit: "Bộ",      planQty: 25,  receivedQty: 0,    receivedDate: "2026-08-04", model: "Dell 7020 SFF",                maker: "Dell" },
  { id: "i11", projectId: "p-ttd3",          orderNo: "2", name: "Máy in laser đen trắng",            unit: "Cái",     planQty: 8,   receivedQty: 0,    receivedDate: "2026-08-04", model: "HP LaserJet Pro",              maker: "HP" },
  { id: "i12", projectId: "p-dalieu-tw",     orderNo: "1", name: "Máy tính để bàn chuyên dụng",       unit: "Bộ",      planQty: 54,  receivedQty: 54,   receivedDate: "2026-08-03", model: "Dell OptiPlex",                maker: "Dell" },
  { id: "i13", projectId: "p-dalieu-tw",     orderNo: "2", name: "Máy tính xách tay",                 unit: "Chiếc",   planQty: 12,  receivedQty: 3,    receivedDate: "2026-08-03", model: "HP ProBook",                   maker: "HP" },
  { id: "i14", projectId: "p-dhnh-hcm",      orderNo: "1", name: "Bộ lưu điện UPS 20KVA",             unit: "Bộ",      planQty: 1,   receivedQty: 0,    receivedDate: "2026-08-04", model: "CyberPower OLS3S20KE",         maker: "CyberPower" },
  { id: "i15", projectId: "p-dhnh-hcm",      orderNo: "2", name: "Vật tư phụ và nhân công lắp đặt",   unit: "Gói",     planQty: 1,   receivedQty: null, receivedDate: null,         model: "",                             maker: "" },
];
