const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');

const hears = require('./features/hears.js');
const dataManager = require('./utils/dataManager.js');

var challengeModeOn = false;
var questionAnswered = false;

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
      const query = message.text.trim().toLowerCase();
      const email = message.personEmail;
      const roomId = message.roomId;
      const personId = message.personId;
      const firstName = email.charAt(0).toUpperCase() + email.substr(1, email.indexOf('.') - 1);
      if(query.includes('help')) {
        await hears.help(bot, firstName);
      }
      else if(query === "categories"){
        await hears.categories(bot);   
      }
      else if(query.substr(0, 'hit me'.length)=== 'hit me'){
        questionAnswered = await hears.hitMe(bot, roomId, personId, query, firstName, questionAnswered, challengeModeOn);
      }
      else if(query.substr(0, 'answer'.length) === 'answer'){
        questionAnswered = await hears.answer(bot, roomId, personId, query, firstName, questionAnswered, challengeModeOn);
      }
      else if(query === "challenge"){
        challengeModeOn = await hears.challenge(bot, roomId, personId, firstName);
      }
      else if(challengeModeOn && query === "join"){
        await hears.joinChallenge(bot, roomId, personId, firstName)      
      }
      else if(query === "checkroom"  && personId === process.env.userId) {
        dataManager.checkRoom(roomId);
      }
      else if(query === "checkusers"  && personId === process.env.userId) {
        dataManager.checkUsers(personId);
      }
      else if(query === "checkall"  && personId === process.env.userId) {
        dataManager.checkAllRooms();
      }
      else if(query === "clearrooms"  && personId === process.env.userId) {
        dataManager.clearRooms();
      }
      else if(query === "clearusers" && personId === process.env.userId) {
        dataManager.clearUsers();
      }
      else if(query === "clearall"  && personId === process.env.userId) {
        dataManager.clearRooms();
        dataManager.clearUsers();
      }
      else {
        await bot.say("Please enter a valid command. Enter \'@Trivia help\' to see the list of commands.");
      }
    }
});