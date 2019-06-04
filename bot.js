const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const mongodb = require('mongodb')
var hears = require('./features/hears.js')

// Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname, details set in .env
var uri = "mongodb+srv://" + process.env.dbuser + ":" + process.env.dbpassword + "@cluster0-vblnv.mongodb.net/trivia?retryWrites=true&w=majority";

const adapter = new WebexAdapter({
    access_token: process.env.access_token,
    public_address: process.env.public_address,
    secret: process.env.secret
})

const controller = new Botkit({
    webhook_name: 'TriviaBot',
    adapter: adapter,
});

controller.on('message', async(bot, message) => {
    if(message.text){
      const query = message.text.trim();
      const email = message.personEmail;
      const roomId = message.roomId;
      const personId = message.personId;
      const firstNameLower = email.substr(0, email.indexOf('.'));
      const firstName = firstNameLower.charAt(0).toUpperCase() + firstNameLower.slice(1)
      if(query.includes('help')) {
        await hears.help(bot, firstName)
      }
      else if(query.includes('categories')){
        await hears.categories(bot)   
      }
      else if(query.includes('hit me')){
        await hears.hitMe(bot, roomId, personId, query, firstName)
      }
      else if(query.includes('answer')){
        await hears.answer(bot, query, roomId, personId, firstName)
      }
      else if(query.includes("clearRooms")  && message.personId === process.env.userId) {
        clearRooms();
      }
      else if(query.includes("clearUsers") && message.personId === process.env.userId) {
         clearUsers();
      }
      else if(query.includes("checkRoom")  && message.personId === process.env.userId) {
         checkRoom(message);
      }
      else if(query.includes("checkAll")  && message.personId === process.env.userId) {
         checkAll();
      }
      else {
         bot.say("Please enter a valid command. Enter \'@Trivia help\' to see the list of commands.")
      }
     }
});



function clearRooms() {
  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
    rooms.drop();
    console.log("rooms dropped")
  });
}

function clearUsers() {
  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var users = triviaDatabase.collection('users');
    users.drop();
    console.log("users dropped")
  });
}

function checkRoom(message) {
  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
    
    rooms.find({roomId:message.roomId}).toArray(function(err, result) {
        if (result.length === 0 || err) {
          console.log("Room not found.")
        }
        else {
          console.log("Room found.")
          console.log(result);
        }
        db.close();
      });
  });
}

function checkUsers(message) {
  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var users = triviaDatabase.collection('users');
    
    users.find({personId:message.personId}).toArray(function(err, result) {
        if (result.length === 0 || err) {
          console.log("User not found.")
        }
        else {
          console.log("User found.")
          console.log(result);
        }
        db.close();
      });
  });
}

function checkAll() {
  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
    
    rooms.find({}).toArray(function(err, result) {
        if(err) throw err;
        console.log(result)
        db.close();
      });
  });
}