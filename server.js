
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

function saveDb(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function computeStatus(patient, checkins) {
  const latest = checkins
    .filter(c => c.patientId === patient.id)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  if (!latest) {
    return { status: "Yellow", reason: "No check-in yet" };
  }

  const patientHistory = checkins
    .filter(c => c.patientId === patient.id)
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

  let weightChange24h = 0;
  let weightChange7d = 0;

  if (patientHistory.length >= 2) {
    const prev = patientHistory[patientHistory.length - 2];
    weightChange24h = Number((latest.weight - prev.weight).toFixed(1));
  }

  if (patient.baselineWeight) {
    weightChange7d = Number((latest.weight - patient.baselineWeight).toFixed(1));
  }

  const missedCritical = latest.medsTaken === "No" && Array.isArray(patient.criticalMeds) && patient.criticalMeds.length > 0;

  if (
    latest.chestPain === "Yes" ||
    latest.shortnessOfBreath === "Severe" ||
    weightChange24h >= 3 ||
    weightChange7d >= 5 ||
    missedCritical
  ) {
    let reasons = [];
    if (latest.chestPain === "Yes") reasons.push("Chest pain");
    if (latest.shortnessOfBreath === "Severe") reasons.push("Severe shortness of breath");
    if (weightChange24h >= 3) reasons.push(`Weight +${weightChange24h} lb / 24h`);
    if (weightChange7d >= 5) reasons.push(`Weight +${weightChange7d} lb / baseline`);
    if (missedCritical) reasons.push("Missed critical medication");
    return { status: "Red", reason: reasons.join(", ") };
  }

  if (
    ["Mild","Moderate"].includes(latest.shortnessOfBreath) ||
    ["Mild","Moderate"].includes(latest.swelling) ||
    latest.dizziness === "Yes" ||
    latest.medsTaken === "No"
  ) {
    let reasons = [];
    if (["Mild","Moderate"].includes(latest.shortnessOfBreath)) reasons.push(`${latest.shortnessOfBreath} shortness of breath`);
    if (["Mild","Moderate"].includes(latest.swelling)) reasons.push(`${latest.swelling} swelling`);
    if (latest.dizziness === "Yes") reasons.push("Dizziness");
    if (latest.medsTaken === "No") reasons.push("Missed medication");
    return { status: "Yellow", reason: reasons.join(", ") };
  }

  return { status: "Green", reason: "Stable symptoms and medications taken" };
}

app.get("/api/summary", (req, res) => {
  const db = loadDb();
  const patientsWithStatus = db.patients.map(p => ({ ...p, computed: computeStatus(p, db.checkins) }));
  res.json({
    totalPatients: patientsWithStatus.length,
    red: patientsWithStatus.filter(p => p.computed.status === "Red").length,
    yellow: patientsWithStatus.filter(p => p.computed.status === "Yellow").length,
    green: patientsWithStatus.filter(p => p.computed.status === "Green").length,
    completionRate: "88%"
  });
});

app.get("/api/patients", (req, res) => {
  const db = loadDb();
  const patients = db.patients.map(p => {
    const latestCheckin = db.checkins
      .filter(c => c.patientId === p.id)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
    return { ...p, latestCheckin, computed: computeStatus(p, db.checkins) };
  });
  const order = { Red: 0, Yellow: 1, Green: 2 };
  patients.sort((a,b) => order[a.computed.status] - order[b.computed.status]);
  res.json(patients);
});

app.get("/api/patients/:id", (req, res) => {
  const db = loadDb();
  const patient = db.patients.find(p => p.id === req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  const checkins = db.checkins.filter(c => c.patientId === patient.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const notes = db.notes.filter(n => n.patientId === patient.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ...patient, computed: computeStatus(patient, db.checkins), checkins, notes });
});

app.get("/api/tasks", (req, res) => {
  const db = loadDb();
  res.json(db.tasks);
});

app.post("/api/checkins", (req, res) => {
  const db = loadDb();
  const body = req.body;
  const checkin = {
    id: `checkin_${Date.now()}`,
    patientId: body.patientId,
    weight: Number(body.weight),
    medsTaken: body.medsTaken,
    shortnessOfBreath: body.shortnessOfBreath,
    swelling: body.swelling,
    dizziness: body.dizziness,
    chestPain: body.chestPain,
    createdAt: new Date().toISOString()
  };
  db.checkins.push(checkin);
  const patient = db.patients.find(p => p.id === body.patientId);
  const computed = computeStatus(patient, db.checkins);
  if (computed.status !== "Green") {
    db.tasks.push({
      id: `task_${Date.now()}`,
      patientId: patient.id,
      priority: computed.status,
      reason: computed.reason,
      status: "open",
      createdAt: new Date().toISOString()
    });
  }
  saveDb(db);
  res.json({ ok: true, checkin, status: computed });
});

app.post("/api/notes", (req, res) => {
  const db = loadDb();
  const note = {
    id: `note_${Date.now()}`,
    patientId: req.body.patientId,
    text: req.body.text,
    createdAt: new Date().toISOString()
  };
  db.notes.push(note);
  saveDb(db);
  res.json({ ok: true, note });
});

app.post("/api/tasks/complete", (req, res) => {
  const db = loadDb();
  const task = db.tasks.find(t => t.id === req.body.id);
  if (task) task.status = "closed";
  saveDb(db);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
