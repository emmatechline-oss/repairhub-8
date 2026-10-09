/**
 * RepairHub - Booking Confirmed JavaScript (script.js)
 */

// --- Base Configurations ---
const API_BASE_URL = 'https://repairhub-api-1.onrender.com/api';

// Retrieve Auth Token & Route IDs from localStorage or Query Parameters
const AUTH_TOKEN = localStorage.getItem('authToken') || '';
const urlParams = new URLSearchParams(window.location.search);

// Get IDs passed from previous step (e.g., booking-confirmed.html?appointmentId=XYZ&jobId=ABC)
const APPOINTMENT_ID = urlParams.get('appointmentId') || localStorage.getItem('lastAppointmentId');
const REPAIR_JOB_ID = urlParams.get('jobId') || localStorage.getItem('lastRepairJobId');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initUIEvents();
    
    if (APPOINTMENT_ID) {
        fetchBookingConfirmedData();
    } else {
        console.warn('No Appointment ID found in URL parameters or localStorage.');
    }
});

// --- API Data Fetching ---
async function fetchBookingConfirmedData() {
    try {
        // 1. Fetch Appointment Details from GET /appointments/{id}
        const appointmentResponse = await fetch(`${API_BASE_URL}/appointments/${APPOINTMENT_ID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });

        if (!appointmentResponse.ok) {
            throw new Error(`Failed to fetch appointment: ${appointmentResponse.statusText}`);
        }

        const appointmentData = await appointmentResponse.json();
        
        // Populate Appointment-specific details
        populateAppointmentDetails(appointmentData);

        // 2. Fetch Repair Job Details if job ID is available
        const jobId = REPAIR_JOB_ID || appointmentData.repairJobId || appointmentData.repairJob?.id;
        if (jobId) {
            fetchRepairJobDetails(jobId);
        }

    } catch (error) {
        console.error('Error loading booking details:', error);
    }
}

async function fetchRepairJobDetails(jobId) {
    try {
        // Fetch Job Details from GET /repair-jobs/{id}
        const jobResponse = await fetch(`${API_BASE_URL}/repair-jobs/${jobId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });

        if (!jobResponse.ok) {
            throw new Error(`Failed to fetch repair job: ${jobResponse.statusText}`);
        }

        const jobData = await jobResponse.json();
        
        // Populate Job-specific details
        populateJobDetails(jobData);

    } catch (error) {
        console.error('Error loading repair job details:', error);
    }
}

// --- DOM Population Helpers ---
function populateAppointmentDetails(data) {
    // Expected structure based on OAS 3.0 spec
    const appointment = data.data || data;

    // Appointment Date
    if (appointment.scheduledAt) {
        const dateElement = document.querySelector('.fa-calendar').closest('.flex').nextElementSibling;
        if (dateElement) {
            dateElement.textContent = formatDate(appointment.scheduledAt);
        }
    }

    // Service Mode (e.g., home_service, dropoff, pickup)
    if (appointment.serviceMode) {
        const modeElement = document.querySelector('.fa-house-laptop').closest('.flex').nextElementSibling;
        if (modeElement) {
            modeElement.textContent = formatServiceMode(appointment.serviceMode);
        }
    }

    // Service Address
    if (appointment.address) {
        const addressElement = document.querySelector('.fa-location-dot').closest('.flex').nextElementSibling;
        if (addressElement) {
            addressElement.textContent = typeof appointment.address === 'string' 
                ? appointment.address 
                : `${appointment.address.street || ''}, ${appointment.address.city || ''}`;
        }
    }

    // Amount / Payment
    if (appointment.quotation?.price || appointment.amount) {
        const priceValue = appointment.quotation?.price || appointment.amount;
        const paymentPriceElement = document.querySelector('.fa-credit-card').closest('.flex').nextElementSibling.querySelector('span:first-child');
        if (paymentPriceElement) {
            paymentPriceElement.textContent = formatCurrency(priceValue);
        }
    }
}

function populateJobDetails(job) {
    const jobData = job.data || job;

    // Technician Information
    const tech = jobData.technician || jobData.counterpart;
    if (tech) {
        const techNameElem = document.querySelector('.fa-id-badge').closest('.flex').nextElementSibling.querySelector('.font-bold');
        if (techNameElem) techNameElem.textContent = tech.fullName || `${tech.firstName} ${tech.lastName}`;

        const techAvatarElem = document.querySelector('.fa-id-badge').closest('.flex').nextElementSibling.querySelector('img');
        if (techAvatarElem && tech.avatar) techAvatarElem.src = tech.avatar;

        const techBannerName = document.querySelector('main p span.font-semibold');
        if (techBannerName) techBannerName.textContent = tech.fullName || tech.firstName;
    }

    // Request / Job ID Banner
    if (jobData.id || jobData.requestCode) {
        const idElem = document.querySelector('.fa-receipt').closest('.flex').nextElementSibling;
        if (idElem) idElem.textContent = jobData.requestCode || `RH-${jobData.id.slice(-5).toUpperCase()}`;
    }

    // Device / Repair Details
    if (jobData.title || jobData.problemDescription) {
        const titleElem = document.querySelector('h3.text-sm.font-bold.text-slate-900');
        if (titleElem) titleElem.textContent = jobData.title || jobData.itemType || 'Device Repair';

        const descElem = titleElem?.nextElementSibling;
        if (descElem) descElem.textContent = jobData.problemDescription || jobData.categoryName || 'Repair Service';
    }
}

// --- UI Utility Functions ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0
    }).format(amount).replace('NGN', '₦');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatServiceMode(mode) {
    const modes = {
        'onsite': 'Home Service',
        'home_service': 'Home Service',
        'pickup': 'Pickup & Delivery',
        'dropoff': 'Walk-in / Drop-off'
    };
    return modes[mode.toLowerCase()] || mode;
}

// --- Interactive UI Event Listeners ---
function initUIEvents() {
    // Navigation Action Buttons
    const trackBtn = document.getElementById('trackRepairBtn');
    if (trackBtn) {
        trackBtn.addEventListener('click', () => {
            const jobId = REPAIR_JOB_ID || '';
            window.location.href = `track-repair.html?jobId=${jobId}`;
        });
    }

    const viewRepairsBtn = document.getElementById('viewMyRepairsBtn');
    if (viewRepairsBtn) {
        viewRepairsBtn.addEventListener('click', () => {
            window.location.href = 'my-repairs.html';
        });
    }
}

// Global UI functions referenced in HTML attributes
window.toggleNotifications = function() {
    const dropdown = document.getElementById('notificationsDropdown');
    dropdown.classList.toggle('hidden');
};

window.toggleProfileDropdown = function() {
    const dropdown = document.getElementById('profileDropdown');
    const chevron = document.getElementById('profileChevron');
    dropdown.classList.toggle('hidden');
    if (chevron) chevron.classList.toggle('rotate-180');
};

window.markAllNotificationsRead = function() {
    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.add('hidden');
};

window.setActiveTopNav = function(element) {
    document.querySelectorAll('header nav a').forEach(link => {
        link.className = 'text-slate-500 hover:text-blue-600 transition-colors';
    });
    element.className = 'text-blue-600 border-b-2 border-blue-600 pb-4 pt-4 font-semibold';
};
