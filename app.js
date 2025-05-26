require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ limit: "25mb", extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

const allowedOrigins = ["http://localhost:3000"];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to `Restaurant Management System Backend`!");
});

app.use("/api/v1", require("./routes"));

module.exports = app;
