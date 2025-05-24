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

async function makeApiRequest(method, data = null, path = '', params = {}) {
    const token = await readAccessToken();

    const query = new URLSearchParams(params).toString();
    const url = `/services/apexrest/onboarding${path}${query ? '?' + query : ''}`;

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();
    console.log('api result', JSON.stringify(result));

    if (!response.ok) {
        let message = result != null ? result.message : 'API request failed'
        throw new Error(message);
    }

    return result;
}

/**
 * Get all existing elevators
 * @returns {Promise<Object>}
 */
async function getOnboardingData(params) {
    const result = await makeApiRequest('GET', null, '', params);
    return result;
}





export { 
    getOnboardingData
};





