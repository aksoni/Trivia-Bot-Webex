// Import Botkit
const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const mongodb = require('mongodb')

var request = require('request');
var atob = require('atob');

var choices;
var correctAnswerString;
var letters = "ABCD";
var uri = "mongodb+srv://" + process.env.dbuser + ":" + process.env.dbpassword + "@cluster0-vblnv.mongodb.net/trivia?retryWrites=true&w=majority";

//var dbSongs = ""


// Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname, details set in .env

                            
                            


//require('dotenv').config();
//let storage = ;

const numQuestions = 5;
const adapter = new WebexAdapter({
    access_token: process.env.access_token,
    public_address: process.env.public_address,
    secret: process.env.secret
})


const controller = new Botkit({
    webhook_name: 'TriviaBot',
    adapter: adapter,
   // storage: mongodb

});

controller.on('message', async(bot, message) => {
     if(message.text){
       console.log(message);
       //getRoom(message);
       const query = message.text.trim();
       const email = message.personEmail;
       const id = message.personId;
       const firstNameLower = email.substr(0, email.indexOf('.'));
       const firstName = firstNameLower.charAt(0).toUpperCase() + firstNameLower.slice(1)
       if(query.includes('help')) {
         let helpMessage = ""
         helpMessage += "Hi, " + firstName + "! I'm Trivia Timmy! I will ask trivia questions and you will have to choose from the 4 choices given.\n\n";
         helpMessage += "To get a question: @Trivia hit me <category number> (optional)\n";
         helpMessage += "To answer a question: @Trivia answer <letter choice>\n"
         helpMessage += "To see the categories: @Trivia categories\n";
         await bot.reply(message, helpMessage);
      }
      else if(query.includes('categories')){
         let response = await fetch('https://opentdb.com/api_category.php');
         response = await response.json();
         let categories = "Categories\n"
         for(let i = 0; i < response.trivia_categories.length; i++) {
           categories += response.trivia_categories[i].name + ": " + response.trivia_categories[i].id + "\n";
         }
         console.log(categories);
         await bot.reply(message, categories);
      }
      else if(query.includes('hit me')){
        let selectedCategory = query.slice(query.indexOf('hit me') + 'hit me'.length).trim();
        let response;
        if(selectedCategory === ""){
          response = await fetch('https://opentdb.com/api.php?amount=1&difficulty=easy&type=multiple&encode=base64');
        }
        else{
          let url = "https://opentdb.com/api.php?amount=1&" + "category=" + selectedCategory + "&type=multiple&encode=base64";
          response = await fetch(url);
        }
        response = await response.json();
   
        let results = response.results[0]
        let question =  atob(results.question);
        correctAnswerString = atob(results.correct_answer).trim();
        let incorrectStrings = [atob(results.incorrect_answers[0].trim()), atob(results.incorrect_answers[1].trim()), atob(results.incorrect_answers[2].trim())];

        choices = [correctAnswerString].concat(incorrectStrings);

        choices = shuffle(choices);
        let correctAnswerLetter = letters.charAt(choices.indexOf(correctAnswerString));
        let questionString = firstName + ", " + question + "\n";
        //question_string += "1. " + choices[0];
        for(let i = 0; i < choices.length; i++){
            questionString = questionString + "\n" + letters.charAt(i) + ". " + choices[i];
            //await bot.reply(message, (i+1) + ". \n" + choices[i]);
         }
        addQuestionToDB(message, question, correctAnswerLetter, correctAnswerString)
        await bot.reply(message, questionString);
      }
       else if(query.includes('answer')){
         let selectedChoice = query.slice(query.indexOf('answer') + 'answer'.length).trim();
         //let correctAnswer = "";
        // let correctAnswer = correctAnswerString[0];
         //getCorrectAnswer(message);
         let correctLetter = letters.charAt(choices.indexOf(correctAnswerString));
         if(selectedChoice === correctLetter) {
           await bot.reply(message, "Good job, " + firstName + ", " + correctLetter + " - " + correctAnswerString + " is correct!")
        }
         else {
           await bot.reply(message, "Sorry, " + firstName + ", that is incorrect. The correct answer is " + 
                           correctLetter + " - " + correctAnswerString + ".");
         }
       }
       else if(query.includes("clearDb")) {
         clearRoom();
       }
       else if(query.includes("checkDb")) {
         checkDb(message);
       }
       else if(query.includes("checkAll")) {
         checkAll();
       }
     }
});

function clearRoom() {
  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
    rooms.drop();
    console.log("rooms dropped")
  });
}

function getRoom(message) {


  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
   //  rooms.drop();
    var room = [
      {
        roomId: message.roomId,
        currentPlayer: '',
        currentQuestion: '',
        currentAnswerLetter: '',
        currentAnswerString: '',
        allPlayers:''
      }
    ]

    console.log("Room id: " + message.roomId)

    rooms.insert(room, async function(err, result) {

      if(err) throw err;

      console.log("insertion success")

      await rooms.find({}).toArray(function(err, result) {
        if (err) throw err;
        console.log(result);
        db.close();
      });
      console.log("second test")
      await rooms.find({roomId: message.roomId}, function(err, doc) {
        if (doc.length === 'undefined' ||err) {
          console.log("room not found")
        }
        
        else {
          console.log(doc.length + " is the doc length")
          console.log(doc)
          console.log("Found room id: " + message.roomId);
        }
        db.close();
      });
    });
  });
}

function addQuestionToDB(message, question, correctAnswerLetter, correctAnswerString) {


  mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
   //  rooms.drop();
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
          console.log(result)
        }
        db.close();
      });
    // var room = [
    //   {
    //     roomId: message.roomId,
    //     currentPlayer: message.personId,
    //     currentQuestion: question,
    //     currentAnswerLetter: correctAnswerLetter,
    //     currentAnswerString: correctAnswerString,
    //     allPlayers:''
    //   }
    // ]

//     console.log("Room id: " + message.roomId)

//     rooms.insert(room, function(err, result) {

//       if(err) throw err;

//       console.log("insertion success")
//     });
    
//     rooms.find({}).toArray(function(err, result) {
//         if (err) throw err;
//         console.log(result);
//         db.close();
//       });
  });
}

function checkDb(message) {
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