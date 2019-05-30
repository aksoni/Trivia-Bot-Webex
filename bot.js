// Import Botkit
const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const { MongoDbStorage } = require('botbuilder-storage-mongodb');
//const JSON = require('json');

var request = require('request');
var results;
var choices;

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
       
        request('https://opentdb.com/api.php?amount=1&category=9&difficulty=medium&type=multiple', function (error, response, body) {
        if (!error) {
           results = JSON.parse(body);
        }  else {
        console.log(error);
    }
          
})
        await bot.reply(message, "Question:");
        await bot.reply(message, results.results[0].question);
        console.log(results.results[0].correct_answer);
        var correct = [results.results[0].correct_answer];
        var incorrect = results.results[0].incorrect_answers;
        console.log(results.results[0].question);
        // console.log(correct);
        // console.log(incorrect);
        choices = correct.concat(incorrect);
        //@console.log(choices);
        choices = shuffle(choices);
       // console.log(choices);
        //await bot.reply(message, choices);
        var i;
        for(i = 0; i < choices.length; i++)
          {
            console.log(choices[i]);
            //wait bot.reply()
            await bot.reply(message, choices[i]);
          }
      }
       else if(query.includes('answer')){
         await bot.reply(message, "Answer:");
         //console.log(results.results[0].correct_answer)
         await bot.reply(message, results.results[0].correct_answer);
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