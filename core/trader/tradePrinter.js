var chalk = require('chalk');
var moment = require('moment');
var log = require('../log');

var tradePrinter = {
    printTrade : (trade) => {
        let percent = (trade.sold.price/trade.bought.price * 100) - 100;
        let color = (trade.bought.price < trade.sold.price) ? chalk.green : chalk.red;

        log.info(color(`TRADE DONE Pair: ${trade.pair} ${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%` +
            ` ${trade.bought.amount.toFixed(2)} ` +
            ` ${trade.sold.amount.toFixed(2)}` +
            ` from: ${moment(trade.bought.time).format()} to: ${moment(trade.sold.time).format()}`));
    },
    printOpenTrade : (ot, price) => {
        let percent = (price/ot.bought.price * 100) - 100;
        let color = (ot.bought.price < price) ? chalk.green : chalk.red;

        log.info(color(`Pair: ${ot.pair}[${ot.bought.assets.toFixed(4)}a] ${ot.bought.price}/${price} ${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%` +
            ` ${ot.bought.amount.toFixed(2)} ` +
            ` from: ${moment(ot.bought.time).format()}`));
    }
}

module.exports = tradePrinter;
