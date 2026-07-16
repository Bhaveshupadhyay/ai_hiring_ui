import { getJobs, updateJobStatus, deleteJob, getJobApplicantsCount } from './api.js';
import { showToast, showConfirm, showLoader, initSidebar } from './utils.js';
import { initAnalytics, trackEvent } from './analytics.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize responsive sidebar drawer
  initSidebar();
  
  // Initialize Google Analytics
  initAnalytics();
  
  // Load and render page data
  await loadDashboardData();
});

/**
 * Load job postings and applicant counts, update metrics, and render list.
 */
async function loadDashboardData() {
  showLoader(true);
  try {
    const jobs = await getJobs();
    
    // Fetch applicant count for each job in parallel
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        try {
          const applicantRes = await getJobApplicantsCount(job.id);
          return { ...job, applicantCount: applicantRes.count };
        } catch (err) {
          console.error(`Failed to load applicant count for job ${job.id}:`, err);
          return { ...job, applicantCount: 0 };
        }
      })
    );

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

  jobs.forEach((job, index) => {
    const row = document.createElement('tr');
    
    // Determine status badge class
    let badgeClass = 'badge-draft';
    if (job.status === 'open') badgeClass = 'badge-open';
    if (job.status === 'closed') badgeClass = 'badge-closed';

    row.innerHTML = `
      <td data-label="#" class="col-shrink font-semibold">${index + 1}</td>
      <td data-label="Job Title">
        <a href="applications.html?jobId=${job.id}" class="job-title-cell nav-link-inner" style="color: var(--primary); text-decoration: none; font-weight: 600;">
          ${escapeHtml(job.title)}
        </a>
      </td>
      <td data-label="Total Applicants">
        <span class="font-medium">${job.applicantCount}</span>
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
