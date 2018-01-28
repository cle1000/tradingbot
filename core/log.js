var util = require('./util');

var moment = require('moment');
var _ = require('lodash');

var TelegramBot = require('./telegrambot');

var config = util.getConfig();
var chatbot = new TelegramBot(config.telegrambot);


var sendToParent = function() {
  var send = method => (...args) => {
    process.send({'log': args.join(' ')});
  }

  return {
    error: send('error'),
    warn: send('warn'),
    info: send('info'),
    write: send('write')
  }
}

var Log = function() {
  _.bindAll(this);
  this.output = console;
};

Log.prototype = {
  _write: function(method, args, name) {
    if(!name)
      name = method.toUpperCase();

    args = Array.from(args);

    var message = moment().format('YYYY-MM-DD HH:mm:ss:SSS');
    message += ' (' + name + '):\t';
    message += args;
    if(!config.debug)
      if (name == 'INFO' && chatbot)
        chatbot.broadcast(args);


    this.output[method](message);
  },
  error: function() {
    this._write('error', arguments);
  },
  warn: function() {
    this._write('warn', arguments);
  },
  info: function() {
    this._write('info', arguments);
  },
  write: function() {
    var args = _.toArray(arguments);
    var message = fmt.apply(null, args);
    this.output.info(message);
  }
}

if(config.debug)
  Log.prototype.debug = function() {
    this._write('info', arguments, 'DEBUG');  
  }
else
  Log.prototype.debug = _.noop;


module.exports = new Log;