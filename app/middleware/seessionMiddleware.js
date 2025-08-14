const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const SessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoDBStore({
        uri: process.env.MONGODB_URI,
        collection: 'sessions'
    })
});

module.exports = SessionMiddleware;
