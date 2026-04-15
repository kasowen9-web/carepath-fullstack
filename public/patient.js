
let currentPatient = null;

function byId(id) {
  return document.getElementById(id);
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json();
}

function renderMedicationQuestions(patient) {
  const container = byId("medication-questions");
  const meds = Array.isArray(patient.criticalMeds) ? patient.criticalMeds : [];

  if (!meds.length) {
    container.innerHTML = `
      <div class="patient-med-card">
        <p>No medications listed for today.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="patient-med-card">
      <h4>Your medications</h4>
      ${meds.map((med) => `
        <label>
          Did you take ${med} today?
          <select class="med-response" data-med-name="${med}">
            <option>Yes</option>
            <option>No</option>
          </select>
        </label>
      `).join("")}
    </div>
  `;
}

function getPatientIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("patientId");
}

async function loadPatient() {
  try {
    const patients = await getJSON("/api/patients");
    if (!Array.isArray(patients) || !patients.length) {
      throw new Error("No patients found.");
    }

    const requestedPatientId = getPatientIdFromUrl();
    currentPatient =
      patients.find((p) => p.id === requestedPatientId) ||
      patients[0];

    byId("patient-name").textContent = currentPatient.name;
    byId("patient-diagnosis").textContent = currentPatient.diagnosis || "Care plan check-in";

    renderMedicationQuestions(currentPatient);

    byId("patient-loading").style.display = "none";
    byId("patient-content").style.display = "block";
  } catch (error) {
    byId("patient-loading").style.display = "none";
    byId("patient-error").style.display = "block";
    byId("patient-error").textContent = "We could not load your check-in right now.";
    console.error(error);
  }
}

byId("patient-checkin-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentPatient) return;

  const medResponses = {};
  document.querySelectorAll(".med-response").forEach((select) => {
    medResponses[select.dataset.medName] = select.value;
  });

  try {
    const response = await postJSON("/api/checkins", {
      patientId: currentPatient.id,
      weight: byId("weight").value,
      medResponses,
      shortnessOfBreath: byId("shortnessOfBreath").value,
      swelling: byId("swelling").value,
      dizziness: byId("dizziness").value,
      chestPain: byId("chestPain").value
    });

    byId("patient-checkin-form").style.display = "none";
    byId("patient-success").style.display = "block";
    byId("patient-success-detail").textContent =
      `Your care team has been updated. Current status: ${response.status.status}.`;
  } catch (error) {
    byId("patient-error").style.display = "block";
    byId("patient-error").textContent = "Your check-in could not be submitted. Please try again.";
    console.error(error);
  }
});

loadPatient();
