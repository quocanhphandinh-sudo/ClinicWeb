

const API_URL = "https://script.google.com/macros/s/AKfycbxjXwr-6l2bARPa2o4Ovw2f77nh0axn0M7PP_xnkPjBbr5155-uTVDXerPzSwx_sO7r/exec"; // thay bằng link WebApp của bạn

// Load tất cả bệnh nhân
async function loadPatients() {
  const res = await fetch(API_URL);
  const patients = await res.json();
  renderPatients(patients);
}

// Thêm bệnh nhân
document.getElementById("patientForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const patient = {
    PatientId: Date.now().toString(),
    FullName: document.getElementById("fullname").value,
    DateOfBirth: document.getElementById("dob").value,
    Gender: document.getElementById("gender").value,
    Allergies: document.getElementById("allergies").value,
    Address: document.getElementById("address").value,
    Phone: document.getElementById("phone").value,
    Action: "add"
  };

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(patient),
  });

  e.target.reset();
  loadPatients();
});

// Xóa bệnh nhân
async function deletePatient(id) {
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ PatientId: id, Action: "delete" }),
  });
  loadPatients();
}

// Tìm kiếm bệnh nhân
async function searchPatients() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const res = await fetch(API_URL);
  const patients = await res.json();

  const filtered = patients.filter(
    p =>
      p.FullName.toLowerCase().includes(keyword) ||
      p.Phone.includes(keyword)
  );

  renderPatients(filtered);
}

// Hiển thị danh sách
function renderPatients(patients) {
  const list = document.getElementById("patientList");
  list.innerHTML = "";

  patients.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.FullName} - ${p.Phone} (${p.DateOfBirth})`;
    const delBtn = document.createElement("button");
    delBtn.textContent = "❌";
    delBtn.onclick = () => deletePatient(p.PatientId);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// Gọi khi load trang
loadPatients();
