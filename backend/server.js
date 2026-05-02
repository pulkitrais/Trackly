import express from 'express';
import cors from 'cors';
import scanRouter from './routes/scan.js';
import exportRouter from './routes/export.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/', scanRouter);
app.use('/', exportRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Trackly backend listening on http://localhost:${PORT}`);
});
