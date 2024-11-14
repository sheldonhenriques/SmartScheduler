let accessToken = "";

async function fetchMeetingSuggestions() {
  try {
    accessToken = await getAccessToken();

    const formData = getFormData();

    const apiResponse = await fetchTimeSuggestions(formData, accessToken);

    handleApiResponse(apiResponse);
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("logsOutput").innerText = `An error occurred while fetching time suggestions: ${error.message}`;
  }
}

async function getAccessToken() {
  const response = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "getNetworkLogs" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(response);
      }
    });
  });
  return response.logs.AccessToken;
}

function getFormData() {
  return {
    organizer: document.getElementById("organizer").value,
    requiredAttendees: document.getElementById("requiredAttendees").value.split(','),
    optionalAttendees: document.getElementById("optionalAttendees").value.split(','),
    meetingDuration: document.getElementById("meetingDuration").value,
    searchStartTime: document.getElementById("searchStartTime").value,
    searchEndTime: document.getElementById("searchEndTime").value,
    restrictSuggestionsToWorkHours: document.getElementById("restrictSuggestionsToWorkHours").checked,
    suggestionsResultTimeZone: document.getElementById("suggestionsResultTimeZone").value
  };
}

function displayFormData(formData) {
  document.getElementById("logsOutput").innerText = `
    Organizer: ${formData.organizer}
    Required Attendees: ${formData.requiredAttendees.join(", ")}
    Optional Attendees: ${formData.optionalAttendees.join(", ")}
    Meeting Duration: ${formData.meetingDuration} minutes
    Search Start Time: ${formData.searchStartTime}
    Search End Time: ${formData.searchEndTime}
    Restrict to Work Hours: ${formData.restrictSuggestionsToWorkHours}
    Timezone: ${formData.suggestionsResultTimeZone}
    accessToken: ${accessToken}
  `;
}

async function fetchTimeSuggestions(formData, accessToken) {
  const response = await fetch("https://outlook.office365.com/ows/beta/OutlookMeetingPolls/GetLegacyTimeSuggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify(formData)
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Time Suggestions:", data);
    return data;
  } else {
    const errorText = await response.text();
    console.error("Error:", errorText);
    throw new Error(`An error occurred while fetching time suggestions: ${errorText}`);
  }
}

function handleApiResponse(data) {
    const calendarEl = document.getElementById("calendar");
    
    if (!calendarEl) {
      console.error("Calendar element not found in DOM");
      return;
    }
  
    calendarEl.innerHTML = "";
    
    const startOfWeek = new Date(data.TimeSuggestions[0].StartTime); 
    const daysOfWeek = 7;
  
    data.TimeSuggestions.sort((a, b) => new Date(a.StartTime) - new Date(b.StartTime));
    
    function getColorClass(conflicts) {
      if (conflicts === 0) return 'no-conflicts';
      if (conflicts === 1) return 'low-conflicts';
      return 'high-conflicts';
    }
    
    for (let i = 0; i < daysOfWeek; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      const dayEl = document.createElement('div');
      dayEl.classList.add('day');
      dayEl.innerHTML = `<strong>${day.toDateString()}</strong>`;
      
      const daySuggestions = data.TimeSuggestions.filter(suggestion => 
        new Date(suggestion.StartTime).toDateString() === day.toDateString()
      );
      
      daySuggestions.forEach((suggestion) => {
        const startTime = new Date(suggestion.StartTime);
        const conflicts = suggestion.NumOfConflicts;
        const timeSlotEl = document.createElement('div');
        timeSlotEl.classList.add('time-slot', getColorClass(conflicts));
        timeSlotEl.textContent = `${startTime.getHours()}:${startTime.getMinutes().toString().padStart(2, '0')}`;
      const detailsEl = document.createElement('div');
      detailsEl.classList.add('time-slot-details');

      const requiredAttendees = suggestion.RequiredAttendees.filter(att => att.Email).length;
      const optionalAttendees = suggestion.OptionalAttendees.filter(att => att.Email).length;
      const NumOfConflicts = suggestion.NumOfConflicts;

      if (conflicts > 0) {
        let conflictsHTML = `<strong>${requiredAttendees + optionalAttendees - NumOfConflicts} Attendees for this meeting.</strong><br><strong>Conflicts:</strong><br>`;
        for (const [email, conflictDetails] of Object.entries(suggestion.Conflicts)) {
          conflictDetails.forEach(conflict => {
            conflictsHTML += `
              <u>${email}</u><br>
            `;
          });
        }
        detailsEl.innerHTML = conflictsHTML;
      } else {
        detailsEl.innerHTML = "No conflicts";
      }
      
      timeSlotEl.appendChild(detailsEl);
        dayEl.appendChild(timeSlotEl);
      });
  
      calendarEl.appendChild(dayEl);
    }
  }

document.addEventListener("DOMContentLoaded", function () {
  const meetingForm = document.getElementById("meetingForm");

  meetingForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    await fetchMeetingSuggestions();
  });
});