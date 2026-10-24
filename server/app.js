const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const adminUserRoutes = require('./routes/adminUsers');
const employeeRoutes = require('./routes/employees');
const dependentRoutes = require('./routes/dependents');
const passRoutes = require('./routes/passes');
const verificationRoutes = require('./routes/verification');
const visitorLogRoutes = require('./routes/visitorLogs');
const adminRoutes = require('./routes/admin');
const internalRoutes = require('./routes/internal');
const registrationRoutes = require('./routes/registration');
const { apiLimiter } = require('./middleware/rateLimit');
const { authenticate } = require('./middleware/auth');
const { authorize } = require('./middleware/role');

const app = express();

app.use(helmet());

// Secure CORS configuration
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production' || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Not allowed by origin'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-cron-secret']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(mongoSanitize());

// Conditional logging (suppressed during automated tests, streamlined in production)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));
}

// Global API rate limiting
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'gate-pass-api' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/registration-requests', registrationRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dependents', dependentRoutes);
app.use('/api/admin/dependents', authenticate, authorize('admin'), dependentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/passes', passRoutes);
app.use('/api/passes', verificationRoutes);
app.use('/api/visitor-logs', visitorLogRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
});

app.use((error, _req, res, _next) => {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.error(error);
  }
  if (error.name === 'MulterError' || error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') {
    return res.status(422).json({ success: false, code: 'UPLOAD_INVALID', message: error.message });
  }
  const status = error.statusCode || 500;
  res.status(status).json({
    success: false,
    code: error.code || 'INTERNAL_ERROR',
    message: status === 500 ? 'Internal server error' : error.message,
    ...(error.details ? { details: error.details } : {})
  });
});

module.exports = app;