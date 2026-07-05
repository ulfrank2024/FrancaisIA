import app from './app';

const PORT = process.env.AI_PORT || 4003;
app.listen(PORT, () => console.log(`AI service running on port ${PORT}`));
