const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async()=>{
    try {
        const ctn = await mongoose.connect(process.env.MONGO_URI, {});
        } catch (error) {
        process.exit(1);
    }
}

module.exports = connectDB;