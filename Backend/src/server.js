import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import milestoneRoutes from './routes/milestoneRoutes.js'; 
import progressUpdateRoutes from './routes/progressUpdateRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import commentRoutes from './routes/commentRoutes.js'; 
import documentRoutes from './routes/documentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import authRoutes from './routes/authRoutes.js';        
import adminRoutes from './routes/adminRoutes.js';
import auditRoutes from './routes/auditRoutes.js'; // ✅ default export
import settingsRoutes from "./routes/settingsRoute.js";


const app = express();
const port = process.env.PORT || 5001;
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);           
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/milestones', milestoneRoutes); 
app.use('/api/updates', progressUpdateRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/comments', commentRoutes); 
app.use('/api/documents', documentRoutes);
app.use('/api/expenses', expenseRoutes); 
app.use('/api/tasks', taskRoutes);

//admin settings
app.use("/api/admin/settings", settingsRoutes);

// Audit routes
app.use('/api/admin/audit-logs', auditRoutes); // admin-protected
app.use('/api/audit-logs', auditRoutes);       // optional public

// Start server
app.listen(port, () => {
  console.log(`BuildWise server started on port ${port}`);
});
