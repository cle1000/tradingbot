var moment = require('moment');
var _ = require('lodash');


var telegram = require("node-telegram-bot-api");



class TelegramBot{
  constructor(config){
      _.bindAll(this, ['addIfSuccess', 'broadcast']);

      this.bot = new telegram(config.token, { polling: false });
      this.chats = [config.chat_id];
      this.bot.onText(/(.+)/, this.addIfSuccess);
  }

  addIfSuccess(msg, text){
    if (text == 'addme'){
      this.chats.push(Number.parseInt(msg.chat.id));
      this.bot.sendMessage(msg.chat.id, "You are added");
    }else{
      this.chats.remove(id => id == Number.parseInt(msg.chat.id));
      this.bot.sendMessage(msg.chat.id, "You are removed");
    }
  }

  broadcast(msg){
      this.chats.map(id => this.bot.sendMessage(id, msg));
  }

}

module.exports = TelegramBot;
