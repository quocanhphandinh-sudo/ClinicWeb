// Load SQL.js
async function initSqlJs() {
    const SQL = await initSqlJsLib({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm`
    });

    // 🔥 Lấy file .db mới nhất trong thư mục data/
    const dbUrl = "https://raw.githubusercontent.com/quocanhphandinh-sudo/ClinicWeb/main/data/clinic.db";

    const response = await fetch(dbUrl);
    const buffer = await response.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    return db;
}

// Load tất cả bệnh nhân
async function loadPatients() {
    const db = await initSqlJs();
    const res = db.exec("SELECT * FROM Patients");
    if (res.length === 0) return;

    const rows = res[0].values;
    const list = document.getElementById("patientList");
    list.innerHTML = "";

    rows.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${p[1]}</b> - ${p[2]} - ${p[3]}`;
        li.onclick = () => loadVisits(p[0], li);
        list.appendChild(li);
    });
}

// Tìm kiếm bệnh nhân theo tên/điện thoại
async function searchPatients() {
    const search = document.getElementById("searchInput").value;
    const db = await initSqlJs();

    const stmt = db.prepare("SELECT * FROM Patients WHERE Name LIKE ? OR Phone LIKE ?");
    stmt.bind([`%${search}%`, `%${search}%`]);

    const list = document.getElementById("patientList");
    list.innerHTML = "";

    while (stmt.step()) {
        const row = stmt.get();
        const li = document.createElement("li");
        li.innerHTML = `<b>${row[1]}</b> - ${row[2]} - ${row[3]}`;
        li.onclick = () => loadVisits(row[0], li);
        list.appendChild(li);
    }
}

// Hiển thị lịch sử khám (theo cây)
async function loadVisits(patientId, parentLi) {
    const db = await initSqlJs();
    const stmt = db.prepare("SELECT VisitID, Date FROM Visits WHERE PatientID = ?");
    stmt.bind([patientId]);

    const ul = document.createElement("ul");

    while (stmt.step()) {
        const row = stmt.get();
        const visitLi = document.createElement("li");
        const dateOnly = row[1].split(" ")[0]; // chỉ lấy ngày
        visitLi.innerHTML = `Khám: ${dateOnly}`;
        visitLi.onclick = () => loadMedicines(row[0], visitLi);
        ul.appendChild(visitLi);
    }

    parentLi.appendChild(ul);
}

// Hiển thị thuốc + tiền theo lần khám
async function loadMedicines(visitId, parentLi) {
    const db = await initSqlJs();
    const stmt = db.prepare("SELECT Medicine, Price FROM Prescriptions WHERE VisitID = ?");
    stmt.bind([visitId]);

    const ul = document.createElement("ul");

    while (stmt.step()) {
        const row = stmt.get();
        const medLi = document.createElement("li");
        medLi.innerHTML = `${row[0]} - ${row[1]} VNĐ`;
        ul.appendChild(medLi);
    }

    parentLi.appendChild(ul);
}
