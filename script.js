/* =====================================
   UNIVERSAL GPA CALCULATOR
   Main JavaScript File
   Developed by A.D. Derrick Redeemer
===================================== */

/* =====================================
   1. STORAGE AND SHARED FUNCTIONS
===================================== */

const GPA_HISTORY_KEY = "gpaHistory";
const CWA_HISTORY_KEY = "cwaHistory";

const gradeScales = {
  4: [4, 3.5, 3, 2.5, 2, 1.5, 1, 0],
  5: [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0]
};

const getStored = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const setStored = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getHistory = () => getStored(GPA_HISTORY_KEY);
const saveHistory = (items) => setStored(GPA_HISTORY_KEY, items);

const getCwaHistory = () => getStored(CWA_HISTORY_KEY);
const saveCwaHistory = (items) => setStored(CWA_HISTORY_KEY, items);

const validNumber = (value) =>
  value !== "" && Number.isFinite(Number(value));

const formatNumber = (value) =>
  Number(value).toFixed(2);

const escapeHTML = (value) =>
  String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);

const showMessage = (id, message) => {
  const el = document.getElementById(id);

  if (el) {
    el.textContent = message;
  }
};

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;


/* =====================================
   2. MOBILE NAVIGATION
===================================== */

document.querySelectorAll(".menu-toggle").forEach(button => {

  const menu = document.getElementById(
    button.getAttribute("aria-controls")
  );

  if (!menu) return;

  button.addEventListener("click", () => {

    const open = menu.classList.toggle("show");

    button.setAttribute("aria-expanded", String(open));

    button.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu"
    );

    button.textContent = open ? "×" : "☰";

  });

  menu.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", () => {

      menu.classList.remove("show");

      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open navigation menu");

      button.textContent = "☰";

    });

  });

});


/* =====================================
   3. GPA CALCULATOR
===================================== */

const courseList = document.getElementById("course-list");
const scaleSelect = document.getElementById("scale");
const customContainer = document.getElementById("custom-container");

let latestGPAResult = null;


/* Custom Grade Processing */

function parseCustomGrades() {

  const field = document.getElementById("custom-grades");

  const text = field?.value.trim() || "";

  if (!text) return null;

  const map = {};

  for (const line of text.split(/\r?\n/).filter(Boolean)) {

    const parts = line.split("=");

    if (parts.length !== 2) return null;

    const grade = parts[0].trim().toUpperCase();
    const pointText = parts[1].trim();

    if (
      !grade ||
      !validNumber(pointText) ||
      Number(pointText) < 0 ||
      Object.hasOwn(map, grade)
    ) {
      return null;
    }

    map[grade] = Number(pointText);

  }

  return Object.keys(map).length ? map : null;

}


/* Update Grade Dropdown */

function updateGradeOptions(row) {

  const select = row.querySelector(".grade");

  const oldValue = select.value;

  const scale = scaleSelect?.value || "4";

  if (scale === "custom") {

    select.innerHTML =
      '<option value="">Select custom grade</option>';

    const map = parseCustomGrades();

    if (map) {

      Object.keys(map).forEach(grade => {

        const option = document.createElement("option");

        option.value = grade;
        option.textContent = grade;

        select.appendChild(option);

      });

    }

    return;

  }

  const points = gradeScales[scale] || gradeScales[4];

  select.innerHTML =
    '<option value="">Grade point</option>' +
    points.map(point =>
      `<option value="${point}">${point.toFixed(1)}</option>`
    ).join("");

  if (points.includes(Number(oldValue))) {
    select.value = oldValue;
  }

}


/* Refresh All Course Rows */

function refreshCourseRows() {

  courseList?.querySelectorAll(".course-row")
    .forEach(updateGradeOptions);

}


/* Grading Scale Events */

if (scaleSelect) {

  scaleSelect.addEventListener("change", () => {

    customContainer?.classList.toggle(
      "hidden",
      scaleSelect.value !== "custom"
    );

    refreshCourseRows();

  });

  document.getElementById("custom-grades")
    ?.addEventListener("input", refreshCourseRows);

}


/* Initial Course Setup */

if (courseList) {

  refreshCourseRows();

  courseList.addEventListener("click", event => {

    if (!event.target.classList.contains("remove-btn")) return;

    const rows = courseList.querySelectorAll(".course-row");

    if (rows.length <= 1) {
      return alert("At least one course is required.");
    }

    event.target.closest(".course-row")?.remove();

  });

}


/* Add Course */

document.getElementById("add-course")
  ?.addEventListener("click", () => {

    if (!courseList) return;

    const row = document.createElement("div");

    row.className = "course-row";

    row.innerHTML = `
      <input
        class="course-name"
        type="text"
        placeholder="Course name"
      >

      <input
        class="credit"
        type="number"
        min="0.1"
        step="any"
        placeholder="Credits"
      >

      <select class="grade">
        <option value="">Grade point</option>
      </select>

      <button
        class="remove-btn"
        type="button"
        aria-label="Remove course"
      >×</button>
    `;

    courseList.appendChild(row);

    updateGradeOptions(row);

  });


/* Calculate GPA */

document.getElementById("calculate-gpa")
  ?.addEventListener("click", () => {

    showMessage("gpa-message", "");

    const scale = scaleSelect.value;

    const customMap =
      scale === "custom" ? parseCustomGrades() : null;

    if (scale === "custom" && !customMap) {

      return showMessage(
        "gpa-message",
        "Enter valid custom grades, one per line, such as A=4.0."
      );

    }

    const rows = [
      ...courseList.querySelectorAll(".course-row")
    ];

    let totalCredits = 0;
    let totalPoints = 0;

    const courses = [];

    for (let i = 0; i < rows.length; i++) {

      const row = rows[i];

      const name = row.querySelector(".course-name").value.trim();

      const creditsText = row.querySelector(".credit").value;

      const gradeValue = row.querySelector(".grade").value;

      if (
        !name ||
        !validNumber(creditsText) ||
        Number(creditsText) <= 0 ||
        !gradeValue
      ) {

        return showMessage(
          "gpa-message",
          `Please complete all fields for course ${i + 1}.`
        );

      }

      let gradePoint;

      if (scale === "custom") {

        const grade = gradeValue.trim().toUpperCase();

        if (!Object.hasOwn(customMap, grade)) {

          return showMessage(
            "gpa-message",
            `Grade "${gradeValue}" is not in your custom grade list.`
          );

        }

        gradePoint = customMap[grade];

      } else {

        gradePoint = Number(gradeValue);

        if (gradePoint < 0 || gradePoint > Number(scale)) {

          return showMessage(
            "gpa-message",
            `Grade points must be between 0 and ${scale}.`
          );

        }

      }

      const credits = Number(creditsText);

      totalCredits += credits;

      totalPoints += credits * gradePoint;

      courses.push({
        name,
        credits,
        gradePoint,
        grade: scale === "custom" ? gradeValue : undefined
      });

    }

    if (!totalCredits) {

      return showMessage(
        "gpa-message",
        "Enter at least one valid course."
      );

    }

    const gpa = totalPoints / totalCredits;

    latestGPAResult = {

      id: makeId(),

      date: new Date().toLocaleString(),

      semester:
        document.getElementById("semester").value.trim() ||
        "Unspecified semester",

      scale: scale === "custom" ? "Custom" : `${scale}.0`,

      gpa: Number(gpa.toFixed(4)),

      totalCredits,

      totalPoints,

      courses

    };

    const result = document.getElementById("gpa-result");

    result.innerHTML = `
      <h2>Your GPA: ${formatNumber(gpa)}</h2>

      <p>
        <strong>Total Credit Hours:</strong>
        ${formatNumber(totalCredits)}
      </p>

      <p>
        <strong>Total Grade Points:</strong>
        ${formatNumber(totalPoints)}
      </p>

      <p>
        <strong>Grading System:</strong>
        ${escapeHTML(latestGPAResult.scale)}
      </p>
    `;

    result.classList.remove("hidden");

    document.getElementById("gpa-actions")
      .classList.remove("hidden");

  });


/* Save GPA */

document.getElementById("save-gpa")
  ?.addEventListener("click", () => {

    if (!latestGPAResult) {
      return alert("Calculate your GPA first.");
    }

    const history = getHistory();

    if (history.some(item => item.id === latestGPAResult.id)) {

      return alert("This result has already been saved.");

    }

    history.unshift(latestGPAResult);

    saveHistory(history);

    alert("GPA result saved successfully.");

  });


/* CSV Download Function */

function downloadCSV(filename, rows) {

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value ?? "").replaceAll('"', '""')}"`
    ).join(",")
  ).join("\n");

  const blob = new Blob(
    [csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

}


/* Download GPA CSV */

document.getElementById("download-gpa")
  ?.addEventListener("click", () => {

    if (!latestGPAResult) return;

    const rows = [

      ["Course", "Credits", "Grade Point"],

      ...latestGPAResult.courses.map(course => [
        course.name,
        course.credits,
        course.gradePoint
      ]),

      ["Total Credits", latestGPAResult.totalCredits, ""],

      ["GPA", latestGPAResult.gpa, ""]

    ];

    downloadCSV("gpa-result.csv", rows);

  });


/* Print GPA */

document.getElementById("print-gpa")
  ?.addEventListener("click", () => window.print());


/* =====================================
   4. CGPA CALCULATOR
===================================== */

document.getElementById("calculate-cgpa")
  ?.addEventListener("click", () => {

    showMessage("cgpa-message", "");

    const scale = Number(
      document.getElementById("cgpa-scale").value
    );

    const ids = [
      "previous-cgpa",
      "previous-credits",
      "current-gpa",
      "current-credits"
    ];

    const values = ids.map(id =>
      document.getElementById(id).value
    );

    if (values.some(value => !validNumber(value))) {

      return showMessage(
        "cgpa-message",
        "Please complete all fields with valid numbers."
      );

    }

    const [
      previousCgpa,
      previousCredits,
      currentGpa,
      currentCredits
    ] = values.map(Number);

    if (
      previousCgpa < 0 ||
      previousCgpa > scale ||
      currentGpa < 0 ||
      currentGpa > scale ||
      previousCredits < 0 ||
      currentCredits <= 0
    ) {

      return showMessage(
        "cgpa-message",
        `GPA values must be between 0 and ${scale}. Previous credits cannot be negative and current credits must be above zero.`
      );

    }

    const totalCredits = previousCredits + currentCredits;

    const cgpa = (
      previousCgpa * previousCredits +
      currentGpa * currentCredits
    ) / totalCredits;

    const result = document.getElementById("cgpa-result");

    result.innerHTML = `
      <h2>Your New CGPA: ${formatNumber(cgpa)}</h2>

      <p>
        <strong>Total Credit Hours:</strong>
        ${formatNumber(totalCredits)}
      </p>
    `;

    result.classList.remove("hidden");

  });


/* =====================================
   5. CWA CALCULATOR
===================================== */

const cwaList = document.getElementById("cwa-course-list");

let latestCwaResult = null;


/* Remove CWA Course */

if (cwaList) {

  cwaList.addEventListener("click", event => {

    if (!event.target.classList.contains("remove-btn")) return;

    if (cwaList.querySelectorAll(".course-row").length <= 1) {

      return alert("At least one course is required.");

    }

    event.target.closest(".course-row")?.remove();

  });

}


/* Add CWA Course */

document.getElementById("add-cwa-course")
  ?.addEventListener("click", () => {

    const row = document.createElement("div");

    row.className = "course-row";

    row.innerHTML = `
      <input
        class="cwa-name"
        type="text"
        placeholder="Course name"
      >

      <input
        class="cwa-mark"
        type="number"
        min="0"
        max="100"
        step="any"
        placeholder="Mark"
      >

      <input
        class="cwa-credit"
        type="number"
        min="0.1"
        step="any"
        placeholder="Credits"
      >

      <button
        class="remove-btn"
        type="button"
        aria-label="Remove course"
      >×</button>
    `;

    cwaList.appendChild(row);

  });


/* Calculate CWA */

document.getElementById("calculate-cwa")
  ?.addEventListener("click", () => {

    showMessage("cwa-message", "");

    const rows = [
      ...cwaList.querySelectorAll(".course-row")
    ];

    let weightedTotal = 0;
    let totalCredits = 0;

    const courses = [];

    for (let i = 0; i < rows.length; i++) {

      const name = rows[i]
        .querySelector(".cwa-name").value.trim();

      const markText = rows[i]
        .querySelector(".cwa-mark").value;

      const creditText = rows[i]
        .querySelector(".cwa-credit").value;

      if (
        !name ||
        !validNumber(markText) ||
        !validNumber(creditText) ||
        Number(creditText) <= 0
      ) {

        return showMessage(
          "cwa-message",
          `Please complete all fields for course ${i + 1}.`
        );

      }

      const mark = Number(markText);
      const credits = Number(creditText);

      if (mark < 0 || mark > 100) {

        return showMessage(
          "cwa-message",
          `The mark for course ${i + 1} must be between 0 and 100.`
        );

      }

      weightedTotal += mark * credits;

      totalCredits += credits;

      courses.push({

        name,
        mark,
        credits,
        weightedMark: mark * credits

      });

    }

    if (!totalCredits) {

      return showMessage(
        "cwa-message",
        "Enter at least one valid course."
      );

    }

    const cwa = weightedTotal / totalCredits;

    latestCwaResult = {

      id: makeId(),

      date: new Date().toLocaleString(),

      period:
        document.getElementById("cwa-period").value.trim() ||
        "Unspecified period",

      cwa: Number(cwa.toFixed(4)),

      totalCredits,

      weightedTotal,

      courses

    };

    const result = document.getElementById("cwa-result");

    result.innerHTML = `
      <h2>Your CWA: ${formatNumber(cwa)}%</h2>

      <p>
        <strong>Total Credit Hours:</strong>
        ${formatNumber(totalCredits)}
      </p>

      <p>
        <strong>Total Weighted Marks:</strong>
        ${formatNumber(weightedTotal)}
      </p>
    `;

    result.classList.remove("hidden");

    document.getElementById("cwa-actions")
      .classList.remove("hidden");

  });


/* Save CWA */

document.getElementById("save-cwa")
  ?.addEventListener("click", () => {

    if (!latestCwaResult) {
      return alert("Calculate your CWA first.");
    }

    const history = getCwaHistory();

    if (history.some(item => item.id === latestCwaResult.id)) {

      return alert("This result has already been saved.");

    }

    history.unshift(latestCwaResult);

    saveCwaHistory(history);

    alert("CWA result saved successfully.");

  });


/* Download CWA CSV */

document.getElementById("download-cwa")
  ?.addEventListener("click", () => {

    if (!latestCwaResult) return;

    const rows = [

      ["Course", "Mark (%)", "Credits", "Weighted Mark"],

      ...latestCwaResult.courses.map(course => [
        course.name,
        course.mark,
        course.credits,
        course.weightedMark
      ]),

      [
        "Total Credits",
        latestCwaResult.totalCredits,
        "",
        ""
      ],

      [
        "CWA",
        latestCwaResult.cwa,
        "",
        ""
      ]

    ];

    downloadCSV("cwa-result.csv", rows);

  });


/* Print CWA */

document.getElementById("print-cwa")
  ?.addEventListener("click", () => window.print());


/* =====================================
   6. GPA PREDICTOR
===================================== */

document.getElementById("calculate-predictor")
  ?.addEventListener("click", () => {

    showMessage("predictor-message", "");

    const scale = Number(
      document.getElementById("predict-scale").value
    );

    const ids = [
      "current-cgpa",
      "completed-credits",
      "target-cgpa",
      "upcoming-credits"
    ];

    const values = ids.map(id =>
      document.getElementById(id).value
    );

    if (values.some(value => !validNumber(value))) {

      return showMessage(
        "predictor-message",
        "Please complete all fields with valid numbers."
      );

    }

    const [
      currentCgpa,
      completedCredits,
      targetCgpa,
      upcomingCredits
    ] = values.map(Number);

    if (
      currentCgpa < 0 ||
      currentCgpa > scale ||
      targetCgpa < 0 ||
      targetCgpa > scale ||
      completedCredits < 0 ||
      upcomingCredits <= 0
    ) {

      return showMessage(
        "predictor-message",
        `CGPA values must be between 0 and ${scale}. Completed credits cannot be negative and upcoming credits must be above zero.`
      );

    }

    const requiredGpa = (
      targetCgpa * (completedCredits + upcomingCredits) -
      currentCgpa * completedCredits
    ) / upcomingCredits;

    const result = document.getElementById("predictor-result");

    if (requiredGpa > scale) {

      result.innerHTML = `
        <h2>Target Not Achievable Within These Credits</h2>

        <p>
          You would need a GPA of
          <strong>${formatNumber(requiredGpa)}</strong>,
          above the maximum of ${scale.toFixed(1)}.
        </p>

        <p>
          Consider a lower target or more upcoming credit hours.
        </p>
      `;

    } else if (requiredGpa <= 0) {

      result.innerHTML = `
        <h2>You Have Already Reached Your Target</h2>

        <p>
          A GPA of 0.00 or higher over the upcoming credits
          would keep you at or above your target.
        </p>
      `;

    } else {

      result.innerHTML = `
        <h2>Required GPA: ${formatNumber(requiredGpa)}</h2>

        <p>
          You need approximately
          <strong>${formatNumber(requiredGpa)}</strong>
          GPA across your next
          ${formatNumber(upcomingCredits)} credit hours
          to reach a CGPA of ${formatNumber(targetCgpa)}.
        </p>
      `;

    }

    result.classList.remove("hidden");

  });


/* =====================================
   7. ACADEMIC HISTORY
===================================== */

const historyList = document.getElementById("history-list");

let activeHistoryType = "gpa";


/* Render History */

function renderHistory() {

  if (!historyList) return;

  const isCwa = activeHistoryType === "cwa";

  const records = isCwa
    ? getCwaHistory()
    : getHistory();

  document.getElementById("history-title").textContent =
    isCwa ? "Saved CWA Results" : "Saved GPA Results";

  document.getElementById("clear-history").textContent =
    isCwa ? "Clear CWA History" : "Clear GPA History";


  if (!records.length) {

    historyList.innerHTML = `
      <div class="history-item">
        <p>
          No saved ${isCwa ? "CWA" : "GPA"} results yet.
          Calculate and save a result to see it here.
        </p>
      </div>
    `;

    return;

  }


  historyList.innerHTML = records.map(item => {

    const heading = isCwa

      ? `${escapeHTML(item.period || "CWA Result")} — CWA: ${formatNumber(item.cwa)}%`

      : `${escapeHTML(item.semester || "GPA Result")} — GPA: ${formatNumber(item.gpa)}`;


    const details = isCwa

      ? (item.courses || []).map(course => `
          <li>
            ${escapeHTML(course.name)} —
            ${formatNumber(course.mark)}%,
            ${formatNumber(course.credits)} credits
          </li>
        `).join("")

      : (item.courses || []).map(course => `
          <li>
            ${escapeHTML(course.name)} —
            ${formatNumber(course.credits)} credits,
            grade point ${formatNumber(course.gradePoint)}
          </li>
        `).join("");


    return `

      <article class="history-item">

        <h3>${heading}</h3>

        <p>
          <strong>Date:</strong>
          ${escapeHTML(item.date || "")}
        </p>

        <p>
          <strong>Total Credits:</strong>
          ${formatNumber(item.totalCredits || 0)}
        </p>

        <details>

          <summary>View Courses</summary>

          <ul class="history-courses">
            ${details}
          </ul>

        </details>

        <button
          class="btn danger delete-history"
          data-id="${escapeHTML(item.id || "")}"
          type="button"
        >
          Delete
        </button>

      </article>

    `;

  }).join("");

}


/* Initial History Setup */

if (historyList) {

  renderHistory();


  /* Switch Between GPA and CWA History */

  document.querySelectorAll("[data-history-tab]")
    .forEach(button => {

      button.addEventListener("click", () => {

        activeHistoryType = button.dataset.historyTab;

        document.querySelectorAll("[data-history-tab]")
          .forEach(tab => {

            tab.classList.toggle("active", tab === button);

          });

        renderHistory();

      });

    });


  /* Delete Individual History Record */

  historyList.addEventListener("click", event => {

    const button = event.target.closest(".delete-history");

    if (!button) return;

    const updated = (
      activeHistoryType === "cwa"
        ? getCwaHistory()
        : getHistory()
    ).filter(item => String(item.id) !== button.dataset.id);


    if (activeHistoryType === "cwa") {

      saveCwaHistory(updated);

    } else {

      saveHistory(updated);

    }

    renderHistory();

  });

}


/* Clear All History */

document.getElementById("clear-history")
  ?.addEventListener("click", () => {

    const records = activeHistoryType === "cwa"
      ? getCwaHistory()
      : getHistory();

    if (!records.length) {

      return alert("There is no history to clear.");

    }

    const confirmed = confirm(
      `Are you sure you want to delete all saved ${activeHistoryType.toUpperCase()} results?`
    );

    if (confirmed) {

      if (activeHistoryType === "cwa") {

        saveCwaHistory([]);

      } else {

        saveHistory([]);

      }

      renderHistory();

    }

  });
