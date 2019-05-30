// Import Botkit
const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const { MongoDbStorage } = require('botbuilder-storage-mongodb');
//const JSON = require('json');

var request = require('request');

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
     if(message.text){
      const query = message.text.trim();
      if(query.includes('help')) {
        await bot.reply(message, 'Hi! I\'m Trivia Timmy! I will ask trivia questions in the category you select.');
        await bot.reply(message, 'Usage: @triviagame hit me');
      }    
      else if(query.includes('hit me')){
        let results;
        request('https://opentdb.com/api.php?amount=1&category=9&difficulty=medium&type=multiple', function (error, response, body) {
        if (!error) {
           results = JSON.parse(body);
        }  else {
        console.log(error);
    }
})
        await bot.reply(message, "Question:")
        await bot.reply(message, results.results[0].question);
      }
    }
});