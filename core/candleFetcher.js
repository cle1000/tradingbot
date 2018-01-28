var moment = require("moment");
var _ = require("lodash");
var util = require ('./util');
var config = util.getConfig();
var log =  require('./log');

const EventEmitter = require('events');

class CandleFetcher extends EventEmitter {

    constructor(pairs, getCandles, daterange=config.importer.daterange) {
        super();

        this.pairs = pairs;
        this.finish = false;
        this.data = [];

        this.getCandles = getCandles;

        this.handleFetchCandles = this.handleFetchCandles.bind(this);
        this.fetchCandles = this.fetchCandles.bind(this);
        this.get = this.get.bind(this);

        this.daterange = this.getDaterange(daterange);

    }

    getDaterange(daterange) {
        let from = moment.utc(daterange.from);
        let to = moment.utc(daterange.to) || moment().utc();
        if(!from.isValid())
          util.die('invalid `from`');

        if(!to.isValid() || to.isAfter(moment()))
          util.die('invalid `to`');

        return {
            from,
            to
        }
    }

    get() {
        if (this.finish)
            this.emit('done', this.lastCandleTime);
        else {
            if (_.isEmpty(this.data)) {
                this.fetchCandles();
            } else {
                this.forwardCandle();
            }
        }
    }


    forwardCandle(){
        let candle = this.data.pop();

        let time = _.first(candle).time

        _.each(candle, c => {
            if (c.time != time){
                console.log(candle);
                util.die(`${moment(time)}:[${time}] is invalid`);
            }
        })

        if (this.daterange.to.isBefore(moment(time+ moment.duration(5, 'minutes')))){
            this.finish = true;
            this.lastCandleTime = time;
        }
        this.emit('processCandle', candle, this.get.bind(this))
    }



    fetchCandles(){
        Promise.all(this.pairs.map((p) => this.getCandles(p, this.daterange.from.valueOf())))
            .then(candles => this.handleFetchCandles(candles))
            .catch((err) => console.log(err));
    }

    handleFetchCandles(candles){
        let amountCandles = _.size(_.first(candles));
        for (var i = 0; i < amountCandles; i++){
            this.data.push(candles.map(d => d.pop()));
        }
        this.daterange.from = moment.utc(_.first(_.first(this.data)).time).add(1, 'minute');
        this.forwardCandle();
    }
}

module.exports = CandleFetcher;
