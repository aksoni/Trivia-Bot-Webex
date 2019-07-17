const { Botkit } = require('botkit');
const { WebexAdapter } = require('botbuilder-adapter-webex');

const hears = require('./features/hears.js');
const utils = require('./utils/utils.js')
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
    if(message.text) {
      
      const query = message.text.trim().toLowerCase();
      const email = message.personEmail;
      const roomId = message.roomId;
      const personId = message.personId;
      
      const firstName = email.charAt(0).toUpperCase() + email.substr(1, email.indexOf('.') - 1);
      console.log(email + ": " + message.text);
      console.log(message.roomId)
      let roomStatus = await utils.getRoomStatus(roomId);
      let challengeModeOn = roomStatus.challengeModeOn;
      let questionAnswered = roomStatus.questionAnswered;
      let challengeStarted = roomStatus.challengeStarted;
      console.log("Challenge mode on status: ", challengeModeOn);
      console.log("QuestionAnswered status: ", questionAnswered);
      console.log("Challenge started status: ", challengeStarted);
      if(query.includes('help')) {
        await hears.help(bot, firstName);
      }
      else if(query.includes("categories")){
        await hears.categories(bot);   
      }
      else if(query.includes('hit me')){ //query.substr(0, 'hit me'.length)=== 'hit me'){
        await hears.hitMe(bot, roomId, personId, query, firstName, questionAnswered, challengeModeOn, challengeStarted);
      }
      else if(query.includes('answer')){//query.substr(0, 'answer'.length) === 'answer'){
        await hears.answer(bot, roomId, personId, query, firstName, questionAnswered, challengeModeOn, challengeStarted);
      }
      else if(query.includes('challenge')){//query.substr(0, 'challenge'.length) === "challenge"){// && personId === process.env.userId){
        console.log("Heard challenge, challengeModeOn: " + challengeModeOn);
        await hears.challenge(bot, roomId, personId, query, firstName, challengeModeOn, questionAnswered, email);
        // challengeModeOn = status.challengeModeOn;
        // questionAnswered = status.questionAnswered;
      }
      else if(challengeModeOn && query.includes("join")){//query === "join"){// && personId === process.env.userId){
        await hears.joinChallenge(bot, roomId, personId, firstName, email)      
      }
      else if(challengeModeOn && query.includes("quit")){// && personId === process.env.userId){
        challengeModeOn = await hears.quit(bot, roomId);
        console.log("quit challenge: challengeModeOn: " + challengeModeOn);
      }
      else if(challengeModeOn && query.includes("check")){// && personId === process.env.userId){
        await hears.check(bot, roomId);
      }
      else if(query === "checkroom"  && personId === process.env.userId) {
        dataManager.checkOpenRoom(roomId);
      }
      else if(query === "checkusers"  && personId === process.env.userId) {
        dataManager.checkUsers(personId);
      }
      else if(query === "checkall"  && personId === process.env.userId) {
        dataManager.checkAllOpenRooms();
      }
      else if(query === "clearopenrooms"  && personId === process.env.userId) {
        dataManager.clearOpenRooms();
      }
      else if(query === "clearusers" && personId === process.env.userId) {
        dataManager.clearUsers();
      }
      else if(query === "clearstatuses" && personId === process.env.userId) {
        dataManager.clearStatuses();
      }
      else if(query === "clearchallenges" && personId === process.env.userId) {
        dataManager.clearChallenges();
      }
      else if(query === "clearall"  && personId === process.env.userId) {
        dataManager.clearOpenRooms();
        dataManager.clearUsers();
        dataManager.clearStatuses();
        dataManager.clearChallenges();
      }
      else {
        await bot.say("Please enter a valid command. Enter \'@Trivia help\' to see the list of commands.");
      }
    }
  else{
    await bot.say("Please try again.");
  }
});