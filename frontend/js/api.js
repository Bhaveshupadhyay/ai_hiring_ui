/**
 * Reusable dynamic API layer that consumes openapi.json.
 * DO NOT hardcode endpoints; all URLs, methods, and structures are verified via the schema.
 */

let openapiSchema = null;

// Determine backend base url
const getBaseUrl = () => {
  return 'https://ai-hiring-95i2.onrender.com';
};

const BASE_URL = getBaseUrl();

/**
 * Load openapi.json schema from cache or fetch from host
 */
async function loadSchema() {
  if (openapiSchema) return openapiSchema;

  const pathsToTry = [
    '/openapi.json',
    '../openapi.json',
    '../../openapi.json',
    './openapi.json',
    `${BASE_URL}/openapi.json`
  ];

  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        openapiSchema = await response.json();
        console.log(`OpenAPI schema loaded successfully from ${path}`);
        return openapiSchema;
      }
    } catch (e) {
      // Suppress error and try next fallback
    }
  }

  throw new Error("Unable to load openapi.json from standard paths. Please verify API is running.");
}

/**
 * Helper to make a schema-verified request to the API
 */
async function request(operationId, pathParams = {}, queryParams = {}, body = null) {
  const schema = await loadSchema();

  let matchedPath = null;
  let matchedMethod = null;
  let routeMeta = null;

  // Find the endpoint by operationId
  for (const [path, pathItem] of Object.entries(schema.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (operation.operationId === operationId) {
        matchedPath = path;
        matchedMethod = method.toUpperCase();
        routeMeta = operation;
        break;
      }
    }
    if (matchedPath) break;
  }

  if (!matchedPath) {
    throw new Error(`API operation '${operationId}' is not defined in the schema.`);
  }

  // Construct URL replacing path params (e.g. {id})
  let url = matchedPath;
  for (const [key, value] of Object.entries(pathParams)) {
    url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
  }

  // Append Query parameters
  const urlSearch = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      urlSearch.append(key, String(value));
    }
  }

  const queryStr = urlSearch.toString();
  const finalUrl = `${BASE_URL}${url}${queryStr ? '?' + queryStr : ''}`;

  const options = {
    method: matchedMethod,
    headers: {}
  };

  // Set Request Body
  if (body) {
    if (body instanceof FormData) {
      // Browser automatically sets Content-Type to multipart/form-data with boundaries
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(finalUrl, options);

  // Status code validation
  if (res.status === 204) {
    return null;
  }

  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    if (data && typeof data === 'object') {
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          // Parse FastAPI ValidationError: [{loc: [...], msg: "...", type: "..."}]
          errorMsg = data.detail.map(err => {
            const locPath = err.loc ? err.loc.join('.') : '';
            return `${locPath ? locPath + ': ' : ''}${err.msg}`;
          }).join(', ');
        } else {
          errorMsg = String(data.detail);
        }
      } else if (data.message) {
        errorMsg = data.message;
      }
    }
    const apiError = new Error(errorMsg);
    apiError.status = res.status;
    apiError.data = data;
    throw apiError;
  }

  return data;
}

// -------------------------------------------------------------
// EXPOSED API METHODS
// -------------------------------------------------------------

/**
 * Retrieve all job postings
 */
export async function getJobs() {
  return request('get_jobs_api_v1_jobs_get');
}

/**
 * Fetch a single job description by ID
 */
export async function getJob(id) {
  return request('get_job_api_v1_jobs__id__get', { id });
}

/**
 * Manually create a job
 */
export async function createJob(jobData) {
  return request('create_job_api_v1_jobs_post', {}, {}, jobData);
}

/**
 * Generate job draft description using AI (Gemini)
 */
export async function generateJobDescription(title) {
  return request('generate_job_description_api_v1_jobs_generate_post', {}, {}, { title });
}

/**
 * Update an existing job description
 */
export async function updateJob(id, jobData) {
  return request('update_job_api_v1_jobs__id__put', { id }, {}, jobData);
}

/**
 * Delete a job posting
 */
export async function deleteJob(id) {
  return request('delete_job_api_v1_jobs__id__delete', { id });
}

/**
 * Update status of job post (draft, open, closed)
 */
export async function updateJobStatus(id, status) {
  return request('update_job_status_api_v1_jobs__id__status_post', { id }, {}, { status });
}

/**
 * Fetch candidate applicants count for a job
 */
export async function getJobApplicantsCount(id) {
  return request('get_job_applicants_count_api_v1_jobs__id__applicants_count_get', { id });
}

/**
 * Upload candidate PDF resume and match to job
 */
export async function uploadResume(jobId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('upload_resume_api_v1_resume_upload_post', {}, { job_id: jobId }, formData);
}

/**
 * List all job applications
 */
export async function getApplications(jobId = null, status = null, sortByScore = false) {
  const query = {};
  if (jobId) query.job_id = jobId;
  if (status) query.status = status;
  if (sortByScore) query.sort_by_score = sortByScore;
  return request('get_applications_api_v1_applications_get', {}, query);
}

/**
 * Review application decision (approved/rejected)
 */
export async function reviewApplication(id, hmDecision) {
  return request('review_application_api_v1_applications__id__patch', { id }, {}, { hm_decision: hmDecision });
}

/**
 * Update candidate application status (shortlisted, rejected, interviewing, etc.)
 */
export async function updateApplicationStatus(id, status) {
  return request('update_application_status_api_v1_applications__id__status_post', { id }, {}, { status });
}

/**
 * Schedule a new interview
 */
export async function scheduleInterview(interviewData) {
  return request('schedule_interview_api_v1_interviews_post', {}, {}, interviewData);
}

/**
 * Get all scheduled interviews
 */
export async function getInterviews() {
  return request('get_interviews_api_v1_interviews_get');
}

/**
 * Get single candidate detailed resume analysis
 */
export async function getCandidate(id) {
  return request('get_candidate_api_v1_candidate__id__get', { id });
}
