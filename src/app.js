const express = require('express');
const connectDB = require('./config/db.js');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session')
const nocache = require('nocache');
const flash = require('connect-flash');
const userRoutes = require('./routes/userRoutes.js')
const adminRoutes = require('./routes/adminRoutes.js')

dotenv.config();


connectDB();

const app = express();

app.use(express.urlencoded({extended: true}));

app.use(express.json());

app.use('/',session({
    secret:'secret',
    resave: false,
    saveUninitialized: true,
}))

app.use(express.static('public'));

app.use(nocache());

app.set("views", path.join(__dirname, "views"));

app.set("view engine", "ejs");

app.use("/", userRoutes);
app.use("/admin", adminRoutes);

app.use((err, req, res, next)=>{
    console.log(err.stack);
    res.status(500).render('errors/500', {error: err});
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server started at: http://localhost:${PORT}`);
})