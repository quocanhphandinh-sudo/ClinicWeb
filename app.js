let db = null; // Biến này không cần thiết nữa khi dùng API

// Thay đổi URL API tại đây
const API_URL = 'https://clinicwebbackend.onrender.com/api'; 
// Sau khi deploy, bạn sẽ thay đổi thành 'https://clinicwebbackend.onrender.com/api'

// Hàm tải dữ liệu bệnh nhân từ API
async function loadPatientsFromApi() {
  try {
    const response = await fetch(`${API_URL}/patients`);
    if (!response.ok) {
      throw new Error('Failed to fetch patients from server');
    }
    const patients = await response.json(); // Lấy dữ liệu dạng JSON

    let html = "";
    patients.forEach(patient => {
      // Dữ liệu trả về từ API có thể khác, bạn cần đảm bảo các trường khớp với tên cột trong DB
      html += `<div class="patient" onclick="toggleVisits(${patient.PatientId}, this)">${patient.FullName} (${patient.Phone})</div>
                <div id="visits-${patient.PatientId}" class="visits"></div>`;
    });
    document.getElementById("patientsList").innerHTML = html;

  } catch (error) {
    console.error("Error fetching data:", error);
    document.getElementById("patientsList").innerHTML = "<p>Lỗi: Không thể tải dữ liệu bệnh nhân.</p>";
  }
}

// Hàm tải danh sách lần khám từ API
async function toggleVisits(patientId, el) {
  const container = document.getElementById("visits-" + patientId);
  if (container.innerHTML.trim() !== "") {
    container.innerHTML = ""; // collapse
    return;
  }

  try {
    const response = await fetch(`${API_URL}/visits/${patientId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch visits from server');
    }
    const visits = await response.json(); // Lấy dữ liệu lần khám

    if (visits.length === 0) {
      container.innerHTML = "<div class='empty'>(Chưa có lần khám)</div>";
      return;
    }

    let html = "<ul>";
    visits.forEach(visit => {
      // Dữ liệu trả về từ API có thể khác, bạn cần đảm bảo các trường khớp
      const date = visit.VisitDate.split(".")[0];
      const diagnosis = visit.Diagnosis || "";
      html += `<li class="visit-item" onclick="showVisitDetail(${visit.VisitId}, this)">
               📅 ${date} – ${diagnosis}
               </li>`;
    });
    html += "</ul>";
    container.innerHTML = html;

  } catch (error) {
    console.error("Error fetching visits:", error);
    container.innerHTML = "<div class='empty'>Lỗi tải dữ liệu lần khám.</div>";
  }
}

// Hàm hiển thị chi tiết lần khám từ API
async function showVisitDetail(visitId, el) {
  document.querySelectorAll(".visit-item").forEach(li => li.classList.remove("active-visit"));
  if (el) el.classList.add("active-visit");

  try {
    const response = await fetch(`${API_URL}/visitdetails/${visitId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch visit details from server');
    }
    const details = await response.json(); // Lấy chi tiết khám bệnh

    if (!details || details.length === 0) {
      document.getElementById("visitDetail").innerHTML = "<p>Không có dữ liệu</p>";
      return;
    }

    const rows = details;
    let html = `<h3>Lần khám ngày ${rows[0].VisitDate}</h3>
                 <p><b>Chẩn đoán:</b> ${rows[0].Diagnosis||""}</p>
                 <p><b>Triệu chứng:</b> ${rows[0].Symptoms||""}</p>
                 <p><b>Ghi chú đơn thuốc:</b> ${rows[0].PrescriptionNotes||""}</p>
                 <p><b>Phí khám:</b> ${rows[0].PriceFee||0}₫ (${rows[0].NameFee||""})</p>
                 <p><b>Tổng tiền thuốc:</b> ${rows[0].MedicationsTotal||0}₫</p>
                 <p><b>Tổng cộng:</b> ${rows[0].TotalAmount||0}₫</p>`;
    
    html += "<h4>Đơn thuốc</h4><table><tr><th>Thuốc</th><th>Hoạt chất</th><th>Dạng</th><th>Liều</th><th>Số lượng</th><th>Giá xuất</th><th>Hướng dẫn</th></tr>";
    rows.forEach(r => {
      html += `<tr>
        <td>${r.Medication||""}</td>
        <td>${r.ActiveIngredient||""}</td>
        <td>${r.Format||""}</td>
        <td>${r.Dosage||""}</td>
        <td>${r.Quantity||""}</td>
        <td>${r.PriceAtDispense||""}</td>
        <td>${r.Instruction||""}</td>
      </tr>`;
    });
    html += "</table>";
    document.getElementById("visitDetail").innerHTML = html;

  } catch (error) {
    console.error("Error fetching visit details:", error);
    document.getElementById("visitDetail").innerHTML = "<p>Lỗi: Không thể tải chi tiết lần khám.</p>";
  }
}



// Tìm kiếm bệnh nhân
document.getElementById("searchBox").addEventListener("input", (e) => {
  // Logic tìm kiếm cần được xử lý trên server, nên bạn cần tạo một API tìm kiếm
  // Ví dụ: GET /api/patients?filter=...
  // Hiện tại, tạm thời bỏ qua phần này
});

// Chú ý: Các hàm CRUD (thêm, sửa, xóa) sẽ cần được viết riêng
// Ví dụ:
// async function addPatient(patientData) {
//   const response = await fetch(`${API_URL}/patients`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(patientData)
//   });
//   // Xử lý kết quả và làm mới danh sách
// }