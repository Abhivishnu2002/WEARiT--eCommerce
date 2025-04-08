const express = require('express');
const connectDB = require('./config/db.js');
const dotenv = require('dotenv');
const path = require('path');
const userRoutes = require('./routes/userRoutes.js')
const adminRoutes = require('./routes/adminRoutes.js')

dotenv.config();


connectDB();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true}));

app.use(express.static('public'));

app.use("/", userRoutes);
app.use("/admin", adminRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Server started at: http://localhost:${PORT}`);
})