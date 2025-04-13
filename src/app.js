const express = require('express');
const connectDB = require('./config/db.js');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session')
const nocache = require('nocache');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo');
const userRoutes = require('./routes/userRoutes.js')
const productRoutes = require('./routes/productRouter.js')
const adminRoutes = require('./routes/adminRoutes.js');
const passport = require('passport');
require('./config/db.js');
require('./config/passport.js');

dotenv.config();


connectDB();

const app = express();

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(nocache());

app.use(session({
    secret:'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl:5 * 24 * 60 * 60
    }),
    cookie: {
        maxAge: 5 * 24 * 60 * 60 * 1000
    }
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

app.use("/products", productRoutes);
app.use('/user', userRoutes);
app.use("/admin", adminRoutes);

app.get('/', (req, res)=>{
    res.render('home');
})

app.use((err, req, res, next)=>{
    console.log(err.stack);
    res.status(500).render('errors/500', {error: err});
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server started at: http://localhost:${PORT}`);
})