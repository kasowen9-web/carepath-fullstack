const state = {
  patients: [],
  tasks: [],
  selectedPatient: null
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

function setView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(v => v.classList.remove("active"));

  if (view === "dashboard") {
    byId("dashboard-view").classList.add("active");
    document.querySelector('[data-view="dashboard"]').classList.add("active");
    byId("view-title").textContent = "Nurse Dashboard";
    byId("view-subtitle").textContent = "Execution visibility after discharge";
  } else if (view === "patient-checkin") {
    byId("checkin-view").classList.add("active");
    document.querySelector('[data-view="patient-checkin"]').classList.add("active");
    byId("view-title").textContent = "Patient Daily Check-In";
    byId("view-subtitle").textContent = "Simple daily monitoring for CHF";
  } else {
    byId("enroll-view").classList.add("active");
    document.querySelector('[data-view="enroll-patient"]').classList.add("active");
    byId("view-title").textContent = "Enroll Patient";
    byId("view-subtitle").textContent = "Add a patient to the CarePath workflow";
  }
}

function renderSummary(summary) {
  byId("summary-cards").innerHTML = `
    <div class="card"><div class="label">Enrolled Patients</div><div class="value">${summary.totalPatients}</div></div>
    <div class="card"><div class="label">Red</div><div class="value">${summary.red}</div></div>
    <div class="card"><div class="label">Yellow</div><div class="value">${summary.yellow}</div></div>
    <div class="card"><div class="label">Completion Rate</div><div class="value">${summary.completionRate}</div></div>
  `;
}

function renderMedicationQuestions(patientId) {
  const patient = state.patients.find(p => p.id === patientId);
  const meds = Array.isArray(patient?.criticalMeds) ? patient.criticalMeds : [];
  const container = byId("medication-questions");

  if (!meds.length) {
    container.innerHTML = `<p style="margin-bottom:12px;color:#64748b;">No listed medications for this patient.</p>`;
    return;
  }

  container.innerHTML = `
    <h4 style="margin:0 0 12px 0;">Listed Medications</h4>
    ${meds.map(med => `
      <label>Did you take ${med} today?
        <select class="med-response" data-med-name="${med}">
          <option>Yes</option>
          <option>No</option>
        </select>
      </label>
    `).join("")}
  `;
}

function renderPatients(patients) {
  byId("patient-rows").innerHTML = patients.map(p => `
    <tr data-patient-id="${p.id}" class="patient-row" style="cursor:pointer;">
      <td><strong>${p.name}</strong><br><span style="color:#64748b">${p.diagnosis || "CHF"}</span></td>
      <td><span class="badge ${p.computed.status}">${p.computed.status}</span></td>
      <td>${p.computed.reason}</td>
      <td>${p.dischargeDate || "-"}</td>
    </tr>
  `).join("");

  const select = byId("patientId");
  select.innerHTML = patients.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

  if (patients.length) {
    renderMedicationQuestions(select.value);
  }

  document.querySelectorAll(".patient-row").forEach(row => {
    row.addEventListener("click", () => {
      const patientId = row.dataset.patientId;
      const patient = state.patients.find(p => p.id === patientId);
      if (patient) {
        state.selectedPatient = patient;
        renderPatientDetail(patient);
      }
    });
  });
}

function renderPatientDetail(patient) {
  const panel = byId("patient-detail-panel");
  const content = byId("patient-detail-content");

  const latest = patient.latestCheckin;
  const notes = patient.notes || [];
  const missedMeds = latest?.medResponses
    ? Object.entries(latest.medResponses)
        .filter(([, value]) => value === "No")
        .map(([med]) => med)
    : [];

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;">
      <div>
        <p><strong>Name:</strong> ${patient.name}</p>
        <p><strong>Diagnosis:</strong> ${patient.diagnosis || "-"}</p>
        <p><strong>Assigned Nurse:</strong> ${patient.assignedNurse || "-"}</p>
        <p><strong>Provider:</strong> ${patient.provider || "-"}</p>
      </div>
      <div>
        <p><strong>Baseline Weight:</strong> ${patient.baselineWeight || "-"}</p>
        <p><strong>Status:</strong> <span class="badge ${patient.computed.status}">${patient.computed.status}</span></p>
        <p><strong>Status Reason:</strong> ${patient.computed.reason}</p>
      </div>
    </div>

    <div style="margin-top:16px;">
      <h4 style="margin-bottom:8px;">Latest Check-In</h4>
      ${
        latest
          ? `
            <p><strong>Weight:</strong> ${latest.weight}</p>
            <p><strong>Shortness of Breath:</strong> ${latest.shortnessOfBreath}</p>
            <p><strong>Swelling:</strong> ${latest.swelling}</p>
            <p><strong>Dizziness:</strong> ${latest.dizziness}</p>
            <p><strong>Chest Pain:</strong> ${latest.chestPain}</p>
            <p><strong>Missed Medications:</strong> ${missedMeds.length ? missedMeds.join(", ") : "None"}</p>
          `
          : `<p>No check-in yet.</p>`
      }
    </div>

    <div style="margin-top:16px;">
      <h4 style="margin-bottom:8px;">Notes</h4>
      ${
        notes.length
          ? notes.map(n => `<p style="margin-bottom:8px;">• ${n.text}</p>`).join("")
          : `<p>No notes yet.</p>`
      }
    </div>
  `;

  panel.style.display = "block";
}

function patientName(id) {
  const p = state.patients.find(x => x.id === id);
  return p ? p.name : id;
}

function buildClinicalTaskStory(task) {
  const reason = String(task.reason || "");
  const parts = [];

  const medMatch = reason.match(/Missed medication:\s*([^,]+(?:,\s*[^,]+)*)/i);
  if (medMatch) {
    const meds = medMatch[1].split(",").map(s => s.trim()).filter(Boolean);
    meds.forEach(med => {
      const lower = med.toLowerCase();
      if (
        lower.includes("lasix") ||
        lower.includes("furosemide") ||
        lower.includes("bumex") ||
        lower.includes("bumetanide") ||
        lower.includes("torsemide")
      ) {
        parts.push(`Missed ${med} → risk of fluid overload`);
      } else {
        parts.push(`Missed ${med} → medication adherence risk`);
      }
    });
  }

  const weight24Match = reason.match(/Weight \+(\d+(\.\d+)?) lb \/ 24h/i);
  const weightBaselineMatch = reason.match(/Weight \+(\d+(\.\d+)?) lb \/ baseline/i);
  if (weight24Match || weightBaselineMatch) {
    const value = weight24Match ? weight24Match[1] : weightBaselineMatch[1];
    parts.push(`Weight increase (+${value} lb) → early CHF decompensation risk`);
  }

  if (/Severe shortness of breath|Moderate shortness of breath|Mild shortness of breath/i.test(reason)) {
    parts.push("Respiratory symptoms → worsening heart failure");
  }

  if (/Chest pain/i.test(reason)) {
    parts.push("Chest pain → urgent clinical evaluation needed");
  }

  if (!parts.length) {
    parts.push(reason || "Clinical review needed");
  }

  const uniqueParts = [...new Set(parts)];
  let headline = uniqueParts.join(" + ");

  if (uniqueParts.length > 1) {
    headline += " → high risk of CHF exacerbation";
  }

  return {
    headline,
    action: "Recommended Action: Nurse outreach within 24 hours"
  };
}

function renderTasks(tasks) {
  if (!tasks.length) {
    byId("task-list").innerHTML = "<div>No open tasks</div>";
    return;
  }

  byId("task-list").innerHTML = tasks.map(task => {
    const clinical = buildClinicalTaskStory(task);

    return `
      <div class="task">
        <strong>${patientName(task.patientId)}</strong>
        <span class="badge ${task.priority}">${task.priority}</span><br>
        <div style="margin-top:8px;"><strong>${clinical.headline}</strong></div>
        <div style="margin-top:6px;color:#475569;">${clinical.action}</div>
        <div class="task-actions">
          <button class="danger" onclick="closeTask('${task.id}')">Close Task</button>
          <button class="secondary" onclick="escalateTask('${task.id}')">Escalate to Provider</button>
          <button class="primary" onclick="addNoteToTask('${task.patientId}')">Add Note</button>
        </div>
      </div>
    `;
  }).join("");
}

async function closeTask(id) {
  await postJSON("/api/tasks/complete", { id });
  await refresh();
}

async function escalateTask(id) {
  await postJSON("/api/tasks/escalate", { id });
  await refresh();
}

async function addNoteToTask(patientId) {
  const text = window.prompt("Enter note");
  if (!text) return;

  await postJSON("/api/notes", {
    patientId,
    text
  });

  await refresh();
}

async function refresh() {
  const [summary, patients, tasks] = await Promise.all([
    getJSON("/api/summary"),
    getJSON("/api/patients"),
    getJSON("/api/tasks")
  ]);

  state.patients = patients;
  state.tasks = tasks.filter(t => t.status === "open");

  renderSummary(summary);
  renderPatients(patients);
  renderTasks(state.tasks);

  if (state.selectedPatient) {
    const updatedPatient = state.patients.find(p => p.id === state.selectedPatient.id);
    if (updatedPatient) {
      state.selectedPatient = updatedPatient;
      renderPatientDetail(updatedPatient);
    }
  }
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

byId("patientId").addEventListener("change", e => {
  renderMedicationQuestions(e.target.value);
});

byId("checkin-form").addEventListener("submit", async e => {
  e.preventDefault();

  const medResponses = {};
  document.querySelectorAll(".med-response").forEach(select => {
    medResponses[select.dataset.medName] = select.value;
  });

  const payload = {
    patientId: byId("patientId").value,
    weight: byId("weight").value,
    medResponses,
    shortnessOfBreath: byId("shortnessOfBreath").value,
    swelling: byId("swelling").value,
    dizziness: byId("dizziness").value,
    chestPain: byId("chestPain").value
  };

  const response = await postJSON("/api/checkins", payload);
  const result = byId("checkin-result");
  result.classList.add("show");
  result.textContent = `Thank you. Status: ${response.status.status}`;
  e.target.reset();
  await refresh();
  setView("dashboard");
});

byId("enroll-form").addEventListener("submit", async e => {
  e.preventDefault();

  const payload = {
    name: byId("enrollName").value,
    phone: byId("enrollPhone").value,
    diagnosis: byId("enrollDiagnosis").value,
    dischargeDate: byId("enrollDischargeDate").value,
    baselineWeight: byId("enrollBaselineWeight").value,
    criticalMeds: byId("enrollCriticalMeds").value,
    assignedNurse: byId("enrollAssignedNurse").value,
    provider: byId("enrollProvider").value
  };

  const response = await postJSON("/api/patients", payload);
  const result = byId("enroll-result");
  result.classList.add("show");
  result.textContent = `Patient added: ${response.patient.name}`;
  e.target.reset();
  await refresh();
  setView("dashboard");
});

refresh();
