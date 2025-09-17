import getAccessToken from '@salesforce/apex/AuthOnboarding.authorize';

function setLocalStorage(key, value) {
    localStorage.setItem(key, value);
}

function getLocalStorage(key) {
    return localStorage.getItem(key);
}

function isNull(token) {
    return !token || token === '' || token === 'null';
}

async function readAccessToken() {
    let accessToken = getLocalStorage('onboarding_accessToken');
    let expireTime = getLocalStorage('onboarding_expireTime');
    const now = new Date().getTime();

    // Check if token is missing or expired
    if (isNull(accessToken) || isNull(expireTime) || now > parseInt(expireTime)) {
        console.info('Authorizing...');

        try {
            accessToken = await getAccessToken();

            if (!isNull(accessToken)) {
                console.info('Authorized');
                // Set token and expire time (15 mins from now)
                const expiresAt = now + (15 * 60 * 1000); 
                setLocalStorage('onboarding_accessToken', accessToken);
                setLocalStorage('onboarding_expireTime', expiresAt.toString());
            }
        } catch (error) {
            console.error(error.body?.message ?? error);
            throw error;
        }
    }

    return accessToken;
}


/**
 * Make a request to the onboarding API
 * @param {string} method - The HTTP method to use
 * @param {Object} data - The data to send in the request body
 * @param {string} path - The path to append to the base URL
 * @param {Object} params - The query parameters to append to the URL
 * @param {Object} headers - The headers to send in the request
 */
async function makeApiRequest(method, data = null, path = '', params = {}, extraHeaders = {}) {
    const token = await readAccessToken();

    const query = new URLSearchParams(params).toString();
    const url = `/services/apexrest/onboarding${path}${query ? '?' + query : ''}`;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...extraHeaders
    };

    const options = {
        method,
        headers
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();
    console.log('api result', result);

    if (!response.ok) {
        let message = result != null ? result.message : 'API request failed'
        throw new Error(message);
    }

    return result;
}

/**
 * Get all existing elevators
 * @param {Object} extraHeaders - The headers to send in the request
 * @returns {Promise<Object>}
 */
async function getOnboardingData(extraHeaders) {
    const result = await makeApiRequest('GET', null, '', {}, extraHeaders);
    return result;
}

/**
 * Publish the onboarding data
 * @param {Object} data
 * @param {Object} extraHeaders
 * @returns {Promise<Object>}
 */
async function publishOnboardingData(data, extraHeaders) {
    const result = await makeApiRequest('POST', data, '', {}, extraHeaders);
    return result;
}

/**
 * Upload CSV data
 * @param {Object} data
 * @param {Object} extraHeaders
 * @returns {Promise<Object>}
 */
async function uploadCsvData(data, extraHeaders) {
    const result = await makeApiRequest('POST', data, '', {}, extraHeaders);
    return result;
}

/**
 * Get user info
 * @param {Object} extraHeaders
 * @returns {Promise<Object>}
 */
async function getUserInfo(extraHeaders) {
    const result = await makeApiRequest('GET', null, '', {}, extraHeaders);
    return result;
}



export { 
    getOnboardingData,
    publishOnboardingData,
    uploadCsvData,
    getUserInfo
};