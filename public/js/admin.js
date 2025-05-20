document.addEventListener("DOMContentLoaded", () => {
  const fileSelect = document.getElementById("fileSelect");
  const tableContainer = document.getElementById("tableContainer");
  const refreshBtn = document.getElementById("refreshBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  let currentFile = null;
  let currentData = [];

  // Load available JSON files
  fetch("/api/admin/files")
    .then(res => res.json())
    .then(files => {
      files.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        fileSelect.appendChild(opt);
      });
      if (files.length) {
        fileSelect.value = files[0];
        loadTable(files[0]);
      }
    });
     if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Get username from URL
      const params = new URLSearchParams(window.location.search);
      const username = params.get("username");
      fetch("/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      })
        .then(res => res.json())
        .then(() => {
          window.location.href = "/login.html";
        });
    });
  }

  fileSelect.addEventListener("change", () => {
    loadTable(fileSelect.value);
  });

  refreshBtn.addEventListener("click", () => {
    if (currentFile) loadTable(currentFile);
  });

  function loadTable(filename) {
    currentFile = filename;
    fetch(`/api/admin/data/${filename}`)
      .then(res => res.json())
      .then(data => {
        currentData = data;
        renderTable(data);
      });
  }

  function renderTable(data) {
    tableContainer.innerHTML = "";
    if (!Array.isArray(data) || !data.length) {
      tableContainer.textContent = "No data.";
      return;
    }
    const fields = Object.keys(data[0]);
    const table = document.createElement("table");
    table.className = "dashboard-table";
    // Header
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    fields.forEach(f => {
      const th = document.createElement("th");
      th.textContent = f;
      tr.appendChild(th);
    });
    tr.appendChild(document.createElement("th")).textContent = "Actions";
    thead.appendChild(tr);
    table.appendChild(thead);
    // Body
    const tbody = document.createElement("tbody");
    data.forEach(row => {
      const tr = document.createElement("tr");
      fields.forEach(f => {
        const td = document.createElement("td");
        td.textContent = row[f];
        tr.appendChild(td);
      });
      // Actions
      const td = document.createElement("td");
      td.innerHTML = `
        <button class="editBtn">Edit</button>
        <button class="deleteBtn">Delete</button>
      `;
      td.querySelector(".editBtn").onclick = () => editRow(row);
      td.querySelector(".deleteBtn").onclick = () => deleteRow(row.id);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    // Add new row
    const addTr = document.createElement("tr");
    fields.forEach(f => {
      const td = document.createElement("td");
      td.innerHTML = `<input type="text" name="${f}" placeholder="${f}">`;
      addTr.appendChild(td);
    });
    const addTd = document.createElement("td");
    addTd.innerHTML = `<button id="addBtn">Add</button>`;
    addTr.appendChild(addTd);
    tbody.appendChild(addTr);
    table.appendChild(tbody);
    tableContainer.appendChild(table);

    document.getElementById("addBtn").onclick = () => {
      const inputs = addTr.querySelectorAll("input");
      const newItem = {};
      inputs.forEach((input, i) => {
        newItem[fields[i]] = parseValue(input.value, data[0][fields[i]]);
      });
      fetch(`/api/admin/data/${currentFile}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      }).then(() => loadTable(currentFile));
    };
  }

  function editRow(row) {
    const fields = Object.keys(row);
    const tr = document.createElement("tr");
    fields.forEach(f => {
      const td = document.createElement("td");
      td.innerHTML = `<input type="text" name="${f}" value="${row[f]}">`;
      tr.appendChild(td);
    });
    const td = document.createElement("td");
    td.innerHTML = `<button id="saveBtn">Save</button>`;
    tr.appendChild(td);
    const oldTr = [...tableContainer.querySelectorAll("tbody tr")].find(r => {
      return r.children[0].textContent == row[fields[0]];
    });
    oldTr.replaceWith(tr);
    td.querySelector("#saveBtn").onclick = () => {
      const inputs = tr.querySelectorAll("input");
      const updated = {};
      inputs.forEach((input, i) => {
        updated[fields[i]] = parseValue(input.value, row[fields[i]]);
      });
      fetch(`/api/admin/data/${currentFile}/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      }).then(() => loadTable(currentFile));
    };
  }

  function deleteRow(id) {
    if (!confirm("Delete this entry?")) return;
    fetch(`/api/admin/data/${currentFile}/${id}`, { method: "DELETE" })
      .then(() => loadTable(currentFile));
  }

  function parseValue(val, sample) {
    if (typeof sample === "number") return Number(val);
    if (typeof sample === "boolean") return val === "true";
    return val;
  }
});