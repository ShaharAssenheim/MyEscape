const Room = require("../models/room");
const Comment = require("../models/comment");

// all the middleare goes here
const middlewareObj = {};

//check if the current user logged in,
//if it is check if its the owner of the room or the admin.
middlewareObj.checkRoomOwnership = function (req, res, next) {
    if (req.isAuthenticated()) {
        Room.findById(req.params.id, function (err, foundRoom) {
            if (err) {
                req.flash("error", "Escape Room not found");
                res.redirect("back");
            } else {
                // does user own the Escape Room?
                if (foundRoom.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

//check if the current user logged in,
//if it is check if its the owner of the comment or the admin.
middlewareObj.checkCommentOwnership = function (req, res, next) {
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function (err, foundComment) {
            if (err) {
                res.redirect("back");
            } else {
                // does user own the comment?
                if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

//check if the current user logged in.
middlewareObj.isLoggedIn = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
}

module.exports = middlewareObj;