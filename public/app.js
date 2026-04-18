let step = 1;

const formArea = document.getElementById("form-area");

function renderStep() {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById("s" + step).classList.add("active");

  if (step === 1) {
    document.getElementById("step-title").innerText = "Let’s get you set up";
    document.getElementById("step-subtitle").innerText = "We’ll use this to support you over the next 30 days";

    formArea.innerHTML = `
      <h2>Confirm You</h2>
      <input id="name" placeholder="Full Name" value="${localStorage.getItem("cp_name") || ""}">
      <input id="phone" placeholder="Phone Number" value="${localStorage.getItem("cp_phone") || ""}">
      <button onclick="nextStep()">Continue</button>
    `;
  }

  if (step === 2) {
    document.getElementById("step-title").innerText = "Your Care Plan";
    document.getElementById("step-subtitle").innerText = "Tell us about your care plan";

    formArea.innerHTML = `
      <input id="condition" placeholder="Condition / Program" value="${localStorage.getItem("cp_condition") || ""}">
      <input id="date" type="date" value="${localStorage.getItem("cp_date") || ""}">
      <button onclick="prevStep()">Back</button>
      <button onclick="nextStep()">Continue</button>
    `;
  }

  if (step === 3) {
    document.getElementById("step-title").innerText = "Medications & Supplies";
    document.getElementById("step-subtitle").innerText = "Make sure you’re set up at home";

    formArea.innerHTML = `
      <p>Do you have your medications?</p>
      <button onclick="saveAnswerAndNext('cp_meds', 'Yes')">Yes</button>
      <button onclick="saveAnswerAndNext('cp_meds', 'No')">No</button>
      <div style="margin-top:16px;">
        <button onclick="prevStep()">Back</button>
      </div>
    `;
  }

  if (step === 4) {
    document.getElementById("step-title").innerText = "Support at Home";
    document.getElementById("step-subtitle").innerText = "Help us understand your routine";

    formArea.innerHTML = `
      <p>Do you have support at home?</p>
      <button onclick="saveAnswerAndNext('cp_support', 'Yes')">Yes</button>
      <button onclick="saveAnswerAndNext('cp_support', 'No')">No</button>
      <div style="margin-top:16px;">
        <button onclick="prevStep()">Back</button>
      </div>
    `;
  }

  if (step === 5) {
    document.getElementById("step-title").innerText = "You’re all set 🎉";
    document.getElementById("step-subtitle").innerText = "Your CarePath is ready";

    formArea.innerHTML = `
      <p>You’ll receive guided daily care steps and check-ins.</p>
      <p>Some steps are time-sensitive to keep your care on track—we’ll guide you along the way.</p>
      <p><strong>Your responses guide your care team, so they can step in when support is needed.</strong></p>
      <button onclick="prevStep()">Back</button>
      <button onclick="finish()">Start My CarePath</button>
    `;
  }
}

function nextStep() {
  if (step === 1) {
    const name = document.getElementById("name")?.value?.trim() || "";
    const phone = document.getElementById("phone")?.value?.trim() || "";

    if (!name || !phone) {
      alert("Please enter your name and phone number.");
      return;
    }

    localStorage.setItem("cp_name", name);
    localStorage.setItem("cp_phone", phone);
  }

  if (step === 2) {
    const condition = document.getElementById("condition")?.value?.trim() || "";
    const date = document.getElementById("date")?.value || "";

    localStorage.setItem("cp_condition", condition);
    localStorage.setItem("cp_date", date);
  }

  if (step < 5) {
    step++;
    renderStep();
  }
}

function prevStep() {
  if (step > 1) {
    step--;
    renderStep();
  }
}

function saveAnswerAndNext(key, value) {
  localStorage.setItem(key, value);
  nextStep();
}

function finish() {
  window.location.href = "patient.html";
}

renderStep();
