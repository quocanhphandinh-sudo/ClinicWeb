let db = null;
const statusDiv = () => document.getElementById("status");

// log helper
function logStatus(msg) {
  console.log(msg);
  if (statusDiv()) statusDiv().innerText = msg;
}

// --- helpers: table/column discovery ---
function findColumn(cols, candidates) {
  const lower = cols.map(c => c.toLowerCase());
  for (const cand of candidates) {
    const i = lower.indexOf(cand.toLowerCase());
    if (i !== -1) return cols[i]; // trả về tên cột đúng chữ hoa/thường
  }
  return null;
}

function getTableColumns(database, table) {
  const res = database.exec(`PRAGMA table_info(${table})`);
  if (!res.length) return [];
  const nameIdx = res[0].columns.indexOf("name");
  return res[0].values.map(r => r[nameIdx]);
}

function tableExists(database, table) {
  const stmt = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  );
  stmt.bind([table]);
  const ok = stmt.step();
  stmt.free();
  return ok;
}

function firstExistingTable(database, candidates) {
  for (const t of candidates) if (tableExists(database, t)) return t;
  return null;
}

// --- lấy URL file .db mới nhất trong /data ---
async function fetchLatestDbUrl() {
  const owner = "quocanhphandinh-sudo";
  const repo = "ClinicWeb";
  const path = "data";
  const branch = "main";

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!response.ok) throw new Error("❌ Không lấy được danh sách file DB từ GitHub!");

  const files = await response.json();
  const dbFiles = files.map(f => f.name).filter(n => /^clinic_\d{8}_\d{6}\.db$/.test(n));
  if (!dbFiles.length) throw new Error("❌ Không tìm thấy file .db trong thư mục data/");

  dbFiles.sort((a, b) => b.localeCompare(a));
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}/${dbFiles[0]}`;
}

// --- init DB (chỉ load 1 lần) ---
async function initDb() {
  if (db) return db;
  try {
    const SQL = await initSqlJs({
      locateFile: () =>
        "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm",
    });

    const dbUrl = await fetchLatestDbUrl();
    logStatus("📂 Đang load DB: " + dbUrl);

    const res = await fetch(dbUrl);
    if (!res.ok) throw new Error("❌ Không tải được file DB từ GitHub Raw!");
    const buf = await res.arrayBuffer();

    db = new SQL.Database(new Uint8Array(buf));
    logStatus("✅ DB đã load thành công!");
    return db;
  } catch (e) {
    logStatus("❌ Lỗi initDb: " + e.message);
    throw e;
  }
}

// --- Test DB ---
async function testDb() {
  try {
    const database = await initDb();
    const r = database.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tnames = r.length ? r[0].values.map(v => v[0]).join(", ") : "(none)";
    logStatus("📋 Các bảng: " + tnames);
  } catch (e) {
    logStatus("❌ Test DB lỗi: " + e.message);
  }
}

// --- Load toàn bộ bệnh nhân ---
async function loadPatients() {
  try {
    const database = await initDb();
    const patientsTable = firstExistingTable(database, ["Patients", "Patient"]);
    if (!patientsTable) throw new Error("Không tìm thấy bảng Patients!");

    const cols = getTableColumns(database, patientsTable);
    const idCol = findColumn(cols, ["ID", "Id", "PatientID", "PatientId"]);
    const nameCol = findColumn(cols, ["Name", "FullName", "HoTen"]);
    const phoneCol = findColumn(cols, ["Phone", "PhoneNumber", "SDT", "Sdt", "Mobile"]);

    if (!idCol || !nameCol || !phoneCol)
      throw new Error(`Thiếu cột ở ${patientsTable}. Có: ${cols.join(", ")}`);

    const sql = `SELECT ${idCol} AS ID, ${nameCol} AS Name, ${phoneCol} AS Phone
                 FROM ${patientsTable}
                 ORDER BY ${nameCol} COLLATE NOCASE`;

    const stmt = database.prepare(sql);

    const list = document.getElementById("patientList");
    const visits = document.getElementById("visitsList");
    const meds = document.getElementById("medicinesList");
    list.innerHTML = "";
    visits.innerHTML = "";
    meds.innerHTML = "";

    while (stmt.step()) {
      const row = stmt.getAsObject();
      const li = document.createElement("li");
      li.textContent = `${row.Name} - ${row.Phone}`;
      li.onclick = () => loadVisits(row.ID);
      list.appendChild(li);
    }
    stmt.free();

    logStatus("✅ Đã load danh sách bệnh nhân");
  } catch (e) {
    logStatus("❌ Lỗi loadPatients: " + e.message);
  }
}

// --- Search bệnh nhân theo tên/SĐT ---
async function searchPatients(keyword) {
  const kw = (keyword || "").trim();
  if (!kw) {
    logStatus("⚠️ Nhập từ khóa để tìm kiếm!");
    return;
  }

  try {
    const database = await initDb();
    const patientsTable = firstExistingTable(database, ["Patients", "Patient"]);
    if (!patientsTable) throw new Error("Không tìm thấy bảng Patients!");

    const cols = getTableColumns(database, patientsTable);
    const idCol = findColumn(cols, ["ID", "Id", "PatientID", "PatientId"]);
    const nameCol = findColumn(cols, ["Name", "FullName", "HoTen"]);
    const phoneCol = findColumn(cols, ["Phone", "PhoneNumber", "SDT", "Sdt", "Mobile"]);

    if (!idCol || !nameCol || !phoneCol)
      throw new Error(`Thiếu cột ở ${patientsTable}. Có: ${cols.join(", ")}`);

    const sql = `SELECT ${idCol} AS ID, ${nameCol} AS Name, ${phoneCol} AS Phone
                 FROM ${patientsTable}
                 WHERE ${nameCol} LIKE ? OR ${phoneCol} LIKE ?
                 ORDER BY ${nameCol} COLLATE NOCASE`;

    const stmt = database.prepare(sql);
    stmt.bind([`%${kw}%`, `%${kw}%`]);

    const list = document.getElementById("patientList");
    const visits = document.getElementById("visitsList");
    const meds = document.getElementById("medicinesList");
    list.innerHTML = "";
    visits.innerHTML = "";
    meds.innerHTML = "";

    let found = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const li = document.createElement("li");
      li.textContent = `${row.Name} - ${row.Phone}`;
      li.onclick = () => loadVisits(row.ID);
      list.appendChild(li);
      found++;
    }
    stmt.free();

    logStatus(found ? `✅ Tìm thấy ${found} kết quả` : "⚠️ Không tìm thấy bệnh nhân nào");
  } catch (e) {
    logStatus("❌ Lỗi searchPatients: " + e.message);
  }
}

// --- Load lịch sử khám của bệnh nhân ---
async function loadVisits(patientId) {
  try {
    const database = await initDb();

    const visitsTable = firstExistingTable(database, ["Visits", "Visit"]);
    if (!visitsTable) throw new Error("Không tìm thấy bảng Visits!");

    const cols = getTableColumns(database, visitsTable);
    const visitIdCol = findColumn(cols, ["VisitID", "Id", "ID"]);
    const dateCol = findColumn(cols, ["Date", "VisitDate", "CreatedAt", "Ngay"]);
    const patientIdCol = findColumn(cols, ["PatientID", "PatientId", "Patient_ID"]);

    if (!visitIdCol || !dateCol || !patientIdCol)
      throw new Error(`Thiếu cột ở ${visitsTable}. Có: ${cols.join(", ")}`);

    const sql = `SELECT ${visitIdCol} AS VisitID, ${dateCol} AS Date
                 FROM ${visitsTable}
                 WHERE ${patientIdCol} = ?
                 ORDER BY ${dateCol} DESC`;

    const stmt = database.prepare(sql);
    stmt.bind([patientId]);

    const list = document.getElementById("visitsList");
    const meds = document.getElementById("medicinesList");
    list.innerHTML = "";
    meds.innerHTML = "";

    let have = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const dateOnly = String(row.Date).split(/[ T]/)[0]; // cắt phần giây
      const li = document.createElement("li");
      li.textContent = `Lần khám #${row.VisitID} - ${dateOnly}`;
      li.onclick = () => loadMedicines(row.VisitID);
      list.appendChild(li);
      have++;
    }
    stmt.free();

    logStatus(have ? "✅ Đã load lịch sử khám" : "⚠️ Không có lịch sử khám");
  } catch (e) {
    logStatus("❌ Lỗi loadVisits: " + e.message);
  }
}

// --- Load thuốc theo lần khám ---
async function loadMedicines(visitId) {
  try {
    const database = await initDb();

    // tìm tên bảng kê thuốc
    const presTable = firstExistingTable(database, [
      "Prescriptions",
      "PrescriptionItems",
      "VisitMedications",
      "Medications",
    ]);
    if (!presTable) throw new Error("Không tìm thấy bảng đơn thuốc/thuốc!");

    const cols = getTableColumns(database, presTable);
    const visitIdCol = findColumn(cols, ["VisitID", "VisitId", "Visit_ID"]);
    const medCol = findColumn(cols, ["Medicine", "DrugName", "Medication", "MedicineName", "Name", "TenThuoc"]);
    const priceCol = findColumn(cols, ["Price", "Cost", "Gia", "Amount", "ThanhTien", "Total", "Money"]);

    if (!visitIdCol)
      throw new Error(`Thiếu cột liên kết VisitID ở ${presTable}. Có: ${cols.join(", ")}`);

    const list = document.getElementById("medicinesList");
    list.innerHTML = "";

    let sql, stmt;

    if (medCol && priceCol) {
      sql = `SELECT ${medCol} AS Medicine, ${priceCol} AS Price
             FROM ${presTable}
             WHERE ${visitIdCol} = ?`;
      stmt = database.prepare(sql);
      stmt.bind([visitId]);

      let have = 0;
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const li = document.createElement("li");
        li.textContent = `${row.Medicine} - ${row.Price}₫`;
        list.appendChild(li);
        have++;
      }
      stmt.free();

      logStatus(have ? "✅ Đã load thuốc" : "⚠️ Không có thuốc cho lần khám này");
    } else {
      // fallback: show toàn bộ dòng (nếu không đoán được cột)
      sql = `SELECT * FROM ${presTable} WHERE ${visitIdCol} = ?`;
      stmt = database.prepare(sql);
      stmt.bind([visitId]);
      let have = 0;
      while (stmt.step()) {
        const obj = stmt.getAsObject();
        const li = document.createElement("li");
        li.textContent = JSON.stringify(obj);
        list.appendChild(li);
        have++;
      }
      stmt.free();
      logStatus(have ? "ℹ️ Không xác định cột thuốc/giá, hiển thị thô." : "⚠️ Không có dữ liệu thuốc.");
    }
  } catch (e) {
    logStatus("❌ Lỗi loadMedicines: " + e.message);
  }
}
