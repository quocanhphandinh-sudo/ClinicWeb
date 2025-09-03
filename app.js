let db = null;

// 🔹 Hàm load file .db mới nhất từ GitHub
async function fetchLatestDbUrl() {
    const owner = "quocanhphandinh-sudo";
    const repo = "ClinicWeb";
    const path = "data";
    const branch = "main";

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await fetch(url, {
        headers: { "Accept": "application/vnd.github.v3+json" }
    });

    if (!response.ok) {
        throw new Error("Không lấy được danh sách file DB từ GitHub!");
    }

    const files = await response.json();

    // Lọc file có dạng clinic_YYYYMMDD_HHmmss.db
    const dbFiles = files
        .map(f => f.name)
        .filter(name => /^clinic_\d{8}_\d{6}\.db$/.test(name));

    if (dbFiles.length === 0) {
        throw new Error("Không tìm thấy file .db trong thư mục data/");
    }

    // Sắp xếp giảm dần → lấy file mới nhất
    dbFiles.sort((a, b) => b.localeCompare(a));
    const latestFile = dbFiles[0];

    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}/${latestFile}`;
}

// 🔹 Hàm khởi tạo DB (chỉ load 1 lần)
async function initDb() {
    if (db) return db;

    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm`
    });

    const dbUrl = await fetchLatestDbUrl();
    console.log("📂 Đang load DB:", dbUrl);

    const response = await fetch(dbUrl);
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    return db;
}

// 🔹 Load toàn bộ bệnh nhân
async function loadPatients() {
    const database = await initDb();
    const res = database.exec("SELECT * FROM Patients");
    if (res.length === 0) return;

    const table = document.getElementById("patientsTable");
    table.innerHTML = "";

    res[0].values.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

// 🔹 Search bệnh nhân theo tên hoặc SĐT
async function searchPatients(keyword) {
    const database = await initDb();
    const stmt = database.prepare("SELECT * FROM Patients WHERE Name LIKE ? OR Phone LIKE ?");
    stmt.bind([`%${keyword}%`, `%${keyword}%`]);

    const table = document.getElementById("patientsTable");
    table.innerHTML = "";

    while (stmt.step()) {
        const row = stmt.getAsObject();
        const tr = document.createElement("tr");
        Object.values(row).forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    }
    stmt.free();
}

// 🔹 Load lịch sử khám của bệnh nhân
async function loadVisits(patientId) {
    const database = await initDb();
    const stmt = database.prepare("SELECT VisitID, Date FROM Visits WHERE PatientID = ?");
    stmt.bind([patientId]);

    const list = document.getElementById("visitsList");
    list.innerHTML = "";

    while (stmt.step()) {
        const row = stmt.getAsObject();
        const li = document.createElement("li");
        li.textContent = `Lần khám #${row.VisitID} - ${row.Date}`;
        list.appendChild(li);
    }
    stmt.free();
}

// 🔹 Load thuốc đã kê theo Visit
async function loadMedicines(visitId) {
    const database = await initDb();
    const stmt = database.prepare("SELECT Medicine, Price FROM Prescriptions WHERE VisitID = ?");
    stmt.bind([visitId]);

    const list = document.getElementById("medicinesList");
    list.innerHTML = "";

    while (stmt.step()) {
        const row = stmt.getAsObject();
        const li = document.createElement("li");
        li.textContent = `${row.Medicine} - ${row.Price}₫`;
        list.appendChild(li);
    }
    stmt.free();
}
