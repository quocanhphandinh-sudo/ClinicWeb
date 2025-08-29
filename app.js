let db = null;

// Hàm tải file SQLite từ Google Drive
async function loadDbFromDrive() {
  const url = "hhttps://github.com/quocanhphandinh-sudo/ClinicWeb/blob/main/clinic_backup_20250829_083142.db";
  
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${f}` });
  db = new SQL.Database(new Uint8Array(buffer));
  renderPatients();
}

// Hàm tải file SQLite từ file input
document.getElementById("dbfile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${f}` });
    db = new SQL.Database(data);
    renderPatients();
  }
});

// Gắn sự kiện nút tải từ Google Drive
document.getElementById("loadFromDrive").addEventListener("click", loadDbFromDrive);

// Render danh sách bệnh nhân
function renderPatients(filter = "") {
  if (!db) return;
  const query = `
    SELECT PatientId, FullName, Phone
    FROM Patients
    WHERE FullName LIKE '%${filter}%' OR Phone LIKE '%${filter}%'
    ORDER BY FullName;
  `;
  let res = db.exec(query);
  if (res.length === 0) {
    document.getElementById("patientsList").innerHTML = "<p>Không có bệnh nhân</p>";
    return;
  }
  let html = "";
  res[0].values.forEach(row => {
    const pid = row[0];
    const name = row[1];
    const phone = row[2] || "";
    html += `<div class="patient" onclick="toggleVisits(${pid}, this)">${name} (${phone})</div>
             <div id="visits-${pid}" class="visits"></div>`;
  });
  document.getElementById("patientsList").innerHTML = html;
}

function toggleVisits(patientId, el) {
  const container = document.getElementById("visits-" + patientId);
  if (container.innerHTML.trim() !== "") {
    container.innerHTML = ""; // collapse
    return;
  }

  const query = `
    SELECT v.VisitId, v.VisitDate, v.Diagnosis
    FROM Visits v
    WHERE v.PatientId=${patientId}
    ORDER BY v.VisitDate DESC;
  `;
  let res = db.exec(query);

  if (res.length === 0 || res[0].values.length === 0) {
    container.innerHTML = "<div class='empty'>(Chưa có lần khám)</div>";
    return;
  }

  let html = "<ul>";
  res[0].values.forEach(row => {
    const vid = row[0];
    const date = row[1].split(".")[0];
    const diagnosis = row[2] || "";
    html += `<li class="visit-item" onclick="showVisitDetail(${vid}, this)">
             📅 ${date} – ${diagnosis}
             </li>`;
  });
  html += "</ul>";
  container.innerHTML = html;
}

// Hiển thị chi tiết lần khám
function showVisitDetail(visitId, el) {
  document.querySelectorAll(".visit-item").forEach(li => li.classList.remove("active-visit"));
  if (el) el.classList.add("active-visit");

  const query = `
    SELECT v.VisitDate, v.Diagnosis, v.Symptoms, v.PrescriptionNotes,
           v.MedicationsTotal, v.TotalAmount,
           ef.NameFee, ef.PriceFee,
           m.Name as Medication, m.ActiveIngredient, m.Format,
           vm.Dosage, vm.Quantity, vm.PriceAtDispense,
           u.Instruction
    FROM Visits v
    LEFT JOIN ExaminationFees ef ON v.ExaminationFeeId = ef.ExaminationFeeId
    LEFT JOIN VisitMedications vm ON v.VisitId = vm.VisitId
    LEFT JOIN Medications m ON vm.MedicationId = m.MedicationId
    LEFT JOIN UsageInstructions u ON vm.UsageInstructionId = u.UsageInstructionId
    WHERE v.VisitId=${visitId};
  `;
  let res = db.exec(query);
  if (res.length === 0) {
    document.getElementById("visitDetail").innerHTML = "<p>Không có dữ liệu</p>";
    return;
  }
  let rows = res[0].values;
  let html = `<h3>Lần khám ngày ${rows[0][0]}</h3>
              <p><b>Chẩn đoán:</b> ${rows[0][1]||""}</p>
              <p><b>Triệu chứng:</b> ${rows[0][2]||""}</p>
              <p><b>Ghi chú đơn thuốc:</b> ${rows[0][3]||""}</p>
              <p><b>Phí khám:</b> ${rows[0][7]||0}₫ (${rows[0][6]||""})</p>
              <p><b>Tổng tiền thuốc:</b> ${rows[0][4]||0}₫</p>
              <p><b>Tổng cộng:</b> ${rows[0][5]||0}₫</p>`;
  html += "<h4>Đơn thuốc</h4><table><tr><th>Thuốc</th><th>Hoạt chất</th><th>Dạng</th><th>Liều</th><th>Số lượng</th><th>Giá xuất</th><th>Hướng dẫn</th></tr>";
  rows.forEach(r => {
    html += `<tr>
      <td>${r[8]||""}</td>
      <td>${r[9]||""}</td>
      <td>${r[10]||""}</td>
      <td>${r[11]||""}</td>
      <td>${r[12]||""}</td>
      <td>${r[13]||""}</td>
      <td>${r[14]||""}</td>
    </tr>`;
  });
  html += "</table>";
  document.getElementById("visitDetail").innerHTML = html;
}

// Tìm kiếm bệnh nhân
document.getElementById("searchBox").addEventListener("input", (e) => {
  renderPatients(e.target.value);
});
