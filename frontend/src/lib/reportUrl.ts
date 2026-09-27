/** Where the full WCR report lives. The data lake bucket (gs://sagar-drishti-data, ASIA) is the system of record;
 *  storage.cloud.google.com opens it in the browser for a signed-in user with read access (same account as the app).
 *  The in-app copy at /reports/WCR-MN-SM-DW-01.html stays as an offline fallback. */
export const WCR_REPORT_URL = 'https://storage.cloud.google.com/sagar-drishti-data/reports/WCR-MN-SM-DW-01.html';
