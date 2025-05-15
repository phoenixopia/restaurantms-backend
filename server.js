require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust first proxy (needed for secure cookies and rate limiting behind a proxy)
app.set('trust proxy', 1);

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);


// 🛡️ Security: CORS with whitelist
const allowedOrigins = [process.env.CLIENT_URL];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 🔧 Middleware
app.use(morgan('dev'));
app.use(cookieParser());
// app.use(bodyParser.json({ limit: "25mb" }));
// app.use(bodyParser.urlencoded({ limit: "25mb", extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// DB connection and server start
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Connected to the database');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Unable to connect to the database:', error);
});


// API routes
const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoute');
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Health check / root route
app.get("/", (req, res) => {
  res.send("Welcome to `Restaurant Management System Backend`!");
});

// Global error handler
app.use(errorHandler);

// DB connection and server start
// sequelize
//   .authenticate()
//   .then(() => {
//     console.log('✅ Connected to the database');
//     app.listen(PORT, () => {
//       console.log(`🚀 Server is running on http://localhost:${PORT}`);
//     });
//   })
//   .catch((error) => {
//     console.error('❌ Unable to connect to the database:', error);
// });
