import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

mongoose.connect(
  'mongodb+srv://mairispelss:pqXnKfezYIqJQdgG@cluster0.u2bjp7y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
);

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: {type: String,default: 'incomplete',}, 
  createdAt: {type: Date,default: Date.now,},
  updatedAt: {type: Date,default: Date.now,},
});

const Task = mongoose.model('Task', taskSchema);
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../../')));
app.use('/css', express.static(path.join(__dirname, '../../src/css')));
app.use('/js', express.static(path.join(__dirname, '../../src/js')));

app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/tasks', async (req, res) => {
    const { title, description, status } = req.body;
    const task = new Task({ title, description, status });
    try {
      const newTask = await task.save();
      res.status(201).json(newTask);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });


app.put('/tasks/:id', async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    res.json({ message: 'Task updated' });
    return res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});