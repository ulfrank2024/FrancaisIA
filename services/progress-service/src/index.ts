import app from './app';

const PORT = process.env.PROGRESS_PORT || 4004;
app.listen(PORT, () => console.log(`Progress service running on port ${PORT}`));
