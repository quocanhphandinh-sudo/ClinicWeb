// Import SDK từ Firebase (cấu hình trong index.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// =======================
// 🔧 Firebase cấu hình
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyBslD1AIPcbrqo1e3jXApPonHLCpG0WxIc",
  authDomain: "clinicweb-7cab1.firebaseapp.com",
  projectId: "clinicweb-7cab1",
  storageBucket: "clinicweb-7cab1.firebasestorage.app",
  messagingSenderId: "613257243646",
  appId: "1:613257243646:web:7562ca43c007037cd4eeaf",
  measurementId: "G-H7XX7T7DV4"
};

// Khởi tạo Firebase + Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =======================
// 1. Thêm bệnh nhân
// =======================
document.getElementById("addPatientForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const age = document.getElementById("age").value;

    try {
        await addDoc(collection(db, "patients"), {
            name,
            phone,
            age
        });
        alert("✅ Thêm bệnh nhân thành công!");
        loadPatients(); // refresh danh sách
        e.target.reset();
    } catch (error) {
        console.error("❌ Lỗi khi thêm bệnh nhân:", error);
    }
});

// =======================
// 2. Load toàn bộ bệnh nhân
// =======================
async function loadPatients() {
    const listDiv = document.getElementById("patientsList");
    listDiv.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "patients"));
    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const div = document.createElement("div");
        div.innerHTML = `
            <b>${data.name}</b> - ${data.phone} - ${data.age} tuổi
            <button onclick="deletePatient('${docSnap.id}')">Xóa</button>
        `;
        listDiv.appendChild(div);
    });
}
window.loadPatients = loadPatients; // cho gọi ngoài HTML

// =======================
// 3. Tìm kiếm bệnh nhân
// =======================
async function searchPatients() {
    const keyword = document.getElementById("searchInput").value.trim();
    const listDiv = document.getElementById("patientsList");
    listDiv.innerHTML = "";

    if (keyword === "") {
        alert("⚠️ Nhập tên hoặc số điện thoại để tìm!");
        return;
    }

    // Tìm theo số điện thoại trước
    let q = query(collection(db, "patients"), where("phone", "==", keyword));
    let querySnapshot = await getDocs(q);

    // Nếu không tìm thấy thì tìm theo tên
    if (querySnapshot.empty) {
        q = query(collection(db, "patients"), where("name", "==", keyword));
        querySnapshot = await getDocs(q);
    }

    if (querySnapshot.empty) {
        listDiv.innerHTML = "❌ Không tìm thấy bệnh nhân!";
    } else {
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement("div");
            div.innerHTML = `
                <b>${data.name}</b> - ${data.phone} - ${data.age} tuổi
                <button onclick="deletePatient('${docSnap.id}')">Xóa</button>
            `;
            listDiv.appendChild(div);
        });
    }
}
window.searchPatients = searchPatients; // cho gọi ngoài HTML

// =======================
// 4. Xóa bệnh nhân
// =======================
async function deletePatient(id) {
    if (confirm("Bạn có chắc chắn muốn xóa bệnh nhân này?")) {
        try {
            await deleteDoc(doc(db, "patients", id));
            alert("🗑️ Đã xóa!");
            loadPatients();
        } catch (error) {
            console.error("❌ Lỗi khi xóa:", error);
        }
    }
}
window.deletePatient = deletePatient;
