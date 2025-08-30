// 🔹 Cấu hình Firebase (dùng đúng config của bạn)
const firebaseConfig = {
  apiKey: "AIzaSy.....",
  authDomain: "clinicweb-xxxx.firebaseapp.com",
  databaseURL: "https://clinicweb-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clinicweb-xxxx",
  storageBucket: "clinicweb-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxx"
};

// 🔹 Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Thêm bệnh nhân
document.getElementById("addPatientForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const age = document.getElementById("age").value;

  const newPatientRef = db.ref("patients").push();
  await newPatientRef.set({ id: newPatientRef.key, name, phone, age });

  alert("Đã thêm bệnh nhân");
  document.getElementById("addPatientForm").reset();
  loadPatients();
});

// Hiển thị danh sách bệnh nhân
async function loadPatients() {
  const snapshot = await db.ref("patients").once("value");
  const patients = snapshot.val() || {};
  const listDiv = document.getElementById("patientsList");
  listDiv.innerHTML = "";

  Object.values(patients).forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `
      <b>${p.name}</b> - ${p.phone} - Tuổi: ${p.age || "-"}
      <button onclick="deletePatient('${p.id}')">Xóa</button>
      <button onclick="showVisitDetail('${p.id}')">Lịch sử khám</button>
    `;
    listDiv.appendChild(div);
  });
}

// Xóa bệnh nhân
async function deletePatient(id) {
  if (confirm("Bạn có chắc muốn xóa bệnh nhân này?")) {
    await db.ref("patients/" + id).remove();
    loadPatients();
  }
}

// Tìm kiếm bệnh nhân
async function searchPatients() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const snapshot = await db.ref("patients").once("value");
  const patients = snapshot.val() || {};
  const listDiv = document.getElementById("patientsList");
  listDiv.innerHTML = "";

  Object.values(patients)
    .filter(p => p.name.toLowerCase().includes(keyword) || p.phone.includes(keyword))
    .forEach(p => {
      const div = document.createElement("div");
      div.innerHTML = `
        <b>${p.name}</b> - ${p.phone} - Tuổi: ${p.age || "-"}
        <button onclick="deletePatient('${p.id}')">Xóa</button>
        <button onclick="showVisitDetail('${p.id}')">Lịch sử khám</button>
      `;
      listDiv.appendChild(div);
    });
}

// Lịch sử khám bệnh (visit)
async function showVisitDetail(patientId) {
  const snapshot = await db.ref("visits/" + patientId).once("value");
  const visits = snapshot.val() || {};

  let detail = `Lịch sử khám bệnh của bệnh nhân:\n`;
  Object.values(visits).forEach(v => {
    detail += `- Ngày: ${v.date}, Chẩn đoán: ${v.diagnosis}, Thuốc: ${v.medicine}\n`;
  });

  alert(detail);
}

// Tải dữ liệu khi load trang
window.onload = loadPatients;
