// Import Botkit
const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const { MongoDbStorage } = require('botbuilder-storage-mongodb');
//const JSON = require('json');

var request = require('request');
var atob = require('atob');

var choices;
var correct;
var letters = "ABCD";


//require('dotenv').config();
let storage = null;
if (process.env.MONGO_URI) {
    storage = mongoStorage = new MongoDbStorage({
        url : process.env.MONGO_URI,
    });
}

const numQuestions = 5;
const adapter = new WebexAdapter({
    access_token: process.env.access_token,
    public_address: process.env.public_address,
    secret: process.env.secret
})


const controller = new Botkit({
    webhook_name: 'TriviaBot',
    adapter: adapter,
    storage

});

controller.on('message', async(bot, message) => {
     if(message.text){
      // console.log(message);
       const query = message.text.trim();
       const email = message.personEmail;
       const firstName_lower = email.substr(0, email.indexOf('.'));
       const firstName = firstName_lower.charAt(0).toUpperCase() + firstName_lower.slice(1)
       if(query.includes('help')) {
         let help_message = ""
         help_message += "Hi, " + firstName + "! I'm Trivia Timmy! I will ask trivia questions and you will have to choose from the 4 choices given.\n\n";
         help_message += "To get a question: @Trivia hit me <category number> (optional)\n";
         help_message += "To see the categories: @Trivia categories\n";
         await bot.reply(message, help_message);
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
        //console.log(results);
        let decoded_question =  atob(results.question);
        let question = decoded_question.charAt(0).toLowerCase() + decoded_question.slice(1);
        //await bot.reply(message, "Question: " + decode);
        correct = [atob(results.correct_answer).trim()];
        let incorrect = [atob(results.incorrect_answers[0].trim()), atob(results.incorrect_answers[1].trim()), atob(results.incorrect_answers[2].trim())];

        choices = correct.concat(incorrect);

        choices = shuffle(choices);
        let question_string = firstName + ", " + question + "\n";
        //question_string += "1. " + choices[0];
        for(let i = 0; i < choices.length; i++){
            question_string = question_string + "\n" + letters.charAt(i) + ". " + choices[i];
            //await bot.reply(message, (i+1) + ". \n" + choices[i]);
         }
        await bot.reply(message, question_string);
      }
//         else if(query.includes('anime me')){
//         let response = await fetch('https://opentdb.com/api.php?amount=1&category=31&type=multiple&encode=base64');
//         response = await response.json();
   
//         let results = response.results[0]
//         //console.log(results);
//         let decoded_question =  atob(results.question);
//         let question = decoded_question.charAt(0).toLowerCase() + decoded_question.slice(1);
//         //await bot.reply(message, "Question: " + decode);
//         correct = [atob(results.correct_answer).trim()];
//         let incorrect = [atob(results.incorrect_answers[0].trim()), atob(results.incorrect_answers[1].trim()), atob(results.incorrect_answers[2].trim())];

//         choices = correct.concat(incorrect);

//         choices = shuffle(choices);
//         let question_string = firstName + ", " + question + "\n";
//         //question_string += "1. " + choices[0];
//         for(let i = 0; i < choices.length; i++){
//             question_string = question_string + "\n" + letters.charAt(i) + ". " + choices[i];
//             //await bot.reply(message, (i+1) + ". \n" + choices[i]);
//          }
//         await bot.reply(message, question_string);
//       }
       else if(query.includes('answer')){
         let selectedChoice = query.slice(query.indexOf('answer') + 'answer'.length).trim();
         //let correctAnswer = "";
         let correctAnswer = correct[0];
         let correctLetter = letters.charAt(choices.indexOf(correctAnswer));
         if(selectedChoice === correctLetter) {
           await bot.reply(message, "Good job, " + firstName + ", " + correctAnswer + " is correct!")
}
         else {
           await bot.reply(message, "Sorry, " + firstName + ", that is incorrect. The correct answer is " + correctAnswer + ".");
         }
       }
     }
});

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