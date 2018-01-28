var log = require('./log');

var _ = require('lodash');
var moment = require('moment');
const EventEmitter = require('events');


class Heart extends EventEmitter {
  constructor(){
    super();
    this.tickrate = moment.duration(5, 'minutes');

    this.tick = this.tick.bind(this);
    this.pump = this.pump.bind(this);
  }

  pump(){
    setInterval(this.tick, this.tickrate);
    _.defer(this.tick);
  }

  tick(){
    this.emit('tick');
  }

}

module.exports = Heart;
