// ---------------------------------------------
// FIREBASE IMPORTS & SETUP
// ---------------------------------------------
import {
  collectionGroup,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "./firebase-config.js";


// ✅ GLOBAL CACHE
window.allLogs = [];


// ===================================================================
// ✅✅ PART 0 — DASHBOARD STATS
// ===================================================================
window.loadDashboardStats = async function () {
  const totalMessagesEl = document.getElementById("totalMessages");
  const totalUsersEl = document.getElementById("totalUsers");
  const languagesUsedEl = document.getElementById("languagesUsed");
  const weeklyMessagesEl = document.getElementById("weeklyMessages");

  if (!totalMessagesEl) return;

  totalMessagesEl.textContent = "...";
  totalUsersEl.textContent = "...";
  languagesUsedEl.textContent = "...";
  weeklyMessagesEl.textContent = "...";

  try {
    const q = query(collectionGroup(db, "chats"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    let totalMessages = 0;
    let userSet = new Set();
    let langSet = new Set();
    let weeklyCount = 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      totalMessages++;

      const userId = docSnap.ref.path.split("/")[1];
      userSet.add(userId);

      if (data.language) langSet.add(data.language);

      let ts = data.timestamp;
      let dateObj =
        typeof ts?.toDate === "function"
          ? new Date(ts.toDate())
          : new Date(ts);

      if (dateObj && dateObj >= weekAgo) weeklyCount++;
    });

    totalMessagesEl.textContent = totalMessages;
    totalUsersEl.textContent = userSet.size;
    languagesUsedEl.textContent = langSet.size;
    weeklyMessagesEl.textContent = weeklyCount;

  } catch (error) {
    console.error("Dashboard error:", error);
  }
};



// ===================================================================
// ✅✅ PART 1 — CHAT LOGS
// ===================================================================
window.loadChatLogs = async function () {
  const tableBody = document.getElementById("chatTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Fetching...</td></tr>`;

  try {
    const q = query(collectionGroup(db, "chats"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No logs found.</td></tr>`;
      return;
    }

    window.allLogs = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();

      let timestamp = "-";
      if (data.timestamp) {
        timestamp =
          typeof data.timestamp.toDate === "function"
            ? new Date(data.timestamp.toDate()).toLocaleString()
            : data.timestamp;
      }

      window.allLogs.push({
        ref: docSnap.ref,
        user_message: data.user_message || "-",
        bot_reply: data.bot_reply || "-",
        language: data.language || "-",
        timestamp
      });
    });

    window.renderLogs(window.allLogs);

  } catch (e) {
    console.error("Error:", e);
  }
};


// ✅ RENDER LOGS
window.renderLogs = function (logs) {
  const tableBody = document.getElementById("chatTableBody");
  tableBody.innerHTML = "";

  logs.forEach((log, i) => {
    tableBody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${log.user_message}</td>
        <td>${log.bot_reply}</td>
        <td>${log.language}</td>
        <td>${log.timestamp}</td>
        <td>
          <span class="delete-btn" onclick="deleteLog('${log.ref.path}')">🗑</span>
        </td>
      </tr>
    `;
  });
};


// ✅ SEARCH + FILTER
window.filterLogs = function () {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const lang = document.getElementById("languageFilter").value;

  const filtered = window.allLogs.filter(log => {
    const matchSearch =
      log.user_message.toLowerCase().includes(search) ||
      log.bot_reply.toLowerCase().includes(search);

    const matchLang = lang === "all" || log.language === lang;

    return matchSearch && matchLang;
  });

  window.renderLogs(filtered);
};


// ✅ DELETE LOG
window.deleteLog = async function (path) {
  if (!confirm("Delete this log?")) return;

  try {
    await deleteDoc(doc(db, path));
    alert("Deleted!");
    window.loadChatLogs();
  } catch (e) {
    console.error(e);
    alert("Delete failed");
  }
};



// ===================================================================
// ✅✅ PART 2 — FAQ CRUD
// ===================================================================
window.loadFAQs = async function () {
  const table = document.getElementById("kbTableBody");
  if (!table) return;

  table.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;

  const snapshot = await getDocs(collection(db, "faqs"));

  if (snapshot.empty) {
    table.innerHTML = `<tr><td colspan="5">No FAQs</td></tr>`;
    return;
  }

  table.innerHTML = "";
  let i = 1;

  snapshot.forEach(d => {
    const data = d.data();
    table.innerHTML += `
      <tr>
        <td>${i++}</td>
        <td>${data.question}</td>
        <td>${data.answer}</td>
        <td><span onclick="editFAQ('${d.id}', '${data.question}', '${data.answer}')">✏️</span></td>
        <td><span class="delete-btn" onclick="deleteFAQ('${d.id}')">🗑</span></td>
      </tr>
    `;
  });
};


window.addFAQ = async function () {
  const q = document.getElementById("kbQuestion").value.trim();
  const a = document.getElementById("kbAnswer").value.trim();

  if (!q || !a) return alert("Enter values");

  await addDoc(collection(db, "faqs"), { question: q, answer: a });

  alert("Added!");
  loadFAQs();
};


window.editFAQ = async function (id, oldQ, oldA) {
  const q = prompt("Question:", oldQ);
  const a = prompt("Answer:", oldA);
  if (!q || !a) return;

  await updateDoc(doc(db, "faqs", id), { question: q, answer: a });
  alert("Updated!");
  loadFAQs();
};


window.deleteFAQ = async function (id) {
  if (!confirm("Delete?")) return;
  await deleteDoc(doc(db, "faqs", id));
  alert("Deleted!");
  loadFAQs();
};



// ===================================================================
// ✅✅ PART 3 — ANALYTICS (now used inside dashboard)
// ===================================================================

// Chart.js instances
let langChartInstance = null;
let weeklyChartInstance = null;
let userChartInstance = null;


async function loadAnalyticsCharts() {
  console.log("Analytics loading...");

  const q = query(collectionGroup(db, "chats"), orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);

  let langCount = {};
  let weeklyData = {};

  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split("T")[0];
    weeklyData[key] = 0;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    if (data.language)
      langCount[data.language] = (langCount[data.language] || 0) + 1;

    const userId = docSnap.ref.path.split("/")[1];

    if (data.timestamp) {
      let dateObj =
        typeof data.timestamp.toDate === "function"
          ? new Date(data.timestamp.toDate())
          : new Date(data.timestamp);

      const key = dateObj.toISOString().split("T")[0];
      if (weeklyData[key] !== undefined) weeklyData[key]++;
    }
  });

  drawLangChart(langCount);
  drawWeeklyChart(weeklyData);
}



// ✅ Pie Chart — Language Usage
function drawLangChart(langCount) {
  const ctx = document.getElementById("langChart");

  if (langChartInstance) langChartInstance.destroy();

  langChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(langCount),
      datasets: [{
        data: Object.values(langCount),
        backgroundColor: ["#8b63d6", "#ff6fae", "#ffb86c", "#c7a4f7"],
        borderWidth: 3,
        borderColor: "#ffffff",
        hoverOffset: 10,
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Language Usage Distribution",
          font: { size: 20, weight: "bold" },
          color: "#6a4fb7"
        }
      },
      layout: { padding: 20 }
    }
  });
}



// ✅ Line Chart — Weekly Messages
function drawWeeklyChart(weeklyData) {
  const ctx = document.getElementById("weeklyChart").getContext("2d");

  if (weeklyChartInstance) weeklyChartInstance.destroy();

  let gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "#a77be1");
  gradient.addColorStop(1, "#ffffff");

  weeklyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(weeklyData),
      datasets: [{
        label: "Messages Per Day",
        data: Object.values(weeklyData),
        borderColor: "#8b63d6",
        borderWidth: 3,
        backgroundColor: gradient,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Weekly Message Activity",
          font: { size: 20, weight: "bold" },
          color: "#6a4fb7"
        }
      }
    }
  });
}



// ===================================================================
// ✅✅ CLOCK + CALENDAR
// ===================================================================

function updateClockCalendar() {
  const clockEl = document.getElementById("liveClock");
  const dateEl = document.getElementById("liveDate");

  const now = new Date();

  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const date = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  if (clockEl) clockEl.textContent = time;
  if (dateEl) dateEl.textContent = date;
}

// ✅ update every second
setInterval(updateClockCalendar, 1000);



// ===================================================================
// ✅✅ PART 4 — SECTION SWITCHING
// ===================================================================
window.showSection = function (id, event) {
  document.querySelectorAll("section").forEach(s =>
    s.classList.remove("active-section")
  );

  document.getElementById(id).classList.add("active-section");

  document.querySelectorAll(".sidebar li").forEach(li =>
    li.classList.remove("active")
  );

  if (event?.target) event.target.classList.add("active");

  // ✅ dashboard now loads analytics too
  if (id === "dashboard") {
    loadDashboardStats();
    loadAnalyticsCharts();
  }

  if (id === "settings") loadAdmins();

  if (id === "chatlogs") loadChatLogs();
  if (id === "knowledge") loadFAQs();
  // ✅ analytics removed from here
};



// ===================================================================
// ✅✅ PART 5 — LOGOUT
// ===================================================================
window.logout = function () {
  localStorage.removeItem("isAdmin");
  window.location.href = "login.html";
};



// ===================================================================
// ✅✅ PART 6 — DEFAULT INIT
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".sidebar li")?.classList.add("active");
  document.getElementById("dashboard")?.classList.add("active-section");

  loadDashboardStats();
  loadAnalyticsCharts(); // ✅ also load analytics on page open
});

// ===============================
//  THEME TOGGLE (NOW IN SIDEBAR)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("themeToggle");

  // Load saved theme
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    toggle.checked = true;
  }

  // On toggle
  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  });
});

window.changePassword = function () {
  const oldP = document.getElementById("oldPass").value.trim();
  const newP = document.getElementById("newPass").value.trim();

  const savedPass = localStorage.getItem("adminPass") || "admin123"; 

  if (oldP !== savedPass) {
    alert("Incorrect current password.");
    return;
  }

  if (newP.length < 4) {
    alert("Password should be at least 4 characters.");
    return;
  }

  localStorage.setItem("adminPass", newP);
  alert("Password updated successfully.");
};
window.clearAllChatLogs = async function () {
  if (!confirm("Are you sure you want to delete ALL chat logs?")) return;

  try {
    const q = query(collectionGroup(db, "chats"));
    const snapshot = await getDocs(q);

    const promises = [];
    snapshot.forEach(docSnap => {
      promises.push(deleteDoc(docSnap.ref));
    });

    await Promise.all(promises);

    alert("All chat logs deleted successfully.");
    window.loadChatLogs();

  } catch (err) {
    console.error(err);
    alert("Failed to delete logs.");
  }
};

// ============================
// ✅ ADD NEW ADMIN
// ============================

async function addNewAdmin() {
  const name = document.getElementById("newAdminName").value.trim();
  const email = document.getElementById("newAdminEmail").value.trim();
  const id = document.getElementById("newAdminId").value.trim();
  const password = document.getElementById("newAdminPassword").value.trim();
  const photo = document.getElementById("newAdminPhoto").value.trim() || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  if (!name || !email || !id || !password) {
    alert("Please fill all required fields (Name, Email, ID, Password).");
    return;
  }

  try {
    await addDoc(collection(db, "admins"), {
      name,
      email,
      Id: id,
      password,
      photo
    });

    alert("✅ New admin added successfully!");
    loadAdmins(); // reload the table
  } catch (error) {
    console.error("Error adding admin:", error);
    alert("❌ Failed to add admin.");
  }
}

// ✅ LOAD EXISTING ADMINS
async function loadAdmins() {
  const tbody = document.getElementById("adminTableBody");
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Loading...</td></tr>";

  const snapshot = await getDocs(collection(db, "admins"));
  let html = "";
  let i = 1;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    html += `
      <tr>
        <td>${i++}</td>
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>${data.Id}</td>
        <td>${data.password}</td>
        <td><button class="danger-btn" onclick="deleteAdmin('${docSnap.id}')">Delete</button></td>
      </tr>`;
  });

  tbody.innerHTML = html || "<tr><td colspan='6' style='text-align:center;'>No admins found.</td></tr>";
}

// ✅ DELETE ADMIN
async function deleteAdmin(id) {
  if (!confirm("Are you sure you want to delete this admin?")) return;
  await deleteDoc(doc(db, "admins", id));
  alert("🗑️ Admin deleted successfully!");
  loadAdmins();
}

// ✅ Load admins automatically on settings section open
window.loadAdmins = loadAdmins;
window.addNewAdmin = addNewAdmin;
window.deleteAdmin = deleteAdmin;

// ============================
// ✅ LOAD ADMINS TABLE
// ============================
window.loadAdmins = async function () {
  const tableBody = document.getElementById("adminTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>`;

  const snapshot = await getDocs(collection(db, "admins"));

  if (snapshot.empty) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No Admins Found</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  let index = 1;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = `
      <tr>
        <td>${index++}</td>
        <td>${data.Id}</td>
        <td>${data.password}</td>
        <td><button class="danger-btn" onclick="deleteAdmin('${docSnap.id}')">Delete</button></td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
};


// ============================
// ✅ DELETE ADMIN
// ============================
window.deleteAdmin = async function (id) {
  if (!confirm("Delete this admin?")) return;

  try {
    await deleteDoc(doc(db, "admins", id));
    alert("Admin deleted!");
    loadAdmins();
  } catch (e) {
    console.error(e);
    alert("Failed to delete admin");
  }
};


// ✅ Load admin profile from Firestore
document.addEventListener("DOMContentLoaded", () => {
      const isAdmin = localStorage.getItem("isAdmin");
      if (!isAdmin) {
        window.location.href = "login.html";
        return;
      }

      // Load Admin Info
      document.getElementById("adminName").innerText =
        localStorage.getItem("adminName") || "Admin";

      document.getElementById("adminEmail").innerText =
        localStorage.getItem("adminEmail") || "";

      const photo = localStorage.getItem("adminPhoto");
      if (photo) {
        document.getElementById("adminPhoto").src = photo;
      }

    });
