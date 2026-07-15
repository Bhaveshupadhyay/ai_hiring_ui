import { 
  getJobs, 
  getJob, 
  getJobApplicantsCount, 
  getApplications, 
  updateApplicationStatus, 
  scheduleInterview, 
  getCandidate 
} from './api.js';
import { 
  showToast, 
  showConfirm, 
  showLoader, 
  getQueryParam, 
  initSidebar 
} from './utils.js';

let activeJobId = null;
let activeTab = 'shortlisted';
let applications = [];
let selectedAppForInterview = null;

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  setupTabs();
  await loadJobsDropdown();
  
  // Close modals on close button click
  document.getElementById('btn-close-interview-modal').addEventListener('click', closeInterviewModal);
  document.getElementById('btn-cancel-interview').addEventListener('click', closeInterviewModal);
  
  document.getElementById('btn-close-analysis-modal').addEventListener('click', closeAnalysisModal);
  document.getElementById('btn-close-analysis-footer').addEventListener('click', closeAnalysisModal);

  // Handle Interview Schedule Form Submit
  document.getElementById('schedule-interview-form').addEventListener('submit', handleScheduleSubmit);

  // Close dropdown menus when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
    }
  });
});

/**
 * Setup Job Selection Dropdown
 */
async function loadJobsDropdown() {
  const dropdown = document.getElementById('job-select-dropdown');
  dropdown.innerHTML = '<option value="">Select a Job Listing...</option>';

  try {
    const jobs = await getJobs();
    
    // Sort jobs by title
    jobs.sort((a, b) => a.title.localeCompare(b.title));
    
    jobs.forEach(job => {
      const option = document.createElement('option');
      option.value = job.id;
      option.textContent = `${job.title} (${job.status})`;
      dropdown.appendChild(option);
    });

    // Check for jobId in URL query
    const urlJobId = getQueryParam('jobId');
    if (urlJobId) {
      activeJobId = urlJobId;
      dropdown.value = urlJobId;
      await loadSelectedJobData();
    }

    // Dropdown change listener
    dropdown.addEventListener('change', async (e) => {
      activeJobId = e.target.value;
      
      // Update URL silently
      const newUrl = activeJobId 
        ? `${window.location.pathname}?jobId=${activeJobId}`
        : window.location.pathname;
      window.history.pushState({ path: newUrl }, '', newUrl);

      await loadSelectedJobData();
    });

  } catch (error) {
    console.error('Failed to load jobs dropdown:', error);
    showToast('Failed to Load Jobs', 'Unable to retrieve jobs list.', 'error');
  }
}

/**
 * Setup Tab Buttons & Indicator positioning
 */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const indicator = document.getElementById('tab-indicator');

  const updateTabIndicator = () => {
    const activeTabBtn = document.querySelector('.tab-btn.active');
    if (activeTabBtn && indicator) {
      indicator.style.left = `${activeTabBtn.offsetLeft}px`;
      indicator.style.width = `${activeTabBtn.offsetWidth}px`;
    }
  };

  // Run on load to place indicator
  setTimeout(updateTabIndicator, 100);

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.status;
      updateTabIndicator();
      
      if (activeJobId) {
        renderApplicationsList();
      }
    });
  });

  window.addEventListener('resize', updateTabIndicator);
}

/**
 * Load Job Headers, counters, and call application retrieval
 */
async function loadSelectedJobData() {
  const infoCard = document.getElementById('selected-job-info-card');
  const emptyState = document.getElementById('applications-empty-state');
  const tableContainer = document.getElementById('applications-table-container');

  if (!activeJobId) {
    infoCard.style.display = 'none';
    tableContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    
    document.getElementById('empty-title').textContent = 'Select a Job';
    document.getElementById('empty-desc').textContent = 'Please choose a job listing from the dropdown at the top right to view its candidate applications.';
    return;
  }

  showLoader(true);
  try {
    // Load job info & applicant count in parallel
    const [job, applicantsCount] = await Promise.all([
      getJob(activeJobId),
      getJobApplicantsCount(activeJobId)
    ]);

    // Populate Job Info card
    document.getElementById('info-job-title').textContent = job.title;
    document.getElementById('info-job-applicants-count').innerHTML = `<i class="fas fa-users"></i> ${applicantsCount.count} Applicants`;
    
    const badge = document.getElementById('info-job-status-badge');
    badge.textContent = job.status;
    badge.className = `badge badge-${job.status}`;

    const viewDetailsBtn = document.getElementById('btn-view-job-details');
    viewDetailsBtn.href = `edit-job.html?id=${job.id}`;

    infoCard.style.display = 'block';

    // Retrieve and render application matches
    await refreshApplications();

  } catch (error) {
    console.error('Failed to load job summary data:', error);
    showToast('Failed to Load Job Data', error.message || 'Server error occurred.', 'error');
  } finally {
    showLoader(false);
  }
}

/**
 * Fetch all applications for the active job
 */
async function refreshApplications() {
  try {
    // Omit status parameter to retrieve ALL applications, enabling smooth client side filtering
    // Sort by Match Score from high to low
    applications = await getApplications(activeJobId, null, true);
    renderApplicationsList();
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    showToast('Fetch Failed', 'Unable to retrieve applications.', 'error');
  }
}

/**
 * Filters the loaded applications list and renders the UI table
 */
function renderApplicationsList() {
  const tableBody = document.getElementById('applications-table-body');
  const tableContainer = document.getElementById('applications-table-container');
  const emptyState = document.getElementById('applications-empty-state');

  // Filter based on selected tab:
  // 'shortlisted' contains shortlisted, approved, and pending applications (so HMs don't miss new ones)
  // 'interviewing' contains interviewing
  // 'rejected' contains rejected
  const filteredApps = applications.filter(app => {
    if (activeTab === 'shortlisted') {
      return app.status === 'shortlisted' || app.status === 'pending' || app.status === 'approved';
    } else if (activeTab === 'interviewing') {
      return app.status === 'interviewing';
    } else if (activeTab === 'rejected') {
      return app.status === 'rejected';
    }
    return false;
  });

  // Handle empty state for the tab
  if (filteredApps.length === 0) {
    tableContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    document.getElementById('empty-title').textContent = 'No Candidates Yet';
    document.getElementById('empty-desc').textContent = `There are currently no candidates in the ${activeTab} category for this job.`;
    return;
  }

  // Show table, hide empty state
  emptyState.classList.add('hidden');
  tableContainer.classList.remove('hidden');
  
  tableBody.innerHTML = '';

  filteredApps.forEach((app, idx) => {
    const candidate = app.candidate || {};
    const resumeAnalysis = candidate.resume_analysis || {};
    
    const row = document.createElement('tr');

    // Score badge formatting
    const score = app.match_score || 0;
    let scoreClass = 'score-low';
    if (score >= 90) scoreClass = 'score-high';
    else if (score >= 70) scoreClass = 'score-medium';

    // Experience formatting
    const experienceYears = resumeAnalysis.experience !== undefined && resumeAnalysis.experience !== null
      ? `${resumeAnalysis.experience} years`
      : 'N/A';

    row.innerHTML = `
      <td data-label="#" class="col-shrink font-semibold">${idx + 1}</td>
      <td data-label="Candidate Name">
        <button class="candidate-name-btn" data-appid="${app.id}" style="background: none; border: none; padding: 0; color: var(--primary); font-weight: 600; text-align: left; cursor: pointer; text-decoration: underline;">
          ${escapeHtml(candidate.name || 'Unknown Candidate')}
        </button>
      </td>
      <td data-label="AI Match Score" style="text-align: center;" class="col-shrink">
        <span class="score-badge ${scoreClass}">${score}%</span>
      </td>
      <td data-label="Experience">${escapeHtml(experienceYears)}</td>
      <td data-label="Contact">
        <div style="display: flex; gap: 10px; align-items: center;">
          ${candidate.email ? `
            <a href="mailto:${candidate.email}?subject=Application for ${encodeURIComponent(app.job?.title || '')}" class="btn-icon" title="Email Candidate: ${candidate.email}">
              <i class="fas fa-envelope"></i>
            </a>
          ` : ''}
          ${candidate.phone ? `
            <a href="tel:${candidate.phone}" class="btn-icon" title="Call Candidate: ${candidate.phone}">
              <i class="fas fa-phone-alt"></i>
            </a>
          ` : ''}
        </div>
      </td>
      <td class="action-cell">
        <div class="action-buttons">
          ${candidate.resume_url ? `
            <a href="${candidate.resume_url}" target="_blank" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">
              <i class="fas fa-file-pdf"></i> Resume
            </a>
          ` : ''}
          
          ${app.status !== 'interviewing' ? `
            <button class="btn btn-primary btn-schedule-trigger" data-appid="${app.id}" style="padding: 6px 12px; font-size: 12px;">
              <i class="fas fa-calendar-plus"></i> Interview
            </button>
          ` : ''}

          <!-- Three dots Dropdown -->
          <div class="dropdown-container">
            <button class="btn-icon btn-dots-trigger" title="More Actions">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="dropdown-menu">
              ${renderDropdownItems(app)}
            </div>
          </div>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Wire up details view click
  tableBody.querySelectorAll('.candidate-name-btn').forEach(btn => {
    btn.addEventListener('click', handleViewReport);
  });

  // Wire up interview schedule click
  tableBody.querySelectorAll('.btn-schedule-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const appId = e.currentTarget.dataset.appid;
      openInterviewModal(appId);
    });
  });

  // Wire up dots trigger
  tableBody.querySelectorAll('.btn-dots-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== e.currentTarget.nextElementSibling) {
          menu.classList.remove('show');
        }
      });
      e.currentTarget.nextElementSibling.classList.toggle('show');
    });
  });

  // Wire up state transitions from More menu
  tableBody.querySelectorAll('.dropdown-item-action').forEach(item => {
    item.addEventListener('click', handleStatusChange);
  });
}

/**
 * Returns HTML string of actions depending on the current tab
 */
function renderDropdownItems(app) {
  const id = app.id;
  if (activeTab === 'shortlisted') {
    return `
      <button class="dropdown-item dropdown-item-danger dropdown-item-action" data-id="${id}" data-action="rejected">
        <i class="fas fa-user-times"></i> Reject
      </button>
    `;
  } else if (activeTab === 'rejected') {
    return `
      <button class="dropdown-item dropdown-item-action" data-id="${id}" data-action="shortlisted">
        <i class="fas fa-user-check"></i> Shortlist
      </button>
    `;
  } else if (activeTab === 'interviewing') {
    return `
      <button class="dropdown-item dropdown-item-action" data-id="${id}" data-action="shortlisted">
        <i class="fas fa-user-check"></i> Shortlist
      </button>
      <button class="dropdown-item dropdown-item-danger dropdown-item-action" data-id="${id}" data-action="rejected">
        <i class="fas fa-user-times"></i> Reject
      </button>
    `;
  }
  return '';
}

/**
 * Execute application status transition (Shortlist / Reject)
 */
async function handleStatusChange(e) {
  const appId = e.currentTarget.dataset.id;
  const nextStatus = e.currentTarget.dataset.action; // 'shortlisted' or 'rejected'

  e.stopPropagation();
  document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));

  const actionName = nextStatus === 'shortlisted' ? 'Shortlist' : 'Reject';
  const isDanger = nextStatus === 'rejected';

  const confirmed = await showConfirm({
    title: `${actionName} Candidate?`,
    message: `Are you sure you want to move this application to ${nextStatus}?`,
    confirmText: actionName,
    cancelText: 'Cancel',
    isDanger: isDanger
  });

  if (!confirmed) return;

  showLoader(true);
  try {
    await updateApplicationStatus(appId, nextStatus);
    showToast('Status Updated', `Candidate was successfully moved to ${nextStatus}.`, 'success');
    await refreshApplications();
  } catch (err) {
    console.error('Failed to change application status:', err);
    showToast('Failed to Update', err.message || 'Server error.', 'error');
  } finally {
    showLoader(false);
  }
}

/**
 * Open Interview Modal
 */
function openInterviewModal(appId) {
  selectedAppForInterview = applications.find(a => a.id === appId);
  if (!selectedAppForInterview) return;

  // Clear previous values
  document.getElementById('interview-time').value = '';
  document.getElementById('interview-link').value = '';
  document.getElementById('interview-notes').value = '';

  const modal = document.getElementById('interview-modal');
  modal.classList.remove('hidden');
}

/**
 * Close Interview Modal
 */
function closeInterviewModal() {
  document.getElementById('interview-modal').classList.add('hidden');
  selectedAppForInterview = null;
}

/**
 * Submit Interview Scheduling Form
 */
async function handleScheduleSubmit(e) {
  e.preventDefault();
  if (!selectedAppForInterview) return;

  const inputTime = document.getElementById('interview-time').value;
  const inputLink = document.getElementById('interview-link').value.trim();
  const inputNotes = document.getElementById('interview-notes').value.trim();

  // Convert time to ISO String
  let isoTime = '';
  try {
    isoTime = new Date(inputTime).toISOString();
  } catch (err) {
    showToast('Invalid Date', 'Please select a valid date and time.', 'error');
    return;
  }

  showLoader(true);
  closeInterviewModal();

  try {
    // 1. Create scheduled interview record
    await scheduleInterview({
      application_id: selectedAppForInterview.id,
      scheduled_at: isoTime,
      meeting_link: inputLink,
      notes: inputNotes
    });

    // 2. Transition application status to interviewing
    await updateApplicationStatus(selectedAppForInterview.id, 'interviewing');

    showToast('Interview Scheduled', 'Interview record created. Moving candidate...', 'success');

    // 3. Draft & trigger email client invitation (mailto)
    triggerMailtoInvite(selectedAppForInterview, inputTime, inputLink, inputNotes);

    // Refresh data
    await refreshApplications();

  } catch (err) {
    console.error('Failed to schedule interview:', err);
    showToast('Error Scheduling', err.message || 'Server error scheduled interview.', 'error');
  } finally {
    showLoader(false);
  }
}

/**
 * Helper to open mailto link with preset template
 */
function triggerMailtoInvite(app, dateTimeStr, meetingLink, notes) {
  const candidateName = app.candidate?.name || 'Candidate';
  const jobTitle = app.job?.title || 'Job Position';
  
  const dateFormatted = new Date(dateTimeStr).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const subject = `Interview Invitation - ${jobTitle}`;
  const body = `Hi ${candidateName},

We reviewed your profile and resume matches our requirements. We would like to invite you for an interview to discuss the ${jobTitle} position further!

Details:
Date/Time: ${dateFormatted}
Meeting Link: ${meetingLink}

${notes ? `Additional Instructions:\n${notes}\n` : ''}
We look forward to meeting you.

Best regards,
Hiring Team`;

  const mailtoUrl = `mailto:${app.candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  // Launch mail client in a timeout to avoid interrupting page flow
  setTimeout(() => {
    window.location.href = mailtoUrl;
  }, 1000);
}

/**
 * Open AI matching explanation report
 */
async function handleViewReport(e) {
  const appId = e.currentTarget.dataset.appid;
  const app = applications.find(a => a.id === appId);
  if (!app) return;

  showLoader(true);
  try {
    // Fetch full candidate analysis (which includes parsed resume properties)
    const candidate = await getCandidate(app.candidate_id);
    
    // Fill in report modal
    document.getElementById('analysis-candidate-name').textContent = candidate.name || 'Unknown Candidate';
    document.getElementById('analysis-candidate-email').textContent = candidate.email || 'No Email';
    
    // Score Badge
    const score = app.match_score || 0;
    let scoreClass = 'score-low';
    if (score >= 90) scoreClass = 'score-high';
    else if (score >= 70) scoreClass = 'score-medium';
    
    const badgeContainer = document.getElementById('analysis-score-badge-container');
    badgeContainer.innerHTML = `<span class="score-badge ${scoreClass}" style="width:50px; height:50px; font-size:15px;">${score}%</span>`;

    // Report Explanation
    document.getElementById('analysis-reason').textContent = app.reason || 'No explanation provided.';

    // Render Strengths and Weaknesses
    renderListItems(document.getElementById('analysis-strengths'), app.strengths);
    renderListItems(document.getElementById('analysis-weaknesses'), app.weaknesses);

    // Render Parsed Resume properties
    const analysis = candidate.resume_analysis || {};
    document.getElementById('analysis-resume-summary').textContent = analysis.summary || 'N/A';
    document.getElementById('analysis-resume-exp').textContent = analysis.experience !== undefined && analysis.experience !== null ? `${analysis.experience} years` : 'N/A';
    document.getElementById('analysis-resume-edu').textContent = analysis.education || 'N/A';
    
    // Skill items rendering
    const skillsContainer = document.getElementById('analysis-resume-skills');
    if (Array.isArray(analysis.skills)) {
      skillsContainer.textContent = analysis.skills.join(', ');
    } else if (analysis.skills && typeof analysis.skills === 'object') {
      skillsContainer.textContent = Object.keys(analysis.skills).join(', ');
    } else {
      skillsContainer.textContent = String(analysis.skills || 'N/A');
    }

    // Open Modal
    document.getElementById('analysis-modal').classList.remove('hidden');

  } catch (err) {
    console.error('Failed to load candidate analysis:', err);
    showToast('Failed to Load Report', 'Could not retrieve full AI report.', 'error');
  } finally {
    showLoader(false);
  }
}

/**
 * Close Report modal
 */
function closeAnalysisModal() {
  document.getElementById('analysis-modal').classList.add('hidden');
}

/**
 * Helper to render array/object items safely into list container
 */
function renderListItems(container, data) {
  container.innerHTML = '';
  
  if (!data) {
    container.innerHTML = '<li>None specified</li>';
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      container.innerHTML = '<li>None specified</li>';
    } else {
      data.forEach(item => {
        const li = document.createElement('li');
        li.textContent = String(item);
        container.appendChild(li);
      });
    }
  } else if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      container.innerHTML = '<li>None specified</li>';
    } else {
      keys.forEach(key => {
        const li = document.createElement('li');
        li.textContent = `${key}: ${data[key]}`;
        container.appendChild(li);
      });
    }
  } else {
    const li = document.createElement('li');
    li.textContent = String(data);
    container.appendChild(li);
  }
}

// Simple HTML escaping helper to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
