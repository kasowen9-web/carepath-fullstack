const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data", "db.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadDb() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

const fileDb = loadDb();

const memoryDb = {
  patients: [],
  checkins: [],
  tasks: [],
  notes: []
};

function getDb() {
  return {
    patients: [...fileDb.patients, ...memoryDb.patients],
    checkins: [...fileDb.checkins, ...memoryDb.checkins],
    tasks: [...fileDb.tasks, ...memoryDb.tasks],
    notes: [...fileDb.notes, ...memoryDb.notes]
  };
}

function getMissedMeds(patient, latest) {
  const meds = Array.isArray(patient.criticalMeds) ? patient.criticalMeds : [];
  const responses = latest.medResponses || {};
  return meds.filter(med => responses[med] === "No");
}

function computeStatus(patient, checkins) {
  const latest = checkins
    .filter(c => c.patientId === patient.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  if (!latest) {
    return { status: "Yellow", reason: "No check-in yet" };
  }

  const patientHistory = checkins
    .filter(c => c.patientId === patient.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let weightChange24h = 0;
  let weightChangeBaseline = 0;

  if (patientHistory.length >= 2) {
    const prev = patientHistory[patientHistory.length - 2];
    weightChange24h = Number((latest.weight - prev.weight).toFixed(1));
  }

  if (patient.baselineWeight) {
    weightChangeBaseline = Number((latest.weight - patient.baselineWeight).toFixed(1));
  }

  const missedMeds = getMissedMeds(patient, latest);
  const missedAnyMedication = missedMeds.length > 0;
  const missedCriticalMedication = missedMeds.length > 0;

  if (
    latest.chestPain === "Yes" ||
    latest.shortnessOfBreath === "Severe" ||
    weightChange24h >= 3 ||
    weightChangeBaseline >= 5 ||
    missedCriticalMedication
  ) {
    const reasons = [];
    if (latest.chestPain === "Yes") reasons.push("Chest pain");
    if (latest.shortnessOfBreath === "Severe") reasons.push("Severe shortness of breath");
    if (weightChange24h >= 3) reasons.push(`Weight +${weightChange24h} lb / 24h`);
    if (weightChangeBaseline >= 5) reasons.push(`Weight +${weightChangeBaseline} lb / baseline`);
    if (missedCriticalMedication) reasons.push(`Missed medication: ${missedMeds.join(", ")}`);
    return { status: "Red", reason: reasons.join(", ") };
  }

  if (
    ["Mild", "Moderate"].includes(latest.shortnessOfBreath) ||
    ["Mild", "Moderate"].includes(latest.swelling) ||
    latest.dizziness === "Yes" ||
    missedAnyMedication
  ) {
    const reasons = [];
    if (["Mild", "Moderate"].includes(latest.shortnessOfBreath)) {
      reasons.push(`${latest.shortnessOfBreath} shortness of breath`);
    }
    if (["Mild", "Moderate"].includes(latest.swelling)) {
      reasons.push(`${latest.swelling} swelling`);
    }
    if (latest.dizziness === "Yes") reasons.push("Dizziness");
    if (missedAnyMedication) reasons.push(`Missed medication: ${missedMeds.join(", ")}`);
    return { status: "Yellow", reason: reasons.join(", ") };
  }

  return { status: "Green", reason: "Stable symptoms and medications taken" };
}

app.get("/api/summary", (req, res) => {
  const db = getDb();
  const patientsWithStatus = db.patients.map(p => ({
    ...p,
    computed: computeStatus(p, db.checkins)
  }));

  res.json({
    totalPatients: patientsWithStatus.length,
    red: patientsWithStatus.filter(p => p.computed.status === "Red").length,
    yellow: patientsWithStatus.filter(p => p.computed.status === "Yellow").length,
    green: patientsWithStatus.filter(p => p.computed.status === "Green").length,
    completionRate: "88%"
  });
});

app.get("/api/patients", (req, res) => {
  const db = getDb();

  const patients = db.patients.map(p => {
    const latestCheckin = db.checkins
      .filter(c => c.patientId === p.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

    const notes = db.notes
      .filter(n => n.patientId === p.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      ...p,
      latestCheckin,
      notes,
      computed: computeStatus(p, db.checkins)
    };
  });

  const order = { Red: 0, Yellow: 1, Green: 2 };
  patients.sort((a, b) => order[a.computed.status] - order[b.computed.status]);

  res.json(patients);
});

app.post("/api/patients", (req, res) => {
  const body = req.body || {};

  if (!body.name || !body.diagnosis) {
    return res.status(400).json({ error: "Name and diagnosis are required." });
  }

  const patient = {
    id: `p${Date.now()}`,
    name: body.name,
    phone: body.phone || "",
    diagnosis: body.diagnosis || "CHF",
    dischargeDate: body.dischargeDate || "",
    baselineWeight: Number(body.baselineWeight || 0),
    criticalMeds: Array.isArray(body.criticalMeds)
      ? body.criticalMeds
      : String(body.criticalMeds || "")
          .split(",")
          .map(s => s.trim())
          .filter(Boolean),
    assignedNurse: body.assignedNurse || "",
    provider: body.provider || ""
  };

  memoryDb.patients.push(patient);
  res.json({ ok: true, patient });
});

app.get("/api/tasks", (req, res) => {
  const db = getDb();
  res.json(db.tasks);
});

app.post("/api/checkins", (req, res) => {
  const body = req.body;
  const allPatients = [...fileDb.patients, ...memoryDb.patients];
  const allCheckins = [...fileDb.checkins, ...memoryDb.checkins];
  const patient = allPatients.find(p => p.id === body.patientId);

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  const checkin = {
    id: `checkin_${Date.now()}`,
    patientId: body.patientId,
    weight: Number(body.weight),
    medResponses: body.medResponses || {},
    shortnessOfBreath: body.shortnessOfBreath,
    swelling: body.swelling,
    dizziness: body.dizziness,
    chestPain: body.chestPain,
    createdAt: new Date().toISOString()
  };

  memoryDb.checkins.push(checkin);

  const computed = computeStatus(patient, [...allCheckins, checkin]);

  if (computed.status !== "Green") {
    memoryDb.tasks.push({
      id: `task_${Date.now()}`,
      patientId: patient.id,
      priority: computed.status,
      reason: computed.reason,
      status: "open",
      createdAt: new Date().toISOString()
    });
  }

  res.json({ ok: true, checkin, status: computed });
});

app.post("/api/tasks/complete", (req, res) => {
  const db = getDb();
  const task = db.tasks.find(t => t.id === req.body.id);

  if (task) {
    task.status = "closed";
  }

  res.json({ ok: true });
});

app.post("/api/tasks/escalate", (req, res) => {
  const db = getDb();
  const task = db.tasks.find(t => t.id === req.body.id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  memoryDb.notes.push({
    id: `note_${Date.now()}`,
    patientId: task.patientId,
    text: "Escalated to provider",
    createdAt: new Date().toISOString()
  });

  res.json({ ok: true });
});

app.post("/api/notes", (req, res) => {
  const body = req.body || {};

  if (!body.patientId || !body.text) {
    return res.status(400).json({ error: "patientId and text are required." });
  }

  const note = {
    id: `note_${Date.now()}`,
    patientId: body.patientId,
    text: body.text,
    createdAt: new Date().toISOString()
  };

  memoryDb.notes.push(note);
  res.json({ ok: true, note });
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
