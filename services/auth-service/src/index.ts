import app from './app';

const PORT = process.env.AUTH_PORT || 4001;
app.listen(PORT, () => console.log(`Auth webhook service running on port ${PORT}`));
