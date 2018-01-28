var _ = require('lodash');
var util = require('../core/util');

var config = util.getConfig();

var moment = require('moment');
var log = require(`${util.dirs().core}log`);

var mongojs = require('mongojs');


class CandleWriter{
    constructor(){
        this.candleCache = []
        this.collections = [config.database.candleCollection];
        this.connection = mongojs(config.database.connectionString, this.collections);
        this.candleCollection = this.connection.collection(config.database.candleCollection);
        this.candleCollection.createIndex({time: 1, pair:1}, {unique: true});
    }

    addCandles(candles){
        _.each(candles, c => this.candleCache.push(c));
        if(_.size(this.candleCache) > 500){
            this.writeCandles();
        }


    }

    writeCandles(){
        this.candleCollection.insert(this.candleCache);
        this.candleCache = [];
    }

    finalize(){
        this.writeCandles();
        this.close();
    }

    close(){

    }
}

module.exports = CandleWriter;