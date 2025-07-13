document.addEventListener("DOMContentLoaded", function () {
  const state = {
    todos: JSON.parse(localStorage.getItem("hierarchicalTodos")) || [],
    currentView: "home",
    timer: {
      running: false,
      startTime: null,
      elapsed: 0,
      interval: null,
      currentTask: null,
    },
  };

  const elements = {
    views: {
      home: document.getElementById("home-view"),
      create: document.getElementById("create-view"),
      view: document.getElementById("view-view"),
    },
    navButtons: {
      home: document.getElementById("nav-home"),
      create: document.getElementById("nav-create"),
      view: document.getElementById("nav-view"),
      theme: document.getElementById("nav-theme"),
    },
    stats: {
      categories: document.getElementById("total-categories"),
      topics: document.getElementById("total-topics"),
      todos: document.getElementById("total-todos"),
    },
    createForm: {
      categoryInput: document.getElementById("category-name"),
      topicInput: document.getElementById("topic-name"),
      todoInput: document.getElementById("todo-name"),
      timeSelect: document.getElementById("todo-time"),
      addCategoryBtn: document.getElementById("add-category-btn"),
      addTopicBtn: document.getElementById("add-topic-btn"),
      addTodoBtn: document.getElementById("add-todo-btn"),
      saveBtn: document.getElementById("save-structure-btn"),
      resetBtn: document.getElementById("reset-form-btn"),
      activeCategory: document.getElementById("active-category"),
      activeTopic: document.getElementById("active-topic"),
      topicSection: document.getElementById("topic-section"),
      todoSection: document.getElementById("todo-section"),
      todosList: document.getElementById("todos-list"),
      currentCategoryName: document.getElementById("current-category-name"),
      currentTopicName: document.getElementById("current-topic-name"),
    },
    todoContainer: document.getElementById("todo-structures"),
    timerModal: document.getElementById("timer-modal"),
    timerDisplay: document.getElementById("timer-display"),
    timerControls: {
      start: document.getElementById("start-timer"),
      pause: document.getElementById("pause-timer"),
      reset: document.getElementById("reset-timer"),
    },
    currentTaskDisplay: document.querySelector("#current-task span"),
    toast: document.getElementById("toast"),
    closeModalBtn: document.querySelector(".close-modal"),
  };

  let currentStructure = {
    category: null,
    topics: [],
  };

  function init() {
    setupEventListeners();
    setupCreateView();
    updateStats();
    renderTodos();
    showView("home");
    checkSavedTheme();
  }

  function setupEventListeners() {
    elements.navButtons.home.addEventListener("click", () => showView("home"));
    elements.navButtons.create.addEventListener("click", () =>
      showView("create")
    );
    elements.navButtons.view.addEventListener("click", () => showView("view"));
    elements.navButtons.theme.addEventListener("click", toggleTheme);
    elements.timerControls.start.addEventListener("click", startTimer);
    elements.timerControls.pause.addEventListener("click", pauseTimer);
    elements.timerControls.reset.addEventListener("click", resetTimer);
    elements.closeModalBtn.addEventListener("click", hideTimerModal);
    elements.timerModal.addEventListener("click", (e) => {
      if (e.target === elements.timerModal) hideTimerModal();
    });
  }

  function setupCreateView() {
    elements.createForm.addCategoryBtn.addEventListener("click", () => {
      const name = elements.createForm.categoryInput.value.trim();
      if (!name) return showToast("Please enter a category name", "error");

      currentStructure.category = {
        id: generateId(),
        name,
        topics: [],
      };

      elements.createForm.currentCategoryName.textContent = name;
      elements.createForm.activeCategory.style.display = "block";
      elements.createForm.topicSection.style.display = "block";
      elements.createForm.categoryInput.disabled = true;
      showToast(`Category "${name}" created. Now add topics.`);
    });

    elements.createForm.addTopicBtn.addEventListener("click", () => {
      const name = elements.createForm.topicInput.value.trim();
      if (!name) return showToast("Please enter a topic name", "error");
      if (!currentStructure.category)
        return showToast("Create a category first", "error");

      const newTopic = {
        id: generateId(),
        name,
        todos: [],
      };

      currentStructure.topics.push(newTopic);
      currentStructure.category.topics = currentStructure.topics;
      elements.createForm.topicInput.value = "";
      renderTopicCheckboxes();
      showToast(`Topic "${name}" added. Add more topics or create todos.`);
    });

    function renderTopicCheckboxes() {
      const container = document.createElement("div");
      container.id = "topic-checkboxes";
      container.innerHTML = "<h4>Select Topics for Todo:</h4>";

      currentStructure.category.topics.forEach((topic) => {
        const div = document.createElement("div");
        div.className = "topic-checkbox";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `topic-${topic.id}`;
        checkbox.value = topic.id;

        const label = document.createElement("label");
        label.htmlFor = `topic-${topic.id}`;
        label.textContent = topic.name;

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
      });

      const existingContainer = document.getElementById("topic-checkboxes");
      if (existingContainer) {
        existingContainer.replaceWith(container);
      } else {
        elements.createForm.todoSection.insertBefore(
          container,
          elements.createForm.addTodoBtn
        );
      }

      // Show todo section if there are topics
      if (currentStructure.category.topics.length > 0) {
        elements.createForm.todoSection.style.display = "block";
      }
    }

    elements.createForm.addTodoBtn.addEventListener("click", () => {
      const text = elements.createForm.todoInput.value.trim();
      if (!text) return showToast("Please enter a todo item", "error");

      const checkboxes = document.querySelectorAll(
        '#topic-checkboxes input[type="checkbox"]:checked'
      );
      if (checkboxes.length === 0)
        return showToast("Please select at least one topic", "error");

      const selectedTopicIds = Array.from(checkboxes).map((cb) => cb.value);
      const todo = {
        id: generateId(),
        text,
        time: elements.createForm.timeSelect.value,
        done: false,
        createdAt: new Date().toISOString(),
        topicIds: selectedTopicIds,
      };

      // Add todo to each selected topic
      selectedTopicIds.forEach((topicId) => {
        const topic = currentStructure.category.topics.find(
          (t) => t.id === topicId
        );
        if (topic) {
          topic.todos.push(todo);
        }
      });

      updateTodosList();
      elements.createForm.todoInput.value = "";
      elements.createForm.saveBtn.style.display = "inline-block";
      showToast("Todo added. Add more or save structure.");
    });

    function updateTodosList() {
      elements.createForm.todosList.innerHTML = "";

      // Get all unique todos across all topics
      const allTodos = [];
      const todoIds = new Set();

      currentStructure.category.topics.forEach((topic) => {
        topic.todos.forEach((todo) => {
          if (!todoIds.has(todo.id)) {
            todoIds.add(todo.id);
            allTodos.push(todo);
          }
        });
      });

      allTodos.forEach((todo) => {
        const li = document.createElement("li");
        const topicNames = currentStructure.category.topics
          .filter((t) => todo.topicIds.includes(t.id))
          .map((t) => t.name)
          .join(", ");

        li.innerHTML = `
          <span>${todo.text}</span>
          <small class="todo-topics">Topics: ${topicNames}</small>
          ${
            todo.time
              ? `<small class="todo-time"><i class="fas fa-clock"></i> ${todo.time}</small>`
              : ""
          }
        `;
        elements.createForm.todosList.appendChild(li);
      });
    }

    elements.createForm.saveBtn.addEventListener("click", () => {
      if (
        !currentStructure.category ||
        currentStructure.category.topics.length === 0
      )
        return showToast("Please add at least one topic", "error");

      // Check if any todos exist
      const hasTodos = currentStructure.category.topics.some(
        (topic) => topic.todos.length > 0
      );
      if (!hasTodos) return showToast("Please add at least one todo", "error");

      state.todos.push(currentStructure.category);
      saveToLocalStorage();
      resetCreateForm();
      showView("home");
      updateStats();
      showToast("Structure saved successfully!");
    });

    elements.createForm.resetBtn.addEventListener("click", resetCreateForm);
  }

  function resetCreateForm() {
    currentStructure = { category: null, topics: [] };
    elements.createForm.categoryInput.value = "";
    elements.createForm.topicInput.value = "";
    elements.createForm.todoInput.value = "";
    elements.createForm.timeSelect.value = "";
    elements.createForm.categoryInput.disabled = false;
    elements.createForm.topicInput.disabled = false;
    elements.createForm.activeCategory.style.display = "none";
    elements.createForm.activeTopic.style.display = "none";
    elements.createForm.topicSection.style.display = "none";
    elements.createForm.todoSection.style.display = "none";
    elements.createForm.saveBtn.style.display = "none";
    elements.createForm.todosList.innerHTML = "";

    const checkboxes = document.getElementById("topic-checkboxes");
    if (checkboxes) checkboxes.remove();
  }

  function showView(viewName) {
    Object.values(elements.views).forEach((v) =>
      v.classList.remove("active-view")
    );
    Object.values(elements.navButtons).forEach((b) =>
      b.classList.remove("active")
    );
    elements.views[viewName].classList.add("active-view");
    elements.navButtons[viewName].classList.add("active");
    state.currentView = viewName;
    if (viewName === "view") renderTodos();
    else if (viewName === "home") updateStats();
    else if (viewName === "create") resetCreateForm();
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    const icon = elements.navButtons.theme.querySelector("i");
    icon.className = next === "dark" ? "fas fa-sun" : "fas fa-moon";
    showToast(`Switched to ${next} mode`);
  }

  function checkSavedTheme() {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
    elements.navButtons.theme.querySelector("i").className =
      theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }

  function renderTodos() {
    elements.todoContainer.innerHTML = "";
    if (state.todos.length === 0) {
      elements.todoContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>No todo structures found. Create one to get started!</p>
        </div>
      `;
      return;
    }

    state.todos.forEach((category) => {
      const categoryEl = document.createElement("div");
      categoryEl.className = "todo-structure";
      categoryEl.innerHTML = `
        <h3>${category.name}</h3>
        <div class="category-actions">
          <button class="btn-secondary category-timer-btn" data-category-id="${category.id}">
            <i class="fas fa-clock"></i> Start Timer
          </button>
        </div>
      `;

      // Get all unique todos across all topics in this category
      const allTodos = [];
      const todoIds = new Set();

      category.topics.forEach((topic) => {
        topic.todos.forEach((todo) => {
          if (!todoIds.has(todo.id)) {
            todoIds.add(todo.id);
            allTodos.push({
              ...todo,
              topics: category.topics.filter((t) =>
                todo.topicIds.includes(t.id)
              ),
            });
          }
        });
      });

      // Render todos grouped by their topics
      allTodos.forEach((todo) => {
        const todoEl = document.createElement("div");
        todoEl.className = `todo-item ${todo.done ? "done" : ""}`;

        const topicNames = todo.topics.map((t) => t.name).join(", ");

        todoEl.innerHTML = `
          <input type="checkbox" id="todo-${todo.id}" ${
          todo.done ? "checked" : ""
        }
            data-todo-id="${todo.id}">
          <label for="todo-${todo.id}">${todo.text}</label>
          <small class="todo-topics">Topics: ${topicNames}</small>
          ${
            todo.time
              ? `<span class="todo-time"><i class="fas fa-clock"></i> ${todo.time}</span>`
              : ""
          }
          <div class="todo-actions">
            <button class="todo-timer-btn" data-todo-id="${todo.id}">
              <i class="fas fa-play"></i>
            </button>
            <button class="todo-delete-btn" data-todo-id="${todo.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        categoryEl.appendChild(todoEl);
      });

      elements.todoContainer.appendChild(categoryEl);
    });

    // Update event listeners
    document.querySelectorAll(".todo-timer-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const todoId = this.dataset.todoId;
        const todo = findTodoById(todoId);
        if (todo) {
          const category = state.todos.find((c) =>
            c.topics.some((t) => t.todos.some((td) => td.id === todoId))
          );
          const topicNames = todo.topics.map((t) => t.name).join(", ");
          resetTimer();
          showTimerModal(`${category.name} > ${topicNames} > ${todo.text}`);
        }
      });
    });

    document.querySelectorAll(".category-timer-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const category = state.todos.find(
          (c) => c.id === this.dataset.categoryId
        );
        if (category) {
          resetTimer();
          showTimerModal(`All tasks in ${category.name}`);
        }
      });
    });

    document.querySelectorAll(".todo-delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        deleteTodo(this.dataset.todoId);
      });
    });

    document.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.addEventListener("change", function () {
        toggleTodoStatus(this.dataset.todoId);
      });
    });
  }

  function findTodoById(todoId) {
    for (const category of state.todos) {
      for (const topic of category.topics) {
        const todo = topic.todos.find((t) => t.id === todoId);
        if (todo) {
          return {
            ...todo,
            topics: category.topics.filter((t) => todo.topicIds.includes(t.id)),
          };
        }
      }
    }
    return null;
  }

  function showTimerModal(taskName = null) {
    if (taskName) {
      state.timer.currentTask = taskName;
      elements.currentTaskDisplay.textContent = taskName;
    }
    elements.timerModal.classList.add("active");
  }

  function hideTimerModal() {
    elements.timerModal.classList.remove("active");
  }

  function startTimer() {
    if (!state.timer.running) {
      state.timer.startTime = Date.now() - state.timer.elapsed;
      state.timer.running = true;
      state.timer.interval = setInterval(updateTimerDisplay, 1000);
      elements.timerControls.start.disabled = true;
      elements.timerControls.pause.disabled = false;
    }
  }

  function pauseTimer() {
    if (state.timer.running) {
      clearInterval(state.timer.interval);
      state.timer.running = false;
      elements.timerControls.start.disabled = false;
      elements.timerControls.pause.disabled = true;
    }
  }

  function resetTimer() {
    clearInterval(state.timer.interval);
    state.timer = {
      running: false,
      startTime: null,
      elapsed: 0,
      interval: null,
      currentTask: null,
    };
    elements.timerDisplay.textContent = "00:00:00";
    elements.timerControls.start.disabled = false;
    elements.timerControls.pause.disabled = true;
    elements.currentTaskDisplay.textContent = "No task selected";
  }

  function updateTimerDisplay() {
    const elapsed = Date.now() - state.timer.startTime;
    state.timer.elapsed = elapsed;
    const h = String(Math.floor(elapsed / 3600000)).padStart(2, "0");
    const m = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");
    elements.timerDisplay.textContent = `${h}:${m}:${s}`;
  }

  function toggleTodoStatus(todoId) {
    let found = false;
    for (const category of state.todos) {
      for (const topic of category.topics) {
        const todo = topic.todos.find((t) => t.id === todoId);
        if (todo) {
          todo.done = !todo.done;
          todo.updatedAt = new Date().toISOString();
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (found) {
      saveToLocalStorage();
      renderTodos();
    }
  }

  function deleteTodo(todoId) {
    for (const category of state.todos) {
      for (const topic of category.topics) {
        topic.todos = topic.todos.filter((t) => t.id !== todoId);
      }
      // Remove empty topics
      category.topics = category.topics.filter(
        (topic) => topic.todos.length > 0
      );
    }
    // Remove empty categories
    state.todos = state.todos.filter((category) => category.topics.length > 0);

    saveToLocalStorage();
    renderTodos();
    updateStats();
    showToast("Todo deleted successfully");
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function saveToLocalStorage() {
    localStorage.setItem("hierarchicalTodos", JSON.stringify(state.todos));
  }

  function updateStats() {
    const catCount = state.todos.length;
    const topicCount = state.todos.reduce((sum, c) => sum + c.topics.length, 0);

    // Count unique todos across all categories and topics
    const todoIds = new Set();
    state.todos.forEach((category) => {
      category.topics.forEach((topic) => {
        topic.todos.forEach((todo) => {
          todoIds.add(todo.id);
        });
      });
    });

    elements.stats.categories.textContent = catCount;
    elements.stats.topics.textContent = topicCount;
    elements.stats.todos.textContent = todoIds.size;
  }

  document.getElementById('download-pdf').addEventListener('click', function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const leftMargin = 15;
    const rightMargin = 195;
    const lineHeight = 7;
    const sectionGap = 10;
  
    // Safe default font (ASCII compatible)
    doc.setFont('times', 'normal');
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text("Todo List Export", leftMargin, y);
    y += lineHeight;
  
    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, leftMargin, y);
    y += sectionGap;
  
    if (!state.todos || state.todos.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("No todos available to export.", leftMargin, y);
    } else {
      // Table headers
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(230, 230, 230);
      doc.rect(leftMargin, y - 5, rightMargin - leftMargin, 8, 'F');
      doc.text("Category", leftMargin, y);
      doc.text("Topic", leftMargin + 60, y);
      doc.text("Tasks", leftMargin + 120, y);
      y += lineHeight + 3;
  
      state.todos.forEach((category, i) => {
        const catName = `${i + 1}. ${category.name}`;
  
        category.topics.forEach((topic, j) => {
          const topicName = `${String.fromCharCode(97 + j)}. ${topic.name}`;
  
          topic.todos.forEach((todo, k) => {
            const status = todo.done ? "✔" : "☐";
            const taskText = `${status} ${todo.name || todo.text}`;
            const timeText = todo.time ? ` (${todo.time})` : '';
  
            // Wrap taskText
            const taskLines = doc.splitTextToSize(taskText, 65);
  
            // Draw each column
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(catName, leftMargin, y);
            doc.text(topicName, leftMargin + 60, y);
            doc.text(taskLines, leftMargin + 120, y);
  
            // Time (right-aligned, optional)
            if (todo.time) {
              doc.setFontSize(9);
              doc.setTextColor(120, 120, 120);
              doc.text(timeText, rightMargin - 30, y);
            }
  
            y += taskLines.length * lineHeight;
  
            // Page break
            if (y > 275) {
              doc.addPage();
              y = 20;
            }
          });
  
          y += 4; // Space after topic
        });
  
        // Divider
        doc.setDrawColor(180, 180, 180);
        doc.line(leftMargin, y, rightMargin, y);
        y += sectionGap;
      });
    }
  
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Exported from TodoHierarchy App", leftMargin, 290);
  
    // Save file
    const fileName = `todo-export-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  });
  

  init();
});
