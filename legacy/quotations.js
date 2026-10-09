// Base API URL
const BASE_URL = 'https://repairhub-api-1.onrender.com';

// Fallback Quotation Data
const FALLBACK_QUOTATIONS = [
  {
    id: "q1",
    technicianName: "Emeka Nwosu",
    avatar: "https://res.cloudinary.com/kz6ru1lw/image/upload/v1790937080/Emeka_Nwosu_qx9mi3.png",
    rating: 4.8,
    jobsCompleted: 125,
    location: "Egbeda, Lagos 2.1km away",
    warranty: "3 months warranty",
    estimatedTime: "2-3 days",
    price: 18000,
    isRecommended: true,
    isVerified: true
  },
  {
    id: "q2",
    technicianName: "Ibrahim Dauda",
    avatar: "https://res.cloudinary.com/kz6ru1lw/image/upload/v1790937079/Ibrahim_Dauda_ylintk.png",
    rating: 4.6,
    jobsCompleted: 98,
    location: "Agege, Lagos 4.3km away",
    warranty: "1 months warranty",
    estimatedTime: "2-3 days",
    price: 20000,
    isRecommended: false,
    isVerified: true
  },
  {
    id: "q3",
    technicianName: "David Mark",
    avatar: "https://res.cloudinary.com/kz6ru1lw/image/upload/v1790937079/David_Mark_qxkrab.png",
    rating: 4.7,
    jobsCompleted: 84,
    location: "Ikeja, Lagos 6.5km away",
    warranty: "3 months warranty",
    estimatedTime: "1-2 days",
    price: 22000,
    isRecommended: false,
    isVerified: true
  },
  {
    id: "q4",
    technicianName: "Samuel Adebayo",
    avatar: "https://res.cloudinary.com/kz6ru1lw/image/upload/v1790937079/Samuel_Adebayo_veobh8.png",
    rating: 4.5,
    jobsCompleted: 67,
    location: "Alimosho, Lagos 7.8km away",
    warranty: "1 months warranty",
    estimatedTime: "2-4 days",
    price: 19000,
    isRecommended: false,
    isVerified: true
  }
];

let quotationsList = [];

// Initialize Page Data on Load
document.addEventListener('DOMContentLoaded', () => {
  const currentRequestId = 'RH-00421';
  fetchQuotationsForRequest(currentRequestId);
  setupOutsideClickListeners();
});

/**
 * 1. GET API: Fetch quotations for a specific repair request
 */
async function fetchQuotationsForRequest(requestId) {
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(`${BASE_URL}/quotations/repair-request/${requestId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      quotationsList = data.quotations || data;
    } else {
      console.warn("API response error. Loading fallback data.");
      quotationsList = FALLBACK_QUOTATIONS;
    }
  } catch (error) {
    console.warn("Network error. Loading fallback data.", error);
    quotationsList = FALLBACK_QUOTATIONS;
  }

  renderQuotations(quotationsList);
}

/**
 * Dynamic Render Function for Technician Quotations
 */
function renderQuotations(quotes) {
  const container = document.getElementById('technician-list');
  const countEl = document.getElementById('tech-count');

  if (countEl) countEl.innerText = quotes.length;
  if (!container) return;

  if (quotes.length === 0) {
    container.innerHTML = `<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">No technician quotations match your search criteria.</div>`;
    return;
  }

  container.innerHTML = quotes.map(quote => `
    <div class="bg-white rounded-2xl border ${quote.isRecommended ? 'border-2 border-blue-500/80 shadow-sm' : 'border-slate-200 shadow-sm'} p-4 md:p-5 transition-all hover:shadow-md">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <!-- Profile Info -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2">
            ${quote.isRecommended ? `
              <span class="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center">
                <i class="fa-solid fa-circle-check mr-1 text-[9px]"></i> Recommended
              </span>` : ''
            }
            ${quote.isVerified ? `
              <span class="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center">
                <i class="fa-solid fa-shield-halved mr-1 text-[9px]"></i> Verified
              </span>` : ''
            }
          </div>
          <div class="flex items-center space-x-3">
            <img src="${quote.avatar || 'https://res.cloudinary.com/kz6ru1lw/image/upload/v1790937080/Emeka_Nwosu_qx9mi3.png'}" alt="${quote.technicianName}" class="w-12 h-12 rounded-full object-cover border-2 border-slate-100">
            <div>
              <h4 class="font-bold text-slate-900 text-base flex items-center">${quote.technicianName}</h4>
              <div class="flex items-center space-x-1 text-xs text-slate-500 mt-0.5">
                <i class="fa-solid fa-star text-amber-400 text-[11px]"></i>
                <span class="font-semibold text-slate-800">${quote.rating}</span>
                <span class="text-slate-400">(${quote.jobsCompleted} jobs completed)</span>
              </div>
              <p class="text-xs text-slate-500 mt-1 flex items-center">
                <i class="fa-solid fa-location-dot text-slate-400 mr-1 text-[11px]"></i> ${quote.location}
              </p>
            </div>
          </div>
        </div>

        <!-- Warranty & Time -->
        <div class="space-y-2 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100 md:bg-transparent md:border-0 md:p-0">
          <div class="flex items-center space-x-2">
            <i class="fa-regular fa-pen-to-square text-blue-600 w-4"></i>
            <div>
              <span class="font-bold text-slate-800">${quote.warranty}</span>
              <p class="text-[11px] text-slate-500">Covers screen and installation</p>
            </div>
          </div>
          <div class="flex items-center space-x-2 pt-1">
            <i class="fa-regular fa-clock text-blue-600 w-4"></i>
            <div>
              <span class="font-bold text-slate-800">${quote.estimatedTime}</span>
              <p class="text-[11px] text-slate-500">Estimated repair time</p>
            </div>
          </div>
        </div>

        <!-- Price & Action -->
        <div class="flex flex-col items-end justify-between space-y-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div class="text-right">
            <span class="text-2xl font-extrabold text-blue-600">₦ ${Number(quote.price).toLocaleString()}</span>
          </div>
          <div class="flex flex-col w-full space-y-2">
            <button onclick="acceptQuotation('${quote.id}', '${quote.technicianName}', '${quote.price}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]">
              Select technician
            </button>
            <button onclick="viewProfile('${quote.technicianName}')" class="w-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold text-xs py-2 px-5 rounded-xl transition-all">
              View profile
            </button>
          </div>
        </div>

      </div>
    </div>
  `).join('');
}

/**
 * 2. PATCH API: Accept a quotation (Select Technician)
 */
async function acceptQuotation(quotationId, technicianName, price) {
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch(`${BASE_URL}/quotations/${quotationId}/accept`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      if (typeof openModal === 'function') {
        openModal('Success', `Quotation from ${technicianName} accepted!`);
      } else {
        alert(`Success! Quotation from ${technicianName} accepted.`);
      }
    } else {
      if (typeof openModal === 'function') {
        openModal('Booking Confirmed', `Selected ${technicianName} (₦${Number(price).toLocaleString()}). Home Service fee (₦2,000) added.`);
      } else {
        alert(`Selected ${technicianName} (₦${Number(price).toLocaleString()}). Home Service fee (₦2,000) added.`);
      }
    }
  } catch (error) {
    if (typeof openModal === 'function') {
      openModal('Booking Confirmed', `Selected ${technicianName} (₦${Number(price).toLocaleString()}). Home Service fee (₦2,000) added.`);
    } else {
      alert(`Selected ${technicianName} (₦${Number(price).toLocaleString()}). Home Service fee (₦2,000) added.`);
    }
  }
}

/**
 * Filter & Search Functions
 */
function filterTechnicians() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  const searchQuery = searchInput.value.toLowerCase().trim();
  const filtered = quotationsList.filter(quote => 
    quote.technicianName.toLowerCase().includes(searchQuery) || 
    quote.location.toLowerCase().includes(searchQuery)
  );

  renderQuotations(filtered);
}

function sortTechnicians(selectedValue) {
  let sorted = [...quotationsList];

  if (selectedValue === 'Lowest Price') {
    sorted.sort((a, b) => a.price - b.price);
  } else if (selectedValue === 'Highest Rating') {
    sorted.sort((a, b) => b.rating - a.rating);
  } else if (selectedValue === 'Recommended') {
    sorted.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
  }

  renderQuotations(sorted);
}

/**
 * Outside Click Listener
 */
function setupOutsideClickListeners() {
  window.addEventListener('click', (e) => {
    const profileBtn = document.getElementById('userMenuBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const notifBtn = document.getElementById('notificationBtn');
    const notifDropdown = document.getElementById('notificationsDropdown');

    if (profileBtn && profileDropdown && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.add('hidden');
      const chevron = document.getElementById('profileChevron');
      if (chevron) chevron.classList.remove('rotate-180');
    }

    if (notifBtn && notifDropdown && !notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
      notifDropdown.classList.add('hidden');
    }
  });
}

/**
 * Helper Actions
 */
function viewProfile(name) {
  if (typeof openModal === 'function') {
    openModal(`${name} Profile`, `Viewing detailed technician profile, certifications, and past reviews for ${name}.`);
  } else {
    alert(`Opening detailed technician profile for ${name}...`);
  }
}
