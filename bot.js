// Import Botkit
const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const mongodb = require('mongodb')

var request = require('request');
var atob = require('atob');

var hears = require('./features/hears.js')

//var choices;
//var correctAnswerString;
var letters = "ABCD";
// Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname, details set in .env
var uri = "mongodb+srv://" + process.env.dbuser + ":" + process.env.dbpassword + "@cluster0-vblnv.mongodb.net/trivia?retryWrites=true&w=majority";

const numQuestions = 5;
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
      console.log(message);
      const query = message.text.trim();
      const email = message.personEmail;
      const id = message.personId;
      const firstNameLower = email.substr(0, email.indexOf('.'));
      const firstName = firstNameLower.charAt(0).toUpperCase() + firstNameLower.slice(1)
      if(query.includes('help')) {
        await hears.help(bot, message, firstName)
      }
      else if(query.includes('categories')){
        await hears.categories(bot, message)   
      }
      else if(query.includes('hit me')){
        await hears.hitMe(bot, message, query, firstName)
//         let selectedCategory = query.slice(query.indexOf('hit me') + 'hit me'.length).trim();
//         let response;
//         if(selectedCategory === ""){
//           response = await fetch('https://opentdb.com/api.php?amount=1&difficulty=easy&type=multiple&encode=base64');
//         }
//         else{
//           let url = "https://opentdb.com/api.php?amount=1&" + "category=" + selectedCategory + "&type=multiple&encode=base64";
//           response = await fetch(url);
//         }
//         response = await response.json();
   
//         let results = response.results[0]
//         let question =  atob(results.question);
//         let correctAnswerString = atob(results.correct_answer).trim();
//         let incorrectStrings = [atob(results.incorrect_answers[0].trim()), atob(results.incorrect_answers[1].trim()), atob(results.incorrect_answers[2].trim())];

//         let choices = [correctAnswerString].concat(incorrectStrings);

//         choices = shuffle(choices);
//         let correctAnswerLetter = letters.charAt(choices.indexOf(correctAnswerString));
//         let questionString = firstName + ", " + question + "\n";

//         for(let i = 0; i < choices.length; i++){
//             questionString = questionString + "\n" + letters.charAt(i) + ") " + choices[i];
//          }
//         addQuestionToDB(message, question, correctAnswerLetter, correctAnswerString)
//         await bot.reply(message, questionString);
      }
       else if(query.includes('answer')){
         let questionInfo;
         try {
           questionInfo = await getQuestionInfo(message)
         }
         catch(e) {
           console.log("answer error")
         }
         let originalPerson = questionInfo.personId
         if(originalPerson !== id) {
           bot.say("Sorry, " + firstName + ", it's not your turn!")
         }
         else {
           let userInfo;
           let correctAnswerLetter = questionInfo.correctAnswerLetter
           let correctAnswerString = questionInfo.correctAnswerString
           let replyString = ""
           let selectedChoice = query.slice(query.indexOf('answer') + 'answer'.length).trim();
           if(selectedChoice === correctAnswerLetter) {
             replyString += "Good job, " + firstName + ", " + correctAnswerLetter + ") " + correctAnswerString + " is correct!\n"
             try {
               userInfo = await updateUser(message, true)
             }
             catch(e) {
               console.log("Error updating user")
             }
          }
           else {
             replyString += "Sorry, " + firstName + ", that is incorrect. The correct answer is " + 
                             correctAnswerLetter + ") " + correctAnswerString + ".\n"
             try {
               userInfo = await updateUser(message, false)
             }
             catch(e) {
               console.log("Error updating user")
             }
             
           }
           
           replyString += "You have now answered " + userInfo.numCorrect + " out of " +userInfo.numQuestions + " questions correctly."
           bot.say(replyString)
         }
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

function printCorrect(bot) {
  bot.say("Checking answer")
}


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

async function updateUser(message, answeredCorrectly) {

 let db;
 let userInfo;
 let numCorrect;
 let numQuestions;
 try {
    db = await mongodb.MongoClient.connect(uri)
    let triviaDatabase = db.db('trivia')
    var users = triviaDatabase.collection('users');
    let result = await users.find({roomId: message.roomId, personId:message.personId}).toArray()
    console.log("update user result")
    console.log(result)
    if (result.length === 0) {
        console.log("User not found.")
        if(answeredCorrectly) numCorrect = 1
        else numCorrect = 0
        numQuestions = 1
        var user = [
            {
              roomId: message.roomId,
              personId: message.personId,
              totalCorrect: numCorrect,
              totalQuestions: numQuestions,
            }
          ]
        users.insert(user, function(err, result) {
            if(err) throw err;
            console.log("insertion success")
          });
    }
    else {
      console.log("User found.")
      numCorrect = result[0].totalCorrect
      numQuestions = result[0].totalQuestions
      if(answeredCorrectly) {
        numCorrect++;
      }
      numQuestions++
      try {
      await users.update(
        { roomId: message.roomId, personId: message.personId}, 
        { $set: {totalCorrect: numCorrect, totalQuestions: numQuestions} },
        function (err, result) {

          if(err) console.log("update error in function");
          else{
            console.log("update success")
          }
        }); 
      }
      catch(e) {
        console.log("update user error")
      }
    }
   
   userInfo = {numCorrect: numCorrect, numQuestions}
  }
  finally {
        db.close();
 }
  
 return userInfo
}

function addQuestionToDB(message, question, correctAnswerLetter, correctAnswerString) {


  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
    rooms.find({roomId:message.roomId}).toArray(function(err, result) {
        if (result.length === 0 || err) {
          console.log("Room not found.")
          var room = [
              {
                roomId: message.roomId,
                currentPlayer: message.personId,
                currentQuestion: question,
                currentAnswerLetter: correctAnswerLetter,
                currentAnswerString: correctAnswerString,
                allPlayers:''
              }
            ]
          rooms.insert(room, function(err, result) {
            if(err) throw err;
            console.log("insertion success")
          });
        }
        else {
          console.log("Room found.")
          rooms.update(
            { roomId: message.roomId}, 
            { $set: { currentPlayer: message.personId, currentQuestion:question, currentAnswerLetter:correctAnswerLetter,currentAnswerString:correctAnswerString } },
            function (err, result) {

              if(err) throw err;
              else{
                console.log("update success")
              }
            }); 
        }
        db.close();
      });
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


async function getQuestionInfo(message) {
  let db = await mongodb.MongoClient.connect(uri)
  let questionInfo;
  try {
    let triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
   // var answers;
    let result = await rooms.find({roomId:message.roomId}).toArray()
    
    if (result.length === 0) {
      console.log("Room not found.")
    }
    else {
      console.log("Answer room found.")
      console.log(result);
      questionInfo = {personId: result[0].currentPlayer, correctAnswerLetter: result[0].currentAnswerLetter, correctAnswerString: result[0].currentAnswerString}
    }
  }
  finally {
    db.close();
  }

  return questionInfo;
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


function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}