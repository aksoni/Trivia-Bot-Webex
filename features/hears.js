/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

var utils = require('../utils/utils.js')
var atob = require('atob');

module.exports = {
  
  help: async function(bot, message, firstName) {
    let helpMessage = ""
    helpMessage += "Hi, " + firstName + "! I'm Trivia Timmy! I will ask trivia questions and you will have to choose from the 4 choices given.\n\n";
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
  
  categories: async function(bot, message) {
    let response = await fetch('https://opentdb.com/api_category.php');
    response = await response.json();
    let categories = "Categories\n"
    for(let i = 0; i < response.trivia_categories.length; i++) {
      categories += response.trivia_categories[i].name + ": " + response.trivia_categories[i].id + "\n";
    }
    //console.log(categories)
    try {
      await bot.say(categories)
    }
    catch (e){
      console.log("Category error.")
    }
    //bot.say(categories);
  },
  
  hitMe: async function(bot, message, query, firstName){
    let letters = "ABCD"
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
    let correctAnswerString = atob(results.correct_answer).trim();
    let incorrectStrings = [atob(results.incorrect_answers[0].trim()), atob(results.incorrect_answers[1].trim()), atob(results.incorrect_answers[2].trim())];

    let choices = [correctAnswerString].concat(incorrectStrings);

    choices = utils.shuffle(choices);
    let correctAnswerLetter = letters.charAt(choices.indexOf(correctAnswerString));
    let questionString = firstName + ", " + question + "\n";

    for(let i = 0; i < choices.length; i++){
        questionString = questionString + "\n" + letters.charAt(i) + ") " + choices[i];
     }
    utils.addQuestionToDB(message, question, correctAnswerLetter, correctAnswerString)
    await bot.say(questionString);
    
    
  }
  
  
}