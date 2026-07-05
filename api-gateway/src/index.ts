import app from './app';

const PORT = process.env.GATEWAY_PORT || 4000;
app.listen(PORT, () => console.log(`API Gateway (Clerk) running on port ${PORT}`));
