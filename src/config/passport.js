const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const User = require('../models/userModel.js');

dotenv.config();

passport.use(new LocalStrategy(
    { usernameField: 'email'},
    async (email, password, done)=>{
        try {
            const user = await User.findOne({email});
            if(!user){
                return done(null, false, {message: 'Invalid email or password'});
            }
            if(user.isBlocked){
                return done(null, false, {message: 'You account is blocked. Please contact for support!'})
            }

            const isMatch = await user.comparePassword(password);
            if(!isMatch){
                return done(null, false, {message: 'Invalid email or password'});
            }
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
))

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/google/callback'
}, async (accessToken, refreshToken, profile, done)=>{
    try {
        let user = await User.findOne({googleId: profile.id});
        if(!user){
            user = new User ({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                isBlocked: false
            });
            await user.save();
        }
        return done(null, user);
    } catch (error) {
        return done(error, null)
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id); // serialize by unique identifier
});


passport.deserializeUser(async (id, done)=>{
    try {
        const user = await User.findById(id);
        done(null, user)
    } catch (error) {
        done(error, null);
    }
})

module.exports = passport;