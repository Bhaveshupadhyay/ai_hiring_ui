import { getJob, uploadResume } from './api.js';
import { showToast, showLoader, getQueryParam, formatDate } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initUploadFlow();
});

async function initUploadFlow() {
  const jobId = getQueryParam('jobId');
  const errorCard = document.getElementById('candidate-error-card');
  const errorTitle = document.getElementById('candidate-error-title');
  const errorDesc = document.getElementById('candidate-error-desc');
  
  const jobDetailsSection = document.getElementById('job-details-section');
  const uploadCard = document.getElementById('upload-card');

  // Verify Job ID
  if (!jobId) {
    jobDetailsSection.style.display = 'none';
    uploadCard.classList.add('hidden');
    errorCard.classList.remove('hidden');
    errorTitle.textContent = 'Invalid Application Link';
    errorDesc.textContent = 'No job posting was specified. Please check the URL and try again.';
    return;
  }

  showLoader(true);
  try {
    const job = await getJob(jobId);
    
    // Check if job is accepting applications (must be status = open)
    if (job.status !== 'open') {
      jobDetailsSection.style.display = 'none';
      uploadCard.classList.add('hidden');
      errorCard.classList.remove('hidden');
      errorTitle.textContent = 'Job Posting Closed';
      errorDesc.textContent = `The posting for "${job.title}" is no longer accepting new candidate applications.`;
      return;
    }

    // Populate Job details UI
    document.getElementById('job-title-display').textContent = job.title;
    document.getElementById('job-exp-display').textContent = job.experience_required ? `Experience: ${job.experience_required}` : 'Experience: All levels welcome';
    document.getElementById('job-edu-display').textContent = job.education ? `Education: ${job.education}` : 'Education: Open';
    document.getElementById('job-date-display').textContent = `Posted on ${formatDate(job.created_at)}`;
    
    document.getElementById('job-summary-display').textContent = job.summary || '';
    document.getElementById('job-responsibilities-display').textContent = job.responsibilities || '';
    document.getElementById('job-requirements-display').textContent = job.requirements || '';

    if (job.nice_to_have) {
      document.getElementById('job-nice-to-have-wrapper').style.display = 'block';
      document.getElementById('job-nice-to-have-display').textContent = job.nice_to_have;
    }

    jobDetailsSection.style.display = 'block';
    
  } catch (error) {
    console.error('Failed to load job details for candidate page:', error);
    jobDetailsSection.style.display = 'none';
    uploadCard.classList.add('hidden');
    errorCard.classList.remove('hidden');
    errorTitle.textContent = 'Job Posting Unavailable';
    errorDesc.textContent = 'The requested job listing could not be found or has been removed.';
    showLoader(false);
    return;
  }
  showLoader(false);

  // File Upload Drag & Drop and click handlers
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const fileCard = document.getElementById('file-display-card');
  const fileNameLabel = document.getElementById('selected-file-name');
  const removeBtn = document.getElementById('btn-remove-file');
  const submitBtn = document.getElementById('btn-submit-resume');
  const errorAlert = document.getElementById('upload-error-alert');
  const errorMessage = document.getElementById('upload-error-message');

  let selectedFile = null;

  // File selection helper
  const handleFileSelect = (file) => {
    errorAlert.classList.add('hidden');
    
    if (!file) return;

    // Validate type (must be PDF)
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      showToast('Invalid File', 'Only PDF resumes are accepted.', 'error');
      return;
    }

    // Validate size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File Too Large', 'Please upload a PDF file smaller than 10MB.', 'error');
      return;
    }

    selectedFile = file;
    fileNameLabel.textContent = file.name;
    
    // UI adjustment
    fileCard.classList.remove('hidden');
    dropzone.style.display = 'none';
    submitBtn.disabled = false;
  };

  // Click on dropzone triggers file picker
  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Drag over events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });

  // Handle drop event
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
      handleFileSelect(dt.files[0]);
    }
  });

  // Remove selected file handler
  removeBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    
    // UI adjustment
    fileCard.classList.add('hidden');
    dropzone.style.display = 'flex';
    submitBtn.disabled = true;
  });

  // Submit resume handler
  const form = document.getElementById('resume-upload-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Uploading & Analyzing...';
    
    errorAlert.classList.add('hidden');
    showLoader(true);

    try {
      await uploadResume(jobId, selectedFile);
      
      showToast('Submitted!', 'Your application has been received successfully.', 'success');
      
      // Show success screen, hide upload controls
      uploadCard.classList.add('hidden');
      document.getElementById('success-screen').classList.remove('hidden');
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Resume upload error:', error);
      
      // Display error banner
      errorAlert.classList.remove('hidden');
      errorMessage.textContent = error.message || 'An error occurred during upload. Please verify the PDF is valid and you have not already applied.';
      
      // Reset button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;

      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      showLoader(false);
    }
  });
}
