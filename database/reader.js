var _ = require('lodash');
var util = require('../core/util');

var config = util.getConfig();

var moment = require('moment');
var log = require(`${util.dirs().core}log`);

var mongojs = require('mongojs');


class CandleReader{
    constructor(){
        this.collections = [config.database.candleCollection];
        this.connection = mongojs(config.database.connectionString, this.collections);
        this.candleCollection = this.connection.collection(config.database.candleCollection);
        this.candleCollection.createIndex({time: 1, pair:1}, {unique: true});

        this.getCandles = this.getCandles.bind(this);
    }

     getCandles(pair, start){
        return new Promise ((resolve, reject) => {
            this.candleCollection.find({pair: pair, time: {$gte: start}}).sort({time: 1}).limit(3000, (err, docs) => {
                if (err) {
                    return reject(err);
                }
                return resolve(docs);
            })
        });
    }
}

module.exports = CandleReader;