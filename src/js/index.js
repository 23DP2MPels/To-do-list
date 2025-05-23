import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// JWT Secret (In production, use environment variable)
const JWT_SECRET = 'your-secret-key-change-in-production';

mongoose.connect(
  'mongodb+srv://mairispelss:pqXnKfezYIqJQdgG@cluster0.u2bjp7y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
);

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  }
}, {
  timestamps: true
});

// Task Schema with userId reference
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    default: 'incomplete'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

app.use(cors());
app.use(bodyParser.json());

// Static files
app.use(express.static(path.join(__dirname, '../../')));
app.use('/css', express.static(path.join(__dirname, '../../src/css')));
app.use('/js', express.static(path.join(__dirname, '../../src/js')));

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Nav piekļuves tiesību' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Nederīgs tokens' });
    }
    req.user = user;
    next();
  });
};

// User Registration
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Lietotājvārds un parole ir obligāti' });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'Lietotājvārdam jābūt vismaz 3 simboli garam' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Parolei jābūt vismaz 6 simboli garai' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Lietotājs ar šādu vārdu jau eksistē' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Lietotājs veiksmīgi reģistrēts',
      token,
      user: { id: user._id, username: user.username }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Servera kļūda' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Lietotājvārds un parole ir obligāti' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Nepareizs lietotājvārds vai parole' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Nepareizs lietotājvārds vai parole' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Veiksmīga pieslēgšanās',
      token,
      user: { id: user._id, username: user.username }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Servera kļūda' });
  }
});

// Protected Routes for Tasks

// Get all tasks for authenticated user
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.userId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific task for authenticated user
app.get('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!task) {
      return res.status(404).json({ message: "Uzdevums nav atrasts" });
    }
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new task for authenticated user
app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, status } = req.body;
    
    const task = new Task({ 
      title, 
      description, 
      status,
      userId: req.user.userId
    });
    
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task for authenticated user
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!updatedTask) {
      return res.status(404).json({ message: "Uzdevums nav atrasts" });
    }
    
    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete task for authenticated user
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    
    if (!deletedTask) {
      return res.status(404).json({ message: "Uzdevums nav atrasts" });
    }
    
    res.json({ message: 'Uzdevums dzēsts' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Validate token endpoint
app.get('/validate-token', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: { id: req.user.userId, username: req.user.username } 
  });
});

const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});