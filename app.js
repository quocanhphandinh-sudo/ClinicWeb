// Dán đoạn mã cấu hình từ Firebase Console vào đây
const firebaseConfig = {
apiKey: "AIzaSyDwwaodTBTwgQbvkP1X1CQyvu2xNXLanvk",
  authDomain: "clinicappweb-d7c1c.firebaseapp.com",
  databaseURL: "https://clinicappweb-d7c1c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clinicappweb-d7c1c",
  storageBucket: "clinicappweb-d7c1c.firebasestorage.app",
  messagingSenderId: "578720705506",
  appId: "1:578720705506:web:b171f012fa80fa126b67bb",
  measurementId: "G-YHLCPVK6X6"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// them vao dau

// Hàm tải dữ liệu bệnh nhân từ API
async function loadPatientsFromApi() {
  try {
    const snapshot = await database.ref("patients").once("value");
    const patientsObj = snapshot.val() || {};
    const patients = Object.entries(patientsObj).map(([id, p]) => ({ id, ...p }));
    renderPatients(patients);
  } catch (error) {
    console.error("Error loading patients:", error);
  }
}
function renderPatients(patients) {
  const listDiv = document.getElementById("patientsList");
  listDiv.innerHTML = "";
  if (patients.length === 0) {
    listDiv.innerHTML = "<p>Không có bệnh nhân nào.</p>";
    return;
  }
  patients.forEach(p => {
    const div = document.createElement("div");
    div.className = "patient-item";
    div.innerHTML = `
      <span><b>${p.FullName}</b> (${p.Phone}) - ${p.DateOfBirth} - ${p.Gender}</span>
      <button class="delete-btn" onclick="deletePatient('${p.id}')">Xóa</button>
    `;
    listDiv.appendChild(div);
  });
}
async function addPatient(patientData) {
  try {
    const newRef = database.ref("patients").push();
    await newRef.set(patientData);
    alert("Thêm thành công!");
    loadPatientsFromApi();
  } catch (error) {
    console.error("Error adding patient:", error);
  }
}
async function deletePatient(patientId) {
  if (!confirm("Bạn có chắc muốn xóa?")) return;
  try {
    await database.ref("patients/" + patientId).remove();
    alert("Xóa thành công!");
    loadPatientsFromApi();
  } catch (error) {
    console.error("Error deleting patient:", error);
  }
}
async function searchPatients() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const snapshot = await database.ref("patients").once("value");
  const patientsObj = snapshot.val() || {};
  const patients = Object.entries(patientsObj).map(([id, p]) => ({ id, ...p }));
  const filtered = patients.filter(p =>
    p.FullName.toLowerCase().includes(keyword) ||
    p.Phone.includes(keyword)
  );
  renderPatients(filtered);
}

// Hàm tải danh sách lần khám từ API
async function toggleVisits(patientId, el) {
  const container = document.getElementById("visits-" + patientId);
  if (container.innerHTML.trim() !== "") {
    container.innerHTML = "";
    return;
  }

  const snapshot = await database.ref("visits/" + patientId).once("value");
  const visitsObj = snapshot.val() || {};
  const visits = Object.entries(visitsObj).map(([id, v]) => ({ id, ...v }));

  if (visits.length === 0) {
    container.innerHTML = "<div class='empty'>(Chưa có lần khám)</div>";
    return;
  }

  let html = "<ul>";
  visits.forEach(visit => {
    html += `<li class="visit-item" onclick="showVisitDetail('${visit.id}', this)">
      📅 ${visit.VisitDate} – ${visit.Diagnosis||""}
    </li>`;
  });
  html += "</ul>";
  container.innerHTML = html;
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
