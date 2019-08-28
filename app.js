require('dotenv').config();

var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash       = require("connect-flash"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    Room  = require("./models/room"),
    Comment     = require("./models/comment"),
    User        = require("./models/user");
    

  
//connect to the local DB
//mongoose.connect("mongodb://localhost:27017/yelp_camp", {useNewUrlParser:true});
//connect to the mongoDB atlas DB
mongoose.connect("mongodb+srv://shaharassen:shachar222@cluster0-cv4kt.mongodb.net/EscapeRoom?retryWrites=true&w=majority",{
    useNewUrlParser:true,
    useCreateIndex: true
}).then(()=>{
    console.log("connect to DB");
}).catch(err =>{
    console.log("error:", err.message);
});

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

//require moment.js for addeing time since created
app.locals.moment = require('moment');

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});

//requiring routes
var commentRoutes    = require("./routes/comments"),
    roomRoutes = require("./routes/rooms"),
    indexRoutes      = require("./routes/index");
    
app.use("/", indexRoutes);
app.use("/rooms", roomRoutes);
app.use("/rooms/:id/comments", commentRoutes);

// use port 3000 unless there exists a preconfigured port
app.listen(process.env.PORT || 3000, process.env.IP, function(){
   console.log("The MyEscape Server Has Started!");
});