import express from 'express';
import cookieParser from 'cookie-parser';
import 'express-async-errors';
import { connectDb } from './lib/db.js';
import authRouter from './routes/auth.js';
import customerRouter from './routes/customer.js';
import adminRouter from './routes/admin.js';
import shopRouter from './routes/shop.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    res.status(500).json({ error: 'database connection failed' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/customer', customerRouter);
app.use('/api/admin', adminRouter);
app.use('/api/shop', shopRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'server error' });
});

export default app;
