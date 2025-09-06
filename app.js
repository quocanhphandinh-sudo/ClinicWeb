let db = null;
const statusDiv = () => document.getElementById("status");

// 🔹 Log ra status + console
function logStatus(msg) {
    console.log(msg);
    if (statusDiv()) statusDiv().innerText = msg;
}

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
        throw new Error("❌ Không lấy được danh sách file DB từ GitHub!");
    }

    const files = await response.json();
    const dbFiles = files
        .map(f => f.name)
        .filter(name => /^clinic_\d{8}_\d{6}\.db$/.test(name));

    if (dbFiles.length === 0) {
        throw new Error("❌ Không tìm thấy file .db trong thư mục data/");
    }

    dbFiles.sort((a, b) => b.localeCompare(a));
    const latestFile = dbFiles[0];

    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}/${latestFile}`;
}

// 🔹 Hàm khởi tạo DB
async function initDb() {
    if (db) return db;

    try {
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm`
        });

        const dbUrl = await fetchLatestDbUrl();
        logStatus("📂 Đang load DB: " + dbUrl);

        const response = await fetch(dbUrl);
        if (!response.ok) throw new Error("❌ Không tải được file DB từ GitHub Raw!");

        const buffer = await response.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buffer));

        logStatus("✅ DB đã load thành công!");
        return db;
    } catch (err) {
        logStatus("❌ Lỗi initDb: " + err.message);
        throw err;
    }
}

// 🔹 Test load DB
async function testDb() {
    try {
        const database = await initDb();
        const res = database.exec("SELECT name FROM sqlite_master WHERE type='table'");
        logStatus("📋 Các bảng: " + res[0].values.map(r => r[0]).join(", "));
    } catch (err) {
        logStatus("❌ Test DB lỗi: " + err.message);
    }
}

// 🔹 Load toàn bộ bệnh nhân
async function loadPatients() {
    try {
        const database = await initDb();
        const res = database.exec("SELECT * FROM Patients");
        if (res.length === 0) {
            logStatus("⚠️ Không có dữ liệu trong bảng Patients");
            return;
        }

        const list = document.getElementById("patientList");
        list.innerHTML = "";

        res[0].values.forEach(row => {
            const li = document.createElement("li");
            li.textContent = `${row[1]} - ${row[2]} - ${row[3]}`;
            li.onclick = () => loadVisits(row[0]);
            list.appendChild(li);
        });

        logStatus("✅ Đã load danh sách bệnh nhân");
    } catch (err) {
        logStatus("❌ Lỗi loadPatients: " + err.message);
    }
}

// 🔹 Search bệnh nhân
async function searchPatients(keyword) {
    if (!keyword) {
        logStatus("⚠️ Nhập từ khóa để tìm kiếm!");
        return;
    }

    try {
        const database = await initDb();
        const stmt = database.prepare("SELECT * FROM Patients WHERE Name LIKE ? OR Phone LIKE ?");
        stmt.bind([`%${keyword}%`, `%${keyword}%`]);

        const table = document.getElementById("patientList");
        table.innerHTML = "";

        while (stmt.step()) {
            const row = stmt.getAsObject();
            const li = document.createElement("li");
            li.textContent = `${row.ID} - ${row.Name} - ${row.Phone}`;
            table.appendChild(li);
        }
        stmt.free();

        logStatus("✅ Tìm kiếm xong");
    } catch (err) {
        logStatus("❌ Lỗi searchPatients: " + err.message);
    }
}
