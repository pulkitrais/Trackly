import app from './app.js';

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Trackly backend listening on http://localhost:${PORT}`);
});
