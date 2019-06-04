const mongodb = require('mongodb');
const constants = require('../lib/constants.js');

module.exports = {
  clearRooms: function() {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const rooms = triviaDatabase.collection('rooms');
      rooms.drop();
      console.log("rooms dropped");
    });
  },
  
  clearUsers: function() {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const users = triviaDatabase.collection('users');
      users.drop();
      console.log("users dropped");
    });
  },

  checkRoom: async function(roomId) {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, async function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const users = triviaDatabase.collection('rooms');
      const result = await users.find({roomId:roomId}).toArray() ;
      if (result.length === 0 || err) {
        console.log("Room not found.");
      }
      else {
        console.log("Room found.");
        console.log(result);
      }
    });
  },

  checkUsers: async function(personId) {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, async function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const users = triviaDatabase.collection('users');
      const result = await users.find({personId:personId}).toArray();
      if (result.length === 0 || err) {
        console.log("User not found.");
      }
      else {
        console.log("User found.");
        console.log(result);
      }
      db.close();
    });
  },

  checkAllRooms: function() {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const rooms = triviaDatabase.collection('rooms');

      rooms.find({}).toArray(function(err, result) {
        if(err) throw err;
        console.log(result);
        db.close();
      });
    });
  }
}