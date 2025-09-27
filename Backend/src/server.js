import express from 'express';
import cors from 'cors';

// Import all your route files
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import milestoneRoutes from './routes/milestoneRoutes.js'; 
import progressUpdateRoutes from './routes/progressUpdateRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import commentRoutes from './routes/commentRoutes.js'; 
import documentRoutes from './routes/documentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js'; // ADD THIS LINE

const app = express();
const port = 5001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Routes ---
// This tells Express to use the correct route file for each base URL
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/milestones', milestoneRoutes); 
app.use('/api/updates', progressUpdateRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/comments', commentRoutes); 
app.use('/api/documents', documentRoutes);
app.use('/api/expenses', expenseRoutes); // ADD THIS LINE

// --- Server Start ---
app.listen(port, () => {
  console.log(`BuildWise server started on port ${port}`);
});