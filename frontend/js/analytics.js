// Google Analytics 4 Measurement ID
export const GA_MEASUREMENT_ID = 'G-LG58Z32SR2'; // REPLACE WITH YOUR ACTUAL GOOGLE MEASUREMENT ID

/**
 * Dynamically loads and initializes Google Analytics 4 (GA4)
 */
export function initAnalytics() {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    console.warn('[Analytics] Google Analytics Measurement ID is using placeholder G-XXXXXXXXXX. Configure GA_MEASUREMENT_ID with your actual ID to start tracking.');
    return;
  }

  // Check if already injected
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
    return;
  }

  try {
    // 1. Inject the script tag for gtag.js
    const scriptTag = document.createElement('script');
    scriptTag.async = true;
    scriptTag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(scriptTag);

    // 2. Inject the initialization script
    const initScript = document.createElement('script');
    initScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(initScript);
    console.log('[Analytics] Google Analytics successfully loaded for ID:', GA_MEASUREMENT_ID);
  } catch (error) {
    console.error('[Analytics] Failed to initialize Google Analytics:', error);
  }
}

/**
 * Track custom events in Google Analytics 4
 * @param {string} eventName - e.g., 'job_created', 'candidate_uploaded', 'application_status_changed'
 * @param {Object} props - Metadata associated with the event
 */
export function trackEvent(eventName, props = {}) {
  // Always log in development environments
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.debug(`[Analytics Dev] Tracked Event: "${eventName}"`, props);
  }

  // Send to Google Analytics if available
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, props);
  }
}
