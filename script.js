const GPA_HISTORY_KEY = "gpaHistory";

const gradeScales = {
  4: [4, 3.5, 3, 2.5, 2, 1.5, 1, 0],
  5: [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0],
};

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(GPA_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(GPA_HISTORY_KEY, JSON.stringify(history));
}

function showMessage(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message;
}

function validNumber(value) {
  return value !== "" && Number.isFinite(Number(value));
}

function formatNumber(value) {
  return Number(value).toFixed(2);
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

/* =========================
GPA CALCULATOR
========================= */

const courseList = document.getElementById("course-list");
const scaleSelect = document.getElementById("scale");
const customContainer = document.getElementById("custom-container");

let latestGPAResult = null;

function updateGradeOptions(row) {
  const select = row.querySelector(".grade");
  const currentValue = select.value;
  const scale = scaleSelect ? scaleSelect.value : "4";

  if (scale === "custom") {
    select.innerHTML = '<option value="">Enter grade below</option>';
    return;
  }

  const points = gradeScales[scale] || gradeScales[4];

  select.innerHTML =
    '<option value="">Grade point</option>' +
    points
      .map((point) => `<option value="${point}">${point.toFixed(1)}</option>`)
      .join("");

  if (points.includes(Number(currentValue))) {
    select.value = currentValue;
  }
}

function refreshCourseRows() {
  if (!courseList) return;

  courseList.querySelectorAll(".course-row").forEach((row) => {
    updateGradeOptions(row);
  });
}

if (scaleSelect) {
  scaleSelect.addEventListener("change", () => {
    if (customContainer) {
      customContainer.classList.toggle(
        "hidden",
        scaleSelect.value !== "custom",
      );
    }

    refreshCourseRows();
  });
}

if (courseList) {
  courseList.addEventListener("click", (event) => {
    if (event.target.classList.contains("remove-btn")) {
      const rows = courseList.querySelectorAll(".course-row");

      if (rows.length === 1) {
        alert("At least one course is required.");
        return;
      }

      const row = event.target.closest(".course-row");
      if (row) row.remove();
    }
  });

  refreshCourseRows();
}

/* Add Course */

document.getElementById("add-course")?.addEventListener("click", () => {
  if (!courseList) return;

  const row = document.createElement("div");

  row.className = "course-row";

  row.innerHTML = `
        <input type="text" class="course-name" placeholder="Course name">

        <input type="number" class="credit"
            placeholder="Credits" min="0.1" step="any">

        <select class="grade">
            <option value="">Grade point</option>
        </select>

        <button type="button" class="remove-btn">×</button>
    `;

  courseList.appendChild(row);
  updateGradeOptions(row);
});

/* Custom Grades */

function parseCustomGrades() {
  const text = document.getElementById("custom-grades").value.trim();

  ```
if (!text) return null;

const gradeMap = {};

const lines = text.split("\n").filter(line => line.trim());

for (const line of lines) {
    const parts = line.split("=");

    if (parts.length !== 2) return null;

    const grade = parts[0].trim().toUpperCase();
    const pointText = parts[1].trim();

    if (!grade || !validNumber(pointText)) return null;

    const point = Number(pointText);

    if (point < 0 || Object.hasOwn(gradeMap, grade)) {
        return null;
    }

    gradeMap[grade] = point;
}

return Object.keys(gradeMap).length ? gradeMap : null;
```;
}

/* Calculate GPA */

document.getElementById("calculate-gpa")?.addEventListener("click", () => {
  showMessage("gpa-message", "");

  const scale = scaleSelect.value;
  const maximumPoint = Number(scale);
  const customMap = scale === "custom" ? parseCustomGrades() : null;

  if (scale === "custom" && !customMap) {
    showMessage(
      "gpa-message",
      "Enter valid custom grades, one per line, such as A=4.0.",
    );
    return;
  }

  const rows = [...courseList.querySelectorAll(".course-row")];

  let totalCredits = 0;
  let totalPoints = 0;

  const courses = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    const name = row.querySelector(".course-name").value.trim();
    const creditValue = row.querySelector(".credit").value;
    const gradeValue = row.querySelector(".grade").value;

    if (
      !name ||
      !validNumber(creditValue) ||
      Number(creditValue) <= 0 ||
      !gradeValue
    ) {
      showMessage(
        "gpa-message",
        `Please complete all fields for course ${index + 1}.`,
      );

      return;
    }

    let gradePoint;

    if (scale === "custom") {
      const grade = gradeValue.trim().toUpperCase();

      if (!Object.hasOwn(customMap, grade)) {
        showMessage(
          "gpa-message",
          `Grade "${gradeValue}" is not in your custom grade list.`,
        );
        return;
      }

      gradePoint = customMap[grade];
    } else {
      gradePoint = Number(gradeValue);

      if (gradePoint < 0 || gradePoint > maximumPoint) {
        showMessage(
          "gpa-message",
          `Grade points must be between 0 and ${maximumPoint}.`,
        );
        return;
      }
    }

    const credits = Number(creditValue);

    totalCredits += credits;
    totalPoints += credits * gradePoint;

    courses.push({
      name,
      credits,
      gradePoint,
    });
  }

  if (totalCredits <= 0) {
    showMessage("gpa-message", "Enter at least one valid course.");
    return;
  }

  const gpa = totalPoints / totalCredits;

  const semester =
    document.getElementById("semester").value.trim() || "Unspecified semester";

  latestGPAResult = {
    id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
    date: new Date().toLocaleString(),
    semester,
    scale: scale === "custom" ? "Custom" : `${scale}.0`,
    gpa: Number(gpa.toFixed(4)),
    totalCredits,
    totalPoints,
    courses,
  };

  const result = document.getElementById("gpa-result");

  result.innerHTML = `
    <h2>Your GPA: ${formatNumber(gpa)}</h2>
    <p><strong>Total Credit Hours:</strong> ${formatNumber(totalCredits)}</p>
    <p><strong>Total Grade Points:</strong> ${formatNumber(totalPoints)}</p>
    <p><strong>Grading System:</strong> ${latestGPAResult.scale}</p>
`;

  result.classList.remove("hidden");
  document.getElementById("gpa-actions").classList.remove("hidden");
});

/* Save GPA */

document.getElementById("save-gpa")?.addEventListener("click", () => {
  if (!latestGPAResult) {
    alert("Calculate your GPA first.");
    return;
  }

  ```
const history = getHistory();

if (history.some(item => item.id === latestGPAResult.id)) {
    alert("This result has already been saved.");
    return;
}

history.unshift(latestGPAResult);
saveHistory(history);

alert("GPA result saved successfully.");
```;
});

/* Download GPA CSV */

document.getElementById("download-gpa")?.addEventListener("click", () => {
  if (!latestGPAResult) return;

  const rows = [["Course", "Credits", "Grade Point"]];

  latestGPAResult.courses.forEach((course) => {
    rows.push([course.name, course.credits, course.gradePoint]);
  });

  rows.push(["Total Credits", latestGPAResult.totalCredits, ""]);
  rows.push(["GPA", latestGPAResult.gpa, ""]);

  const csv = rows
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "gpa-result.csv";
  link.click();

  URL.revokeObjectURL(url);
});

/* Print GPA */

document.getElementById("print-gpa")?.addEventListener("click", () => {
  window.print();
});

/* =========================
CGPA CALCULATOR
========================= */

document.getElementById("calculate-cgpa")?.addEventListener("click", () => {
  showMessage("cgpa-message", "");

  const scale = Number(document.getElementById("cgpa-scale").value);

  const previousCgpa = Number(document.getElementById("previous-cgpa").value);

  const previousCredits = Number(
    document.getElementById("previous-credits").value,
  );

  const currentGpa = Number(document.getElementById("current-gpa").value);

  const currentCredits = Number(
    document.getElementById("current-credits").value,
  );

  const fields = [
    "previous-cgpa",
    "previous-credits",
    "current-gpa",
    "current-credits",
  ];

  if (fields.some((id) => !validNumber(document.getElementById(id).value))) {
    showMessage(
      "cgpa-message",
      "Please complete all fields with valid numbers.",
    );
    return;
  }

  if (
    previousCgpa < 0 ||
    previousCgpa > scale ||
    currentGpa < 0 ||
    currentGpa > scale ||
    previousCredits < 0 ||
    currentCredits <= 0
  ) {
    showMessage(
      "cgpa-message",
      `GPA values must be between 0 and ${scale}. Previous credits cannot be negative and current credits must be above zero.`,
    );
    return;
  }

  const totalCredits = previousCredits + currentCredits;

  const cgpa =
    (previousCgpa * previousCredits + currentGpa * currentCredits) /
    totalCredits;

  const result = document.getElementById("cgpa-result");

  result.innerHTML = `
    <h2>Your New CGPA: ${formatNumber(cgpa)}</h2>
    <p><strong>Total Credit Hours:</strong> ${formatNumber(totalCredits)}</p>
`;

  result.classList.remove("hidden");
});

/* =========================
GPA PREDICTOR
========================= */

document
  .getElementById("calculate-predictor")
  ?.addEventListener("click", () => {
    showMessage("predictor-message", "");

    const scale = Number(document.getElementById("predict-scale").value);

    const currentCgpa = Number(document.getElementById("current-cgpa").value);

    const completedCredits = Number(
      document.getElementById("completed-credits").value,
    );

    const targetCgpa = Number(document.getElementById("target-cgpa").value);

    const upcomingCredits = Number(
      document.getElementById("upcoming-credits").value,
    );

    const fields = [
      "current-cgpa",
      "completed-credits",
      "target-cgpa",
      "upcoming-credits",
    ];

    if (fields.some((id) => !validNumber(document.getElementById(id).value))) {
      showMessage(
        "predictor-message",
        "Please complete all fields with valid numbers.",
      );
      return;
    }

    if (
      currentCgpa < 0 ||
      currentCgpa > scale ||
      targetCgpa < 0 ||
      targetCgpa > scale ||
      completedCredits < 0 ||
      upcomingCredits <= 0
    ) {
      showMessage(
        "predictor-message",
        `CGPA values must be between 0 and ${scale}. Completed credits cannot be negative and upcoming credits must be above zero.`,
      );
      return;
    }

    const requiredGpa =
      (targetCgpa * (completedCredits + upcomingCredits) -
        currentCgpa * completedCredits) /
      upcomingCredits;

    const result = document.getElementById("predictor-result");

    if (requiredGpa > scale) {
      result.innerHTML = `
        <h2>Target Not Achievable Within These Credits</h2>
        <p>You would need a GPA of <strong>${formatNumber(requiredGpa)}</strong>, which is above the maximum of ${scale.toFixed(1)}.</p>
        <p>Consider a lower target or more upcoming credit hours.</p>
    `;
    } else if (requiredGpa <= 0) {
      result.innerHTML = `
        <h2>You Have Already Reached Your Target</h2>
        <p>Based on the figures entered, a GPA of 0.00 or higher over the upcoming credits would keep you at or above your target.</p>
    `;
    } else {
      result.innerHTML = `
        <h2>Required GPA: ${formatNumber(requiredGpa)}</h2>
        <p>You need approximately <strong>${formatNumber(requiredGpa)}</strong> GPA across your next ${formatNumber(upcomingCredits)} credit hours to reach a CGPA of ${formatNumber(targetCgpa)}.</p>
    `;
    }

    result.classList.remove("hidden");
  });

/* =========================
HISTORY PAGE
========================= */

const historyList = document.getElementById("history-list");

function displayHistory() {
  if (!historyList) return;

  const history = getHistory();

  if (!history.length) {
    historyList.innerHTML = `
        <div class="history-item">
            <p>No saved GPA results yet. Calculate and save a GPA to see it here.</p>
        </div>
    `;
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
    <article class="history-item">
        <h3>${escapeHTML(item.semester || "GPA Result")} — GPA: ${formatNumber(item.gpa)}</h3>

        <p><strong>Date:</strong> ${escapeHTML(item.date || "")}</p>

        <p>
            <strong>Scale:</strong> ${escapeHTML(item.scale || "Not specified")}
            |
            <strong>Total Credits:</strong> ${formatNumber(item.totalCredits || 0)}
        </p>

        <details>
            <summary>View Courses</summary>

            <ul class="history-courses">
                ${(item.courses || [])
                  .map(
                    (course) => `
                    <li>
                        ${escapeHTML(course.name)} —
                        ${formatNumber(course.credits)} credits,
                        grade point ${formatNumber(course.gradePoint)}
                    </li>
                `,
                  )
                  .join("")}
            </ul>
        </details>

        <button
            class="btn danger delete-history"
            data-id="${escapeHTML(item.id || "")}"
            type="button">
            Delete
        </button>
    </article>
`,
    )
    .join("");
}

if (historyList) {
  displayHistory();
  historyList.addEventListener("click", (event) => {
    const button = event.target.closest(".delete-history");

    if (!button) return;

    const updatedHistory = getHistory().filter(
      (item) => String(item.id) !== button.dataset.id,
    );
    saveHistory(updatedHistory);
    displayHistory();
  });
}

document.getElementById("clear-history")?.addEventListener("click", () => {
  const history = getHistory();

  if (!history.length) {
    alert("There is no history to clear.");
    return;
  }

  if (confirm("Are you sure you want to delete all saved GPA results?")) {
    saveHistory([]);
    displayHistory();
  }
});
