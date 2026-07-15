import { getJob, updateJob } from './api.js';
import { showToast, showLoader, getQueryParam, initSidebar } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  await loadJobDetails();
});

let jobId = null;

/**
 * Fetch job details using ID in URL parameters and populate edit form.
 */
async function loadJobDetails() {
  jobId = getQueryParam('id');
  if (!jobId) {
    showToast('Invalid Access', 'No job ID provided. Redirecting to dashboard...', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
  }

  showLoader(true);
  try {
    const job = await getJob(jobId);
    
    // Populate form
    document.getElementById('edit-job-title').value = job.title || '';
    document.getElementById('edit-job-status').value = job.status || 'draft';
    document.getElementById('edit-job-summary').value = job.summary || '';
    document.getElementById('edit-job-responsibilities').value = job.responsibilities || '';
    document.getElementById('edit-job-requirements').value = job.requirements || '';
    document.getElementById('edit-job-nice-to-have').value = job.nice_to_have || '';
    document.getElementById('edit-job-experience').value = job.experience_required || '';
    document.getElementById('edit-job-education').value = job.education || '';
  } catch (error) {
    console.error('Failed to load job details:', error);
    showToast('Error Loading Job', error.message || 'The requested job post could not be retrieved.', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2500);
  } finally {
    showLoader(false);
  }
}

// Handle Form Submit
const form = document.getElementById('edit-job-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!jobId) return;

  const btnSave = document.getElementById('btn-save-job');
  btnSave.disabled = true;
  showLoader(true);

  const jobData = {
    title: document.getElementById('edit-job-title').value.trim(),
    status: document.getElementById('edit-job-status').value,
    summary: document.getElementById('edit-job-summary').value.trim(),
    responsibilities: document.getElementById('edit-job-responsibilities').value.trim(),
    requirements: document.getElementById('edit-job-requirements').value.trim(),
    nice_to_have: document.getElementById('edit-job-nice-to-have').value.trim(),
    experience_required: document.getElementById('edit-job-experience').value.trim(),
    education: document.getElementById('edit-job-education').value.trim()
  };

  try {
    await updateJob(jobId, jobData);
    showToast('Changes Saved', 'The job posting has been successfully updated.', 'success');
    
    // Redirect after brief delay so toast can be seen
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } catch (error) {
    console.error('Failed to update job:', error);
    showToast('Update Failed', error.message || 'Server error occurred while updating job details.', 'error');
    btnSave.disabled = false;
  } finally {
    showLoader(false);
  }
});
