/** Where the full WCR report opens. The app's own copy (same origin, behind the same sign-in as the app) is used so
 *  the button never depends on which Google account the browser picks for storage.cloud.google.com (403 on stage).
 *  The data-lake copy gs://sagar-drishti-data/reports/WCR-MN-SM-DW-01.html stays the system of record. */
export const WCR_REPORT_URL = '/reports/WCR-MN-SM-DW-01.html';
export const WCR_DATA_LAKE_URL = 'https://storage.cloud.google.com/sagar-drishti-data/reports/WCR-MN-SM-DW-01.html';
