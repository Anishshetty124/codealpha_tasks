import express from 'express';
import mongoose from 'mongoose';

const app = express();
app.use(express.json());

await mongoose.connect('mongodb://127.0.0.1:27017/project_management');

const TaskSchema = new mongoose.Schema({
  title: String,
  completed: { type: Boolean, default: false }
});

const ProjectSchema = new mongoose.Schema({
  name: String,
  tasks: [TaskSchema]
});

const Project = mongoose.model('Project', ProjectSchema);

// Serve frontend HTML+CSS+JS inline
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Project Management Tool</title>
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 900px;
    margin: 30px auto;
    background: #f0f4f8;
    padding: 20px;
  }
  h1 { text-align: center; color: #2c3e50; }
  #add-project-form {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    justify-content: center;
  }
  #add-project-form input {
    flex: 1 1 300px;
    padding: 10px;
    font-size: 1rem;
  }
  #add-project-form button {
    padding: 10px 20px;
    background: #3498db;
    border: none;
    color: white;
    font-weight: bold;
    border-radius: 4px;
    cursor: pointer;
  }
  #projects {
    margin-top: 20px;
  }
  .project {
    background: white;
    border-radius: 8px;
    box-shadow: 0 0 6px rgba(0,0,0,0.1);
    margin-bottom: 20px;
    padding: 15px;
  }
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .project-header h2 {
    margin: 0;
    color: #34495e;
  }
  .delete-project {
    cursor: pointer;
    background: #e74c3c;
    border: none;
    color: white;
    padding: 6px 12px;
    border-radius: 5px;
  }
  .task-list {
    margin-top: 15px;
  }
  .task {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }
  .task:last-child {
    border-bottom: none;
  }
  .task input[type="checkbox"] {
    margin-right: 10px;
  }
  .task-title.completed {
    text-decoration: line-through;
    color: gray;
  }
  .delete-task {
    margin-left: auto;
    cursor: pointer;
    background: #c0392b;
    border: none;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .add-task-form {
    display: flex;
    margin-top: 10px;
    gap: 8px;
  }
  .add-task-form input {
    flex: 1;
    padding: 8px;
    font-size: 1rem;
  }
  .add-task-form button {
    padding: 8px 16px;
    background: #2ecc71;
    border: none;
    color: white;
    font-weight: bold;
    border-radius: 5px;
    cursor: pointer;
  }
  #message {
    text-align: center;
    color: red;
    margin-bottom: 10px;
  }
</style>
</head>
<body>

<h1>Project Management Tool</h1>

<div id="message"></div>

<form id="add-project-form">
  <input type="text" id="project-name" placeholder="New Project Name" required />
  <button type="submit">Add Project</button>
</form>

<div id="projects"></div>

<script>
  const messageDiv = document.getElementById('message');

  function showMessage(msg, isError = true) {
    messageDiv.textContent = msg;
    messageDiv.style.color = isError ? 'red' : 'green';
    if(msg) setTimeout(() => { messageDiv.textContent = ''; }, 3000);
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects');
      if(!res.ok) throw new Error('Failed to load projects');
      const projects = await res.json();
      renderProjects(projects);
    } catch(e) {
      showMessage(e.message);
    }
  }

  function renderProjects(projects) {
    const container = document.getElementById('projects');
    container.innerHTML = '';
    if(projects.length === 0) {
      container.innerHTML = '<p>No projects yet. Add one above.</p>';
      return;
    }

    projects.forEach(p => {
      const projDiv = document.createElement('div');
      projDiv.className = 'project';

      projDiv.innerHTML = \`
        <div class="project-header">
          <h2>\${p.name}</h2>
          <button class="delete-project" data-id="\${p._id}">Delete Project</button>
        </div>
        <div class="task-list"></div>
        <form class="add-task-form">
          <input type="text" placeholder="New Task" required />
          <button type="submit">Add Task</button>
        </form>
      \`;

      // Append tasks
      const taskList = projDiv.querySelector('.task-list');
      p.tasks.forEach(t => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task';

        taskDiv.innerHTML = \`
          <input type="checkbox" \${t.completed ? 'checked' : ''} data-project="\${p._id}" data-task="\${t._id}" />
          <span class="task-title \${t.completed ? 'completed' : ''}">\${t.title}</span>
          <button class="delete-task" data-project="\${p._id}" data-task="\${t._id}">Delete</button>
        \`;

        // Toggle complete
        taskDiv.querySelector('input[type=checkbox]').addEventListener('change', e => {
          toggleTaskComplete(p._id, t._id, e.target.checked);
        });
        // Delete task
        taskDiv.querySelector('.delete-task').addEventListener('click', e => {
          deleteTask(p._id, t._id);
        });

        taskList.appendChild(taskDiv);
      });

      // Delete project
      projDiv.querySelector('.delete-project').addEventListener('click', e => {
        deleteProject(p._id);
      });

      // Add task form
      const addTaskForm = projDiv.querySelector('.add-task-form');
      addTaskForm.addEventListener('submit', e => {
        e.preventDefault();
        const input = addTaskForm.querySelector('input');
        addTask(p._id, input.value);
        input.value = '';
      });

      container.appendChild(projDiv);
    });
  }

  async function addProject(name) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if(!res.ok) throw new Error('Failed to add project');
      showMessage('Project added', false);
      fetchProjects();
    } catch(e) {
      showMessage(e.message);
    }
  }

  async function deleteProject(id) {
    if(!confirm('Delete this project?')) return;
    try {
      const res = await fetch('/api/projects/' + id, { method: 'DELETE' });
      if(!res.ok) throw new Error('Failed to delete project');
      showMessage('Project deleted', false);
      fetchProjects();
    } catch(e) {
      showMessage(e.message);
    }
  }

  async function addTask(projectId, title) {
    if(!title.trim()) return;
    try {
      const res = await fetch('/api/projects/' + projectId + '/tasks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ title })
      });
      if(!res.ok) throw new Error('Failed to add task');
      showMessage('Task added', false);
      fetchProjects();
    } catch(e) {
      showMessage(e.message);
    }
  }

  async function deleteTask(projectId, taskId) {
    if(!confirm('Delete this task?')) return;
    try {
      const res = await fetch(\`/api/projects/\${projectId}/tasks/\${taskId}\`, { method: 'DELETE' });
      if(!res.ok) throw new Error('Failed to delete task');
      showMessage('Task deleted', false);
      fetchProjects();
    } catch(e) {
      showMessage(e.message);
    }
  }

  async function toggleTaskComplete(projectId, taskId, completed) {
    try {
      const res = await fetch(\`/api/projects/\${projectId}/tasks/\${taskId}\`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ completed })
      });
      if(!res.ok) throw new Error('Failed to update task');
      fetchProjects();
    } catch(e) {
      showMessage(e.message);
    }
  }

  document.getElementById('add-project-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('project-name');
    addProject(input.value.trim());
    input.value = '';
  });

  fetchProjects();
</script>

</body>
</html>
  `);
});

// API routes

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body;
    if(!name) return res.status(400).json({ message: 'Name required' });
    const project = new Project({ name, tasks: [] });
    await project.save();
    res.status(201).json(project);
  } catch {
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// Add task to project
app.post('/api/projects/:id/tasks', async (req, res) => {
  try {
    const { title } = req.body;
    if(!title) return res.status(400).json({ message: 'Title required' });
    const project = await Project.findById(req.params.id);
    if(!project) return res.status(404).json({ message: 'Project not found' });
    project.tasks.push({ title, completed: false });
    await project.save();
    res.status(201).json(project);
  } catch {
    res.status(500).json({ message: 'Failed to add task' });
  }
});

// Delete task from project
app.delete('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const project = await Project.findById(projectId);
    if(!project) return res.status(404).json({ message: 'Project not found' });
    project.tasks.id(taskId).remove();
    await project.save();
    res.json({ message: 'Task deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// Update task completed status
app.patch('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const { completed } = req.body;
    const project = await Project.findById(projectId);
    if(!project) return res.status(404).json({ message: 'Project not found' });
    const task = project.tasks.id(taskId);
    if(!task) return res.status(404).json({ message: 'Task not found' });
    task.completed = completed;
    await project.save();
    res.json({ message: 'Task updated' });
  } catch {
    res.status(500).json({ message: 'Failed to update task' });
  }
});

app.listen(5000, () => {
  console.log('Project Management Tool running at http://localhost:5000');
});
