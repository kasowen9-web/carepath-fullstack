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
      <input id="name" placeholder="Full Name">
      <input id="phone" placeholder="Phone Number">
      <button onclick="nextStep()">Continue</button>
    `;
  }

  if (step === 2) {
    document.getElementById("step-title").innerText = "Your Care Plan";
    document.getElementById("step-subtitle").innerText = "Tell us about your care plan";

    formArea.innerHTML = `
      <input id="condition" placeholder="Condition / Program">
      <input id="date" type="date">
      <button onclick="nextStep()">Continue</button>
    `;
  }

  if (step === 3) {
    document.getElementById("step-title").innerText = "Medications & Supplies";
    document.getElementById("step-subtitle").innerText = "Make sure you’re set up at home";

    formArea.innerHTML = `
      <p>Do you have your medications?</p>
      <button onclick="nextStep()">Yes</button>
      <button onclick="nextStep()">No</button>
    `;
  }

  if (step === 4) {
    document.getElementById("step-title").innerText = "Support at Home";
    document.getElementById("step-subtitle").innerText = "Help us understand your routine";

    formArea.innerHTML = `
      <p>Do you have support at home?</p>
      <button onclick="nextStep()">Yes</button>
      <button onclick="nextStep()">No</button>
    `;
  }

  if (step === 5) {
    document.getElementById("step-title").innerText = "You’re all set 🎉";
    document.getElementById("step-subtitle").innerText = "Your CarePath is ready";

    formArea.innerHTML = `
      <p>You’ll receive guided daily care steps and check-ins.</p>
      <p>Some steps are time-sensitive to keep your care on track—we’ll guide you along the way.</p>
      <p><strong>Your responses guide your care team, so they can step in when support is needed.</strong></p>
      <button onclick="finish()">Start My CarePath</button>
    `;
  }
}

function nextStep() {
  step++;
  renderStep();
}

function finish() {
  window.location.href = "patient.html";
}

renderStep();
