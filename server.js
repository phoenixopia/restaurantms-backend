require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');

const app = express();

const PORT = process.env.PORT || 4000;
sequelize
    .authenticate()
    .then(() => {
        console.log('Connected to the database');
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Unable to connect to the database:', error);
    });

app.use(morgan('dev'));
app.use(bodyParser.json({ limit: "25mb" }));
app.use(bodyParser.urlencoded({ limit: "25mb", extended: true }));
app.use(cookieParser());

// app.use(cors());
const allowedOrigins = ['http://localhost:3000', ];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,  // Enable credentials (cookies, authorization headers, etc.)
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'], // Customize headers as needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // preflightContinue: false,  // Automatically send response for preflight request
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.get("/", (req, res) => {
    res.send("Welcome to `Restaurant Management System Backend`!");
});

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, 
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
