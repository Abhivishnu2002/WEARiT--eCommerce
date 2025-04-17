const express = require("express")
const path = require("path")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const mongoose = require("mongoose")
const passport = require('./config/passport');
const methodOverride = require("method-override")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Initialize app
const app = express()
const PORT = process.env.PORT || 3000

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err))

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride("_method"))
app.use(express.static(path.join(__dirname, "public")))

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    },
  }),
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// Flash messages
app.use(flash())

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg")
  res.locals.error_msg = req.flash("error_msg")
  res.locals.error = req.flash("error")
  res.locals.user = req.session.user || null
  next()
})

// View engine
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// Routes
app.use("/", require("./routes/index"))
app.use("/admin", require("./routes/admin/index"))

// 404 handler
app.use((req, res) => {
  res.status(404).render("errors/404")
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).render("errors/500", {
    error: process.env.NODE_ENV === "development" ? err : {},
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
