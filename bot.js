// Import Botkit
const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const { MongoDbStorage } = require('botbuilder-storage-mongodb');
//const JSON = require('json');

var request = require('request');
var atob = require('atob');
var results;
var choices;
var correct;
var res;

require('dotenv').config();
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
    webhook_name: 'WeatherBot',
    adapter: adapter,
    storage

});

controller.on('message', async(bot, message) => {
   //let results;
     if(message.text){
      const query = message.text.trim();
      if(query.includes('help')) {
        await bot.reply(message, 'Hi! I\'m Trivia Timmy! I will ask trivia questions in the category you select.');
        await bot.reply(message, 'Usage: @triviagame hit me');
      }    
      else if(query.includes('hit me')){
        res = null;
        console.log("hit me");
        request('https://opentdb.com/api.php?amount=1&difficulty=medium&type=multiple&encode=base64&token=6893a0d72cdc7f72d0268acd92f779a96e5e5b21b5bea51411d4f172cb15ddec', function (error, response, body) {
            if (!error) {
               results = JSON.parse(body);
            }  else {
            console.log(error);
            }
        })
        //await bot.reply(message, "Question:");
        res = results.results[0];
        var decode =  atob(res.question);
        console.log(decode);
        await bot.reply(message, "Question: " + decode);//results.results[0].question);
        //console.log(results.results[0].correct_answer);
        correct = [atob(res.correct_answer)];
        var incorrect = [atob(res.incorrect_answers[0]), atob(res.incorrect_answers[1]), atob(res.incorrect_answers[2])];
       // console.log(results.results[0].question);
        console.log(correct);
        console.log(incorrect);
        choices = correct.concat(incorrect);
        console.log(choices);
        choices = shuffle(choices);
       // console.log(choices);
        //await bot.reply(message, choices);
        var i;
        for(i = 0; i < choices.length; i++)
          {
            console.log(choices[i]);
            //wait bot.reply()
            await bot.reply(message, (i+1) + ". " + choices[i]);
          }
      }
       else if(query.includes('answer')){
         console.log("answer");
         //await bot.reply(message, "Answer:");
         let correct_answer = "";
         correct_answer = correct[0];
         console.log(correct_answer);
         var correctNum = choices.indexOf(correct_answer) + 1;
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