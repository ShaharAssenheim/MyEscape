var mongoose = require("mongoose");

var roomSchema = new mongoose.Schema({
   name: String,
   price: String,
   image: String,
   imageId: String,
   description: String,
   location: String,
   lat: Number,
   lng: Number,
   createdAt: {
      type: Date,
      default: Date.now
   },
   author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      },
      username: String
   },
   comments: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Comment"
      }
   ],
   likes: [
      {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User"
      }
   ]
});

module.exports = mongoose.model("Room", roomSchema);



