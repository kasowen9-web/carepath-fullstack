const state={patients:[],tasks:[]};
function byId(id){return document.getElementById(id);}
async function getJSON(url){const res=await fetch(url);return res.json();}
async function postJSON(url,body){const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return res.json();}
function setView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(v=>v.classList.remove("active"));
  if(view==="dashboard"){
    byId("dashboard-view").classList.add("active");
    document.querySelector('[data-view="dashboard"]').classList.add("active");
    byId("view-title").textContent="Nurse Dashboard";
    byId("view-subtitle").textContent="Execution visibility after discharge";
  } else if(view==="patient-checkin"){
    byId("checkin-view").classList.add("active");
    document.querySelector('[data-view="patient-checkin"]').classList.add("active");
    byId("view-title").textContent="Patient Daily Check-In";
    byId("view-subtitle").textContent="Simple daily monitoring for CHF";
  } else {
    byId("enroll-view").classList.add("active");
    document.querySelector('[data-view="enroll-patient"]').classList.add("active");
    byId("view-title").textContent="Enroll Patient";
    byId("view-subtitle").textContent="Add a patient to the CarePath workflow";
  }
}
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
function renderSummary(summary){
  byId("summary-cards").innerHTML=`
    <div class="card"><div class="label">Enrolled Patients</div><div class="value">${summary.totalPatients}</div></div>
    <div class="card"><div class="label">Red</div><div class="value">${summary.red}</div></div>
    <div class="card"><div class="label">Yellow</div><div class="value">${summary.yellow}</div></div>
    <div class="card"><div class="label">Completion Rate</div><div class="value">${summary.completionRate}</div></div>`;
}
function renderPatients(patients){
  byId("patient-rows").innerHTML=patients.map(p=>`
    <tr>
      <td><strong>${p.name}</strong><br><span style="color:#64748b">${p.diagnosis||"CHF"}</span></td>
      <td><span class="badge ${p.computed.status}">${p.computed.status}</span></td>
      <td>${p.computed.reason}</td>
      <td>${p.dischargeDate||"-"}</td>
    </tr>`).join("");
  const select=byId("patientId");
  select.innerHTML=patients.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
}
function patientName(id){const p=state.patients.find(x=>x.id===id);return p?p.name:id;}
function renderTasks(tasks){
  if(!tasks.length){byId("task-list").innerHTML='<div>No open tasks</div>';return;}
  byId("task-list").innerHTML=tasks.map(task=>`
    <div class="task">
      <strong>${patientName(task.patientId)}</strong> <span class="badge ${task.priority}">${task.priority}</span><br>
      ${task.reason}
      <div class="task-actions">
        <button class="danger" onclick="closeTask('${task.id}')">Close Task</button>
      </div>
    </div>`).join("");
}
async function closeTask(id){await postJSON("/api/tasks/complete",{id});await refresh();}
async function refresh(){
  const [summary,patients,tasks]=await Promise.all([getJSON("/api/summary"),getJSON("/api/patients"),getJSON("/api/tasks")]);
  state.patients=patients;state.tasks=tasks.filter(t=>t.status==="open");
  renderSummary(summary);renderPatients(patients);renderTasks(state.tasks);
}
byId("checkin-form").addEventListener("submit",async(e)=>{
  e.preventDefault();
  const payload={patientId:byId("patientId").value,weight:byId("weight").value,medsTaken:byId("medsTaken").value,shortnessOfBreath:byId("shortnessOfBreath").value,swelling:byId("swelling").value,dizziness:byId("dizziness").value,chestPain:byId("chestPain").value};
  const response=await postJSON("/api/checkins",payload);
  const result=byId("checkin-result");result.classList.add("show");result.textContent=`Thank you. Status: ${response.status.status}`;
  e.target.reset();await refresh();setView("dashboard");
});
byId("enroll-form").addEventListener("submit",async(e)=>{
  e.preventDefault();
  const payload={
    name: byId("enrollName").value,
    phone: byId("enrollPhone").value,
    diagnosis: byId("enrollDiagnosis").value,
    dischargeDate: byId("enrollDischargeDate").value,
    baselineWeight: byId("enrollBaselineWeight").value,
    criticalMeds: byId("enrollCriticalMeds").value,
    assignedNurse: byId("enrollAssignedNurse").value,
    provider: byId("enrollProvider").value
  };
  const response=await postJSON("/api/patients",payload);
  const result=byId("enroll-result");
  result.classList.add("show");
  result.textContent=`Patient added: ${response.patient.name}`;
  e.target.reset();
  await refresh();
  setView("dashboard");
});
refresh();
