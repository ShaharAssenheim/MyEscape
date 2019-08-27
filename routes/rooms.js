var express = require("express");
var router = express.Router();
var Room = require("../models/room");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};
var geocoder = NodeGeocoder(options);

var multer = require('multer');
var storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter })

var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'dmrx96yqx',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//INDEX - show all Escape Rooms
router.get("/", function (req, res) {
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Room.find({ name: regex }).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allRooms) {
            Room.count({ name: regex }).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if (allRooms.length < 1) {
                        noMatch = "No Escape Room match that query, please try again.";
                    }
                    res.render("rooms/index", {
                        rooms: allRooms,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all Escape Rooms from DB
        Room.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allRooms) {
            Room.count().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("rooms/index", {
                        rooms: allRooms,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
});

//CREATE - add new Escape Room to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function (req, res) {
    geocoder.geocode(req.body.room.location, function (err, data) {
        if (err || !data.length) {
            req.flash('error', 'Invalid address');
            return res.redirect('back');
        }
        req.body.room.lat = data[0].latitude;
        req.body.room.lng = data[0].longitude;
        req.body.room.location = data[0].formattedAddress;
        cloudinary.v2.uploader.upload(req.file.path, function (err, result) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            // add cloudinary url for the image to the Escape Room object under image property
            req.body.room.image = result.secure_url;
            req.body.room.imageId = result.public_id;
            // add author to Escape Room
            req.body.room.author = {
                id: req.user._id,
                username: req.user.username
            }
            Room.create(req.body.room, function (err, room) {
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect('back');
                }
                res.redirect('/rooms/' + room.id);
            });
        });
    });
});

//NEW - show form to create new Escape Room
router.get("/new", middleware.isLoggedIn, function (req, res) {
    res.render("rooms/new");
});

// SHOW - shows more info about one Escape Room
router.get("/:id", function (req, res) {
    //find the Escape Room with provided ID
    Room.findById(req.params.id).populate("comments likes").exec(function (err, foundRoom) {
        if (err) {
            console.log(err);
        } else {
            console.log(foundRoom)
            //render show template with that Escape Room
            res.render("rooms/show", { room: foundRoom });
        }
    });
});

// EDIT Escape Room ROUTE
router.get("/:id/edit", middleware.checkRoomOwnership, function (req, res) {
    Room.findById(req.params.id, function (err, foundRoom) {
        res.render("rooms/edit", { room: foundRoom });
    });
});

// UPDATE Escape Room ROUTE
router.put("/:id", middleware.checkRoomOwnership, upload.single('image'), function (req, res) {
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
            req.flash('error', 'Invalid address');
            return res.redirect('back');
        }
        req.body.room.lat = data[0].latitude;
        req.body.room.lng = data[0].longitude;
        req.body.room.location = data[0].formattedAddress;


        Room.findById(req.params.id, async function (err, room) {
            if (err) {
                req.flash("error", err.message);
                res.redirect("back");
            } else {
                if (req.file) {
                    try {
                        await cloudinary.v2.uploader.destroy(room.imageId);
                        var result = await cloudinary.v2.uploader.upload(req.file.path);
                        room.imageId = result.public_id;
                        room.image = result.secure_url;
                    } catch (err) {
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }
                }
                room.name = req.body.room.name;
                room.price = req.body.room.price;
                room.description = req.body.room.description;
                room.lat = req.body.room.lat;
                room.lng = req.body.room.lng;
                room.location = req.body.room.location;
                room.save();
                req.flash("success", "Successfully Updated!");
                res.redirect("/rooms/" + room._id);
            }
        });
    });
});

// DESTROY Escape Room ROUTE
router.delete('/:id', function (req, res) {
    Room.findById(req.params.id, async function (err, room) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            await cloudinary.v2.uploader.destroy(room.imageId);
            room.remove();
            req.flash('success', 'Esacape Room deleted successfully!');
            res.redirect('/rooms');
        } catch (err) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
        }
    });
});

// Escape Room Like Route
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Room.findById(req.params.id, function (err, foundRoom) {
        if (err) {
            console.log(err);
            return res.redirect("/rooms");
        }

        // check if req.user._id exists in foundRoom.likes
        var foundUserLike = foundRoom.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundRoom.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundRoom.likes.push(req.user);
        }

        foundRoom.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/rooms");
            }
            return res.redirect("/rooms/" + foundRoom._id);
        });
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;