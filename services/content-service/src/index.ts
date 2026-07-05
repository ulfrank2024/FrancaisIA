import app from './app';

const PORT = process.env.CONTENT_PORT || 4002;
app.listen(PORT, () => console.log(`Content service running on port ${PORT}`));
