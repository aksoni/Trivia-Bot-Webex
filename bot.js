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
       //console.log(message);
       const query = message.text.trim();
       const email = message.personEmail;
       const firstName_lower = email.substr(0, email.indexOf('.'));
       const firstName = firstName_lower.charAt(0).toUpperCase() + firstName_lower.slice(1)
       if(query.includes('help')) {
         await bot.reply(message, 'Hi, ' + firstName + '! I\'m Trivia Timmy! I will ask trivia questions and you will have to choose from the 4 choices given.');
         await bot.reply(message, 'Usage: @trivia hit me');
      }    
      else if(query.includes('hit me')){
        let response = await fetch('https://opentdb.com/api.php?amount=1&difficulty=medium&type=multiple&encode=base64&token=6893a0d72cdc7f72d0268acd92f779a96e5e5b21b5bea51411d4f172cb15ddec');
        response = await response.json();
   
        let results = response.results[0]
        let decoded_question =  atob(results.question);
        let question = decoded_question.charAt(0).toLowerCase() + decoded_question.slice(1);
        //await bot.reply(message, "Question: " + decode);
        correct = [atob(results.correct_answer)];
        let incorrect = [atob(results.incorrect_answers[0]), atob(results.incorrect_answers[1]), atob(results.incorrect_answers[2])];

        choices = correct.concat(incorrect);

        choices = shuffle(choices);
        let question_string = firstName + ", " + question + "\n\n";
        question_string += "1. " + choices[0];
        for(let i = 1; i < choices.length; i++){
            question_string = question_string + "\n" + (i+1) + ". " + choices[i];
            //await bot.reply(message, (i+1) + ". \n" + choices[i]);
         }
        await bot.reply(message, question_string);
      }
       else if(query.includes('answer')){
         let correct_answer = "";
         correct_answer = correct[0];
         let correctNum = choices.indexOf(correct_answer) + 1;
         await bot.reply(message, "Answer: " + correctNum + ". " + correct_answer);
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