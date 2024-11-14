let accessToken = "";

document.getElementById('viewLogs').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "getNetworkLogs" }, (response) => {
        const logsOutput = document.getElementById('logsOutput');
        logsOutput.innerHTML = "";
        accessToken = response.logs.AccessToken;
        const logEntry = document.createElement('div');
        logEntry.textContent = `Log ${1}: ${accessToken}`;
        logsOutput.appendChild(logEntry);
    });
  });
  