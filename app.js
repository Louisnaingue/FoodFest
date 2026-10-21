/* ==========================================
   Google Sheets API URL
========================================== */

const API_URL = "https://script.google.com/macros/s/AKfycbzOYffZsNKmf_1Bp6q_wxarT1kQRCVoqGRNM7SmLUKL_yI5oUQHZkDxyP9xW2_Q6bX0/exec?api=leaderboard";
/* ==========================================
   Auto Refresh
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();

  // Refresh every 10 seconds
  setInterval(loadLeaderboard, 10000);
});


/* ==========================================
   Fetch Google Sheet Data
========================================== */

async function loadLeaderboard() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Request failed: " + response.status);
    }

    const items = await response.json();

    console.log("Google Sheet Data:", items);

    updateLeaderboard(items);
  } catch (error) {
    console.error("Unable to load leaderboard:", error);
  }
}


/* ==========================================
   Update Leaderboard
========================================== */

function updateLeaderboard(items) {
  const tbody = document.getElementById("leaderboardBody");

  tbody.innerHTML = "";

  if (!items || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">No data available</td>
      </tr>
    `;
    return;
  }

  // Sort items by status, then by highest order count
  const statusOrder = {
    "Serving": 0,
    "Paused": 1,
    "Sold Out": 2
  };

  const sorted = [...items].sort((a, b) => {
    const statusDifference =
      (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return Number(b.orders || 0) - Number(a.orders || 0);
  });

  // Count unique clubs
  const allClubs = new Set(items.map(item => item.clubName));
  const servingClubs = new Set(
    items
      .filter(item => item.status === "Serving")
      .map(item => item.clubName)
  );

  document.getElementById("clubsServing").textContent =
    servingClubs.size;

  document.getElementById("totalClubs").textContent =
    allClubs.size;

  document.getElementById("totalOrders").textContent =
    items.reduce(
      (total, item) => total + (Number(item.orders) || 0),
      0
    );

  // Build the table
  sorted.forEach((item, index) => {
    const row = document.createElement("tr");
    const statusClass = getStatusClass(item.status);

    row.innerHTML = `
      <td>${index + 1}</td>

      <td class="club-name">
        ${escapeHTML(item.clubName)}
      </td>

      <td>
        <span class="category">
          ${escapeHTML(item.category)}
        </span>
      </td>

      <td>
        ${escapeHTML(item.foodItem)}
      </td>

      <td class="price">
        $${(Number(item.price) || 0).toFixed(2)}
      </td>
      <td>
        <span class="status ${statusClass}">
          ${escapeHTML(item.status)}
        </span>
      </td>

      <td>
        ${getBadge(item.recognition)}
      </td>

      
    `;

    tbody.appendChild(row);
  });
}


/* ==========================================
   Recognition Badge
========================================== */

function getBadge(recognition) {
  const text = recognition || "Participant";
  const badgeClass =
    text.toLowerCase().includes("best") ? "gold" : "pending";

  return `
    <span class="badge ${badgeClass}">
      ${escapeHTML(text)}
    </span>
  `;
}


/* ==========================================
   Status Styling
========================================== */

function getStatusClass(status) {
  if (status === "Serving") return "serving";
  if (status === "Paused") return "paused";
  if (status === "Sold Out") return "sold-out";
  return "";
}


/* ==========================================
   Safe Text Display
========================================== */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}
