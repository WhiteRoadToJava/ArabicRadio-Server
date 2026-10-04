const SERVICES = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
];


const USER_AGENT = "ArabicRadioApp/0.1"

async function request(path, params){
    const query = new URLSearchParams(params).toString();
    let lastError;

    for (const server of SERVICES) {
        const url = `${server}${path}?${query}`;
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(20000)
            });
            if (!response.ok){
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Server failed: ${server} - ${error.message}`);
            lastError = error;
        }
    }
    throw new Error(`All Radio Browser servers failed. Last error: ${lastError?.message}`);
}

export async function  fetchStationsByLanguage(language) {
    return request("/json/stations/search", { 
        language,
        hidebroken: true,
        order: 'votes',
        reverse: true,
        limit: 100000,
    });
}