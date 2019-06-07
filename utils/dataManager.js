const mongodb = require('mongodb');
const constants = require('../lib/constants.js');

module.exports = {
  clearOpenRooms: async function() {
    let db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
    const rooms = triviaDatabase.collection('openRooms');
    await rooms.drop();
    console.log("open rooms dropped");
    db.close();
  },
  
  clearUsers: async function() {
    let db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
    const rooms = triviaDatabase.collection('users');
    await rooms.drop();
    console.log("users dropped");
    db.close();
  },
  
  clearChallenges: async function() {
    let db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
    const rooms = triviaDatabase.collection('challenges');
    await rooms.drop();
    console.log("challenges dropped");
    db.close();
  },
  
  clearStatuses: async function() {
    let db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
    const rooms = triviaDatabase.collection('roomStatus');
    await rooms.drop();
    console.log("room status dropped");
    db.close();
  },

  checkOpenRoom: async function(roomId) {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, async function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const users = triviaDatabase.collection('openRooms');
      const result = await users.find({roomId:roomId}).toArray() ;
      if (result.length === 0 || err) {
        console.log("Room not found.");
      }
      else {
        console.log("Room found.");
        console.log(result);
      }
      db.close();
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

  checkAllOpenRooms: function() {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const rooms = triviaDatabase.collection('openRooms');

      rooms.find({}).toArray(function(err, result) {
        if(err) throw err;
        console.log(result);
        db.close();
      });
    });
  }
}