let networkLogs = [];

async function sendRequestWithSmallestN() {
    if (networkLogs.length === 0) return null;

    const requestWithSmallestN = networkLogs.reduce((minLog, currentLog) => {
        const currentN = parseInt(new URL(currentLog.url).searchParams.get("n"));
        const minN = parseInt(new URL(minLog.url).searchParams.get("n"));
        return currentN < minN ? currentLog : minLog;
    });

    const headersObject = requestWithSmallestN.requestHeaders.reduce((acc, header) => {
        acc[header.name] = header.value;
        return acc;
    }, {});

    try {
        const response = await fetch(requestWithSmallestN.url, {
            method: requestWithSmallestN.method,
            headers: new Headers(headersObject)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error sending smallest `n` request:", error);
        return null;
    }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        console.log('Request captured:', details);
        console.log('Request headers:', details.requestHeaders);

        networkLogs.push({
            url: details.url,
            timestamp: details.timeStamp,
            method: details.method,
            type: details.type,
            requestHeaders: details.requestHeaders
        });
    },
    { 
        urls: ["https://outlook.office365.com/owa/service.svc?action=GetAccessTokenforResource*"] 
    },
    ["requestHeaders", "extraHeaders"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getNetworkLogs") {
        sendRequestWithSmallestN().then((data) => {
            sendResponse({ logs: data });
        }).catch(error => sendResponse({logs: error}));
        return true;
    }
});
