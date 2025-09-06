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

// 🔹 Load toàn bộ bệnh nhân
async function loadPatients() {
    try {
        const database = await initDb();
        const res = database.exec("SELECT PatientId, FullName, Phone FROM Patients ORDER BY FullName");

        const list = document.getElementById("patientList");
        list.innerHTML = "";

        if (res.length > 0) {
            res[0].values.forEach(row => {
                const li = document.createElement("li");
                li.textContent = `${row[1]} - ${row[2]}`;
                li.onclick = () => loadVisits(row[0]); // row[0] = PatientId
                list.appendChild(li);
            });
        }

        logStatus("✅ Đã load danh sách bệnh nhân");
    } catch (err) {
        logStatus("❌ Lỗi loadPatients: " + err.message);
    }
}

// 🔹 Search bệnh nhân theo tên hoặc SĐT
async function searchPatients(keyword) {
    if (!keyword) {
        logStatus("⚠️ Nhập từ khóa để tìm kiếm!");
        return;
    }

    try {
        const database = await initDb();
        const stmt = database.prepare("SELECT PatientId, FullName, Phone FROM Patients WHERE FullName LIKE ? OR Phone LIKE ?");
        stmt.bind([`%${keyword}%`, `%${keyword}%`]);

        const list = document.getElementById("patientList");
        list.innerHTML = "";

        while (stmt.step()) {
            const row = stmt.getAsObject();
            const li = document.createElement("li");
            li.textContent = `${row.FullName} - ${row.Phone}`;
            li.onclick = () => loadVisits(row.PatientId);
            list.appendChild(li);
        }
        stmt.free();

        logStatus("✅ Tìm kiếm xong");
    } catch (err) {
        logStatus("❌ Lỗi searchPatients: " + err.message);
    }
}

// 🔹 Load lịch sử khám của bệnh nhân
async function loadVisits(patientId) {
    try {
        const database = await initDb();
        const stmt = database.prepare("SELECT VisitId, VisitDate, Diagnosis FROM Visits WHERE PatientId = ? ORDER BY VisitDate DESC");
        stmt.bind([patientId]);

        const list = document.getElementById("visitsList");
        const meds = document.getElementById("medicinesList");
        list.innerHTML = "";
        meds.innerHTML = "";

        while (stmt.step()) {
            const row = stmt.getAsObject();
            const li = document.createElement("li");
            li.textContent = `Lần khám #${row.VisitId} - ${row.VisitDate} - ${row.Diagnosis}`;
            li.onclick = () => loadMedicines(row.VisitId);
            list.appendChild(li);
        }
        stmt.free();

        logStatus("✅ Đã load lịch sử khám");
    } catch (err) {
        logStatus("❌ Lỗi loadVisits: " + err.message);
    }
}

// 🔹 Load thuốc theo Visit
async function loadMedicines(visitId) {
    try {
        const database = await initDb();

        const sql = `
            SELECT m.Name AS MedName,
                   vm.Dosage,
                   vm.Quantity,
                   vm.PriceAtDispense,
                   u.Instruction
            FROM VisitMedications vm
            JOIN Medications m ON vm.MedicationId = m.MedicationId
            LEFT JOIN UsageInstructions u ON vm.UsageInstructionId = u.UsageInstructionId
            WHERE vm.VisitId = ?
        `;

        const stmt = database.prepare(sql);
        stmt.bind([visitId]);

        const list = document.getElementById("medicinesList");
        list.innerHTML = "";

        let found = false;
        while (stmt.step()) {
            found = true;
            const row = stmt.getAsObject();
            const li = document.createElement("li");
            li.textContent = `${row.MedName} - SL: ${row.Quantity} - Liều: ${row.Dosage} - Giá: ${row.PriceAtDispense || 0}₫ - Cách dùng: ${row.Instruction || ""}`;
            list.appendChild(li);
        }
        stmt.free();

        if (!found) {
            logStatus("⚠️ Không có thuốc nào trong lần khám này");
        } else {
            logStatus("✅ Đã load thuốc cho lần khám");
        }
    } catch (err) {
        logStatus("❌ Lỗi loadMedicines: " + err.message);
    }
}
