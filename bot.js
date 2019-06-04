const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');

var hears = require('./features/hears.js');
var dataManager = require('./utils/dataManager.js');

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
      const firstName = firstNameLower.charAt(0).toUpperCase() + firstNameLower.slice(1);
      if(query.includes('help')) {
        await hears.help(bot, firstName);
      }
      else if(query.includes('categories')){
        await hears.categories(bot);   
      }
      else if(query.includes('hit me')){
        await hears.hitMe(bot, roomId, personId, query, firstName);
      }
      else if(query.includes('answer')){
        await hears.answer(bot, roomId, personId, query, firstName);
      }
      else if(query.includes("checkRoom")  && personId === process.env.userId) {
        dataManager.checkRoom(roomId);
      }
      else if(query.includes("checkUsers")  && personId === process.env.userId) {
        dataManager.checkUsers(personId);
      }
      else if(query.includes("checkAll")  && personId === process.env.userId) {
        dataManager.checkAllRooms();
      }
      else if(query.includes("clearRooms")  && personId === process.env.userId) {
        dataManager.clearRooms();
      }
      else if(query.includes("clearUsers") && personId === process.env.userId) {
        dataManager.clearUsers();
      }
      else if(query.includes("clearAll")  && personId === process.env.userId) {
        dataManager.clearRooms();
        dataManager.clearUsers();
      }
      else if(query.includes("wordCheck")) {
        await hears.wordCheck(bot, query)
      }
      else {
        await bot.say("Please enter a valid command. Enter \'@Trivia help\' to see the list of commands.");
      }
    }
});