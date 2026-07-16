import { generateJobDescription, updateJob } from './api.js';
import { showToast, showLoader, copyToClipboard, initSidebar } from './utils.js';
import { initAnalytics, trackEvent } from './analytics.js';

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initAnalytics();
  initCreateJobFlow();
});

function initCreateJobFlow() {
  const form = document.getElementById('job-generator-form');
  const titleInput = document.getElementById('job-title');
  const promptInput = document.getElementById('job-requirements-prompt');
  
  const generateBtn = document.getElementById('btn-generate-ai');
  const confirmBtn = document.getElementById('btn-confirm-post');
  const editableSection = document.getElementById('editable-fields-section');

  let draftJobId = null;

  // Track if AI generation was done
  generateBtn.addEventListener('click', async () => {
    // Basic title validation
    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      showToast('Title Required', 'Please enter a job title first.', 'error');
      titleInput.focus();
      return;
    }

    const contextVal = promptInput.value.trim();

    // Disable inputs and show loading state on generate button
    generateBtn.disabled = true;
    titleInput.disabled = true;
    promptInput.disabled = true;
    
    const originalBtnHtml = generateBtn.innerHTML;
    generateBtn.innerHTML = '<span class="spinner"></span> Generating description...';

    try {
      // Package prompt context in the title param since the API schema only takes 'title'
      const generationTitle = contextVal 
        ? `${titleVal} (Preferred Skills/Details: ${contextVal})` 
        : titleVal;

      const jobResponse = await generateJobDescription(generationTitle);
      
      draftJobId = jobResponse.id;
      trackEvent('ai_job_generated', { title: titleVal });

      // Populate form fields with the AI response
      document.getElementById('job-summary').value = jobResponse.summary || '';
      document.getElementById('job-responsibilities').value = jobResponse.responsibilities || '';
      document.getElementById('job-requirements').value = jobResponse.requirements || '';
      document.getElementById('job-nice-to-have').value = jobResponse.nice_to_have || '';
      document.getElementById('job-experience').value = jobResponse.experience_required || '';
      document.getElementById('job-education').value = jobResponse.education || '';

      // Set the Title input back to what the user typed (in case backend returned modified title)
      titleInput.value = jobResponse.title || titleVal;

      // Show the editable section and enable publication
      editableSection.classList.remove('hidden');
      confirmBtn.disabled = false;

      showToast('Generated!', 'AI has generated the job description. Please review and edit details below.', 'success');
    } catch (error) {
      console.error('AI Generation failed:', error);
      showToast('Generation Failed', error.message || 'The AI service was unable to generate description.', 'error');
      
      // Re-enable in case of failure
      titleInput.disabled = false;
      promptInput.disabled = false;
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalBtnHtml;
    }
  });

  // Handle form submission (Confirm & Publish)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!draftJobId) {
      showToast('Validation Error', 'Please generate the job posting with AI first.', 'error');
      return;
    }

    confirmBtn.disabled = true;
    showLoader(true);

    // Collect updated form values
    const updatedJobData = {
      title: titleInput.value.trim(),
      summary: document.getElementById('job-summary').value.trim(),
      responsibilities: document.getElementById('job-responsibilities').value.trim(),
      requirements: document.getElementById('job-requirements').value.trim(),
      nice_to_have: document.getElementById('job-nice-to-have').value.trim(),
      experience_required: document.getElementById('job-experience').value.trim(),
      education: document.getElementById('job-education').value.trim(),
      status: 'open' // Publish immediately
    };

    try {
      const publishedJob = await updateJob(draftJobId, updatedJobData);
      showToast('Published!', 'Your job posting is now live.', 'success');
      trackEvent('job_published', { job_id: publishedJob.id, title: updatedJobData.title });
      
      // Show Success Card and hide Form
      document.getElementById('create-job-card').classList.add('hidden');
      
      const successCard = document.getElementById('success-card');
      successCard.classList.remove('hidden');
      
      document.getElementById('success-job-id').textContent = publishedJob.id;
      
      // Construct public upload URL dynamically
      const candidateUrl = `${window.location.origin}${window.location.pathname.replace('create-job.html', 'candidate-upload.html')}?jobId=${publishedJob.id}`;
      
      const linkPlaceholder = document.getElementById('candidate-link-placeholder');
      linkPlaceholder.textContent = candidateUrl;

      // Handle Copy button
      const copyBtn = document.getElementById('btn-copy-link');
      copyBtn.onclick = () => copyToClipboard(candidateUrl);

    } catch (error) {
      console.error('Failed to publish job:', error);
      showToast('Publish Failed', error.message || 'Server error occurred while saving job details.', 'error');
      confirmBtn.disabled = false;
    } finally {
      showLoader(false);
    }
  });
}
