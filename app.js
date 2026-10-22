/* ==========================================
   Google Sheets API URL
========================================== */
const API_URL = 'https://script.google.com/macros/s/AKfycbzOYffZsNKmf_1Bp6q_wxarT1kQRCVoqGRNM7SmLUKL_yI5oUQHZkDxyP9xW2_Q6bX0/exec?api=leaderboard';
const REFRESH_INTERVAL = 10000;
let isLoading = false;

document.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  window.setInterval(loadLeaderboard, REFRESH_INTERVAL);
});

/* ==========================================
   Fetch the latest sheet data
========================================== */
async function loadLeaderboard() {
  if (isLoading) return;
  isLoading = true;

  try {
    const response = await fetch(API_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const items = await response.json();
    if (!Array.isArray(items)) {
      throw new Error('The API did not return a list of menu items.');
    }

    updateLeaderboard(items);
    setUpdateMessage(
      `Updated ${new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      })}`
    );
  } catch (error) {
    console.error('Unable to load leaderboard:', error);
    setUpdateMessage('Unable to refresh sales data');

    const root = document.getElementById('leaderboard');
    if (!root.querySelector('.table-container')) {
      root.innerHTML =
        '<p class="empty-state">Sales data could not be loaded. Please try again shortly.</p>';
    }
  } finally {
    isLoading = false;
  }
}

/* ==========================================
   Update summary cards and leaderboard
========================================== */
function updateLeaderboard(items) {
  const statusOrder = {
    Serving: 0,
    Paused: 1,
    'Sold Out': 2
  };

  const sorted = [...items].sort((a, b) => {
    const statusDifference =
      (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);

    if (statusDifference !== 0) return statusDifference;

    return (Number(b.orders) || 0) - (Number(a.orders) || 0);
  });

  const allClubs = new Set(
    items.map(item => item.clubName).filter(Boolean)
  );

  const servingClubs = new Set(
    items
      .filter(item => item.status === 'Serving')
      .map(item => item.clubName)
      .filter(Boolean)
  );

  document.getElementById('clubsServing').textContent =
    servingClubs.size.toLocaleString();

  document.getElementById('totalClubs').textContent =
    allClubs.size.toLocaleString();

  document.getElementById('totalOrders').textContent =
    items.reduce(
      (total, item) => total + (Number(item.orders) || 0),
      0
    ).toLocaleString();

  const root = document.getElementById('leaderboard');

  if (!sorted.length) {
    root.innerHTML =
      '<p class="empty-state">No menu items are available right now.</p>';
    return;
  }

  // Split the sorted list into two side-by-side tables on wide screens.
  const midpoint = Math.ceil(sorted.length / 2);

  root.innerHTML =
    renderTable(sorted.slice(0, midpoint), 0) +
    renderTable(sorted.slice(midpoint), midpoint);
}

function renderTable(items, rankOffset) {
  const rows = items.map((item, index) => {
    const status = String(item.status || '');
    const statusClass = getStatusClass(status);

    return `
      <tr>
        <td>${rankOffset + index + 1}</td>
        <td class="club-name">${escapeHTML(item.clubName)}</td>
        <td><span class="category">${escapeHTML(item.category)}</span></td>
        <td class="food-name">${escapeHTML(item.foodItem)}</td>
        <td class="price">$${(Number(item.price) || 0).toFixed(2)}</td>
        <td>
          <span class="status ${statusClass}">
            ${escapeHTML(status || 'Unknown')}
          </span>
        </td>
        <td>
          <span class="badge ${getBadgeClass(item.recognition)}">
            ${escapeHTML(item.recognition || 'Participant')}
          </span>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Club</th>
            <th>Category</th>
            <th>Food</th>
            <th>Price</th>
            <th>Status</th>
            <th>Recognition</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ==========================================
   Badges, status and safe text
========================================== */
function getBadgeClass(recognition) {
  const text = String(recognition || '').toLowerCase();

  if (text.includes('best') || text.includes('gold')) return 'gold';
  if (text.includes('second') || text.includes('silver')) return 'silver';
  if (text.includes('third') || text.includes('bronze')) return 'bronze';

  return 'pending';
}

function getStatusClass(status) {
  if (status === 'Serving') return 'serving';
  if (status === 'Paused') return 'paused';
  if (status === 'Sold Out') return 'sold-out';

  return 'pending';
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function setUpdateMessage(message) {
  const label = document.getElementById('lastUpdated');
  if (label) label.textContent = message;
}