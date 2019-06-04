/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
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
  }
  
  
}