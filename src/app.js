const express = require('express');
const connectDB = require('./config/db.js');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session')
const nocache = require('nocache');
const flash = require('connect-flash');
const userRoutes = require('./routes/userRoutes.js')
const adminRoutes = require('./routes/adminRoutes.js');
const apiRoutes = require('./routes/apiRoutes.js');
const { checkUserStatus } = require('./middlewares/auth.js');
const passport = require('passport');
require('./config/db.js');
require('./config/passport.js');

dotenv.config();

connectDB();

const app = express();

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.static('public'));

app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.use(nocache());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
    },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next)=>{
    res.locals.user = req.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
})

app.use(checkUserStatus);

app.use('/', userRoutes);
app.use("/admin", adminRoutes);
app.use('/api', apiRoutes);

app.use((err, req, res, next)=>{
    console.log(err.stack);
    res.status(404).render('errors/404', {err});
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server started at: http://localhost:${PORT}`);
})