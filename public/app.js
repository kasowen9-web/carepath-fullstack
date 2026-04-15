const state = {
  patients: [],
  tasks: []
};

function byId(id) {
  return document.getElementById(id);
}

async function getJSON(url) {
  const res = await fetch(url);
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

// NAVIGATION
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    byId(btn.dataset.view + "-view").classList.add("active");
  });
});

// RENDER PATIENTS
function renderPatients(patients) {
  byId("patient-rows").innerHTML = patients.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.computed.status}</td>
      <td>${p.computed.reason}</td>
      <td>${p.dischargeDate || "-"}</td>
    </tr>
  `).join("");

  byId("patientId").innerHTML = patients.map(p =>
    `<option value="${p.id}">${p.name}</option>`
  ).join("");

  if (patients.length) {
    renderMedicationQuestions(patients[0].id);
  }
}

// MED QUESTIONS
function renderMedicationQuestions(patientId) {
  const patient = state.patients.find(p => p.id === patientId);
  const meds = patient?.criticalMeds || [];

  const container = byId("medication-questions");

  container.innerHTML = meds.length
    ? meds.map(m => `
      <label>${m}
        <select class="med" data-name="${m}">
          <option>Yes</option>
          <option>No</option>
        </select>
      </label>
    `).join("")
    : "<p>No medications listed</p>";
}

// REFRESH DATA
async function refresh() {
  const patients = await getJSON("/api/patients");
  const tasks = await getJSON("/api/tasks");

  state.patients = patients;
  state.tasks = tasks;

  renderPatients(patients);

  byId("task-list").innerHTML = tasks.map(t => `
    <div>
      <strong>${t.patientId}</strong> - ${t.reason}
    </div>
  `).join("");
}

// CHECKIN
byId("checkin-form").addEventListener("submit", async e => {
  e.preventDefault();

  const meds = {};
  document.querySelectorAll(".med").forEach(m => {
    meds[m.dataset.name] = m.value;
  });

  await postJSON("/api/checkins", {
    patientId: byId("patientId").value,
    weight: byId("weight").value,
    medResponses: meds,
    shortnessOfBreath: byId("shortnessOfBreath").value,
    swelling: byId("swelling").value,
    dizziness: byId("dizziness").value,
    chestPain: byId("chestPain").value
  });

  alert("Check-in submitted");
  refresh();
});

// ENROLL
byId("enroll-form").addEventListener("submit", async e => {
  e.preventDefault();

  await postJSON("/api/patients", {
    name: byId("enrollName").value,
    phone: byId("enrollPhone").value,
    diagnosis: byId("enrollDiagnosis").value,
    dischargeDate: byId("enrollDischargeDate").value,
    baselineWeight: byId("enrollBaselineWeight").value,
    criticalMeds: byId("enrollCriticalMeds").value,
    assignedNurse: byId("enrollAssignedNurse").value,
    provider: byId("enrollProvider").value
  });

  alert("Patient added");
  refresh();
});

byId("patientId").addEventListener("change", e => {
  renderMedicationQuestions(e.target.value);
});

refresh();
