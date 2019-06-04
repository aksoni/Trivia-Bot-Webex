/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

var utils = require('../utils/utils.js')
var atob = require('atob');
var constants = require('../lib/constants.js')

module.exports = {
  
  help: async function(bot, firstName) {
    let helpMessage = ""
    helpMessage += "Hi, " + firstName + "! I'm Trivia Timmy! I will ask trivia questions"
    + "and you will have to choose from the 4 choices given.\n\n";
    helpMessage += "To get a question: \'@Trivia hit me <category number> (optional)\'\n";
    helpMessage += "To answer a question: \'Trivia answer <letter choice>\'\n"
    helpMessage += "To see the categories: \'@Trivia categories\'\n";
    try {
      await bot.say(helpMessage);
    }
    catch(e) {
      console.log("Help message error.")
    }
  },
  
  categories: async function(bot) {
    let response = await fetch(constants.CATEGORIES_URL)
    response = await response.json();
    let categories = "Categories\n"
    for(let i = 0; i < response.trivia_categories.length; i++) {
      categories += response.trivia_categories[i].name + ": " + response.trivia_categories[i].id + "\n";
    }
    try {
      await bot.say(categories)
    }
    catch (e){
      console.log("Category error.")
    }
  },
  
  hitMe: async function(bot, roomId, personId, query, firstName){
    let letters = "ABCD"
    let selectedCategory = query.slice(query.indexOf('hit me') + 'hit me'.length).trim();
    let response;
    let categoryString = ""
    if(selectedCategory !== ""){
      categoryString = "&category=" + selectedCategory
    }
    response = await fetch(constants.TRIVIA_QUESTIONS_URL + categoryString)
    response = await response.json();

    let results = response.results[0]
    let question =  atob(results.question);
    let correctAnswerString = atob(results.correct_answer).trim();
    let incorrectStrings = [atob(results.incorrect_answers[0].trim()), 
                            atob(results.incorrect_answers[1].trim()), atob(results.incorrect_answers[2].trim())];
    let choices = [correctAnswerString].concat(incorrectStrings);
    choices = utils.shuffle(choices);
    let correctAnswerLetter = letters.charAt(choices.indexOf(correctAnswerString));
    let questionString = firstName + ", " + question + "\n";

    for(let i = 0; i < choices.length; i++){
        questionString = questionString + "\n" + letters.charAt(i) + ") " + choices[i];
     }
    utils.addQuestionToDB(roomId, personId, question, correctAnswerLetter, correctAnswerString)
    await bot.say(questionString);
  },
  
  answer: async function(bot, query, roomId, personId, firstName) {
    let questionInfo;
    try {
      questionInfo = await utils.getQuestionInfo(roomId)
    }
    catch(e) {
     console.log("answer error")
    }
    
    let originalPerson = questionInfo.personId
    
    if(originalPerson !== personId) {
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
         userInfo = await utils.updateUser(roomId, personId, true)
        }
        catch(e) {
         console.log("Error updating user")
        }
      }
      else {
        replyString += "Sorry, " + firstName + ", that is incorrect. The correct answer is " + 
                       correctAnswerLetter + ") " + correctAnswerString + ".\n"
        try {
          userInfo = await utils.updateUser(roomId, personId, false)
        }
        catch(e) {
         console.log("Error updating user")
        }
      }
           
      replyString += "You have now answered " + userInfo.numCorrect + " out of " +userInfo.numQuestions + " questions correctly."
      bot.say(replyString)
    }
  }  
}