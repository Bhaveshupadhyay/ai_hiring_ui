import { getJobs, updateJobStatus, deleteJob } from './api.js';
import { showToast, showConfirm, showLoader, initSidebar } from './utils.js';
import { initAnalytics, trackEvent } from './analytics.js';

let allJobsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize responsive sidebar drawer
  initSidebar();
  
  // Initialize Google Analytics
  initAnalytics();
  
  // Setup Search Input Filter
  setupSearchFilter();

  // Load and render page data
  await loadDashboardData();
});

/**
 * Setup live client-side search filtering on job title
 */
function setupSearchFilter() {
  const searchInput = document.getElementById('jobs-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = allJobsList.filter(j => j.title.toLowerCase().includes(query));
      renderJobsTable(filtered);
    });
  }
}

/**
 * Load job postings and applicant counts, update metrics, and render list.
 */
async function loadDashboardData() {
  showLoader(true);
  try {
    const jobs = await getJobs();
    
    // Map jobs to extract applicant count directly from the job response object
    const jobsWithCounts = jobs.map((job) => {
      const count = job.applicants_count !== undefined ? job.applicants_count : 0;
      return { ...job, applicantCount: count };
    });

    allJobsList = jobsWithCounts;

    // Update KPI Metrics
    document.getElementById('metric-total-jobs').textContent = jobs.length;

    // Render tables or empty state
    const tableContainer = document.getElementById('jobs-table-container');
    const emptyState = document.getElementById('jobs-empty-state');

    if (jobsWithCounts.length === 0) {
      tableContainer.classList.add('hidden');
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      tableContainer.classList.remove('hidden');
      renderJobsTable(jobsWithCounts);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Error Loading Data', error.message || 'Unable to retrieve jobs from backend.', 'error');
  } finally {
    showLoader(false);
  }
}

/**
 * Render job table body rows
 */
function renderJobsTable(jobs) {
  const tableBody = document.getElementById('jobs-table-body');
  tableBody.innerHTML = '';

  if (jobs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No matching job postings found.
        </td>
      </tr>
    `;
    return;
  }

  jobs.forEach((job, index) => {
    const row = document.createElement('tr');
    
    // Determine status badge class
    let badgeClass = 'badge-draft';
    if (job.status === 'open') badgeClass = 'badge-open';
    if (job.status === 'closed') badgeClass = 'badge-closed';

    row.innerHTML = `
      <td data-label="#" class="col-shrink font-semibold mono-font">${index + 1}</td>
      <td data-label="Job Title">
        <a href="applications.html?jobId=${job.id}" class="job-title-cell" style="display: inline-flex; align-items: center; gap: 8px;">
          <i class="fas fa-briefcase" style="font-size: 13px; opacity: 0.7;"></i>
          ${escapeHtml(job.title)}
        </a>
      </td>
      <td data-label="Total Applicants">
        <span class="mono-font" style="font-weight: 700; color: var(--text-main);">${job.applicantCount}</span>
      </td>
      <td data-label="Status">
        <span class="badge ${badgeClass}">${job.status}</span>
      </td>
      <td class="action-cell">
        <div class="action-buttons">
          <a href="candidate-upload.html?jobId=${job.id}" target="_blank" class="btn-icon" title="View Application Form" aria-label="View Candidate Form">
            <i class="fas fa-external-link-alt"></i>
          </a>
          <a href="edit-job.html?id=${job.id}" class="btn-icon" title="Edit Job Posting" aria-label="Edit Job">
            <i class="fas fa-edit"></i>
          </a>
          ${job.status !== 'closed' ? `
            <button class="btn-icon btn-close-job" data-id="${job.id}" title="Close Job (Set Inactive)" aria-label="Close Job">
              <i class="fas fa-ban"></i>
            </button>
          ` : ''}
          <button class="btn-icon btn-icon-danger btn-delete-job" data-id="${job.id}" title="Delete Job Posting" aria-label="Delete Job">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Attach button action event listeners
  tableBody.querySelectorAll('.btn-close-job').forEach(btn => {
    btn.addEventListener('click', handleCloseJob);
  });

  tableBody.querySelectorAll('.btn-delete-job').forEach(btn => {
    btn.addEventListener('click', handleDeleteJob);
  });
}

/**
 * Close Job Post Action Handler
 */
async function handleCloseJob(e) {
  const jobId = e.currentTarget.dataset.id;
  
  const confirmed = await showConfirm({
    title: 'Close Job Posting?',
    message: 'Are you sure you want to close this job post? Candidates will no longer be able to submit applications for this job.',
    confirmText: 'Close Job',
    cancelText: 'Keep Open',
    isDanger: true
  });

  if (!confirmed) return;

  showLoader(true);
  try {
    await updateJobStatus(jobId, 'closed');
    showToast('Job Closed', 'The job status has been set to closed.', 'success');
    trackEvent('job_closed', { job_id: jobId });
    await loadDashboardData();
  } catch (error) {
    console.error('Failed to close job:', error);
    showToast('Failed to Close Job', error.message || 'Server error occurred.', 'error');
  } finally {
    showLoader(false);
  }
}

/**
 * Delete Job Post Action Handler
 */
async function handleDeleteJob(e) {
  const jobId = e.currentTarget.dataset.id;

  const confirmed = await showConfirm({
    title: 'Delete Job Posting?',
    message: 'Are you sure you want to delete this job posting permanently? This action cannot be undone and will delete all candidates and resume matches.',
    confirmText: 'Delete Permanently',
    cancelText: 'Cancel',
    isDanger: true
  });

  if (!confirmed) return;

  showLoader(true);
  try {
    await deleteJob(jobId);
    showToast('Job Deleted', 'The job listing has been permanently deleted.', 'success');
    trackEvent('job_deleted', { job_id: jobId });
    await loadDashboardData();
  } catch (error) {
    console.error('Failed to delete job:', error);
    showToast('Failed to Delete Job', error.message || 'Server error occurred.', 'error');
  } finally {
    showLoader(false);
  }
}

// Simple HTML escaping helper to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
