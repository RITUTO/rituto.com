const moment = require('moment-timezone');
const fs = require("fs")
const color = {
  black: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
  reset: '\u001b[0m',
}


function getTime(timezone = "Asia/Tokyo", mode) {
    const now = moment().tz(timezone);
    switch (mode) {
      case 'date':
        return now.format('MM/DD HH:mm:ss');
      case 'year':
        return now.format('YYYY MM/DD HH:mm:ss');
      case 'timestamp':
        return now.format();
      case undefined:
        return now.format('HH:mm:ss');
      default:
        return now.format(mode);
    }
  }
class Logger {
  constructor() {}
  
  static log(...args) {
    console.log(`${color.blue}${getTime()}${color.reset} Log [${this.name}]`, ...args);
    fs.appendFileSync('./logs.txt', ` ${getTime()} Log [${this.name}] ${args.join("").replace(/192.168.0.10|192.168.0.10:|192.168.0.10:9000|192.168.0.10:9000"/,"xxx.xxx.x.xx")}\n`, "utf-8", (err) => {
      if(err) {
        console.log(err);
      }
    });
  }
  
  static info(...args) {
    console.log(`${color.blue}${getTime()} ${color.cyan}Info${color.reset} [${this.name}]`, ...args);
    fs.appendFileSync('./logs.txt', `${getTime()} Info [${this.name}] ${args.join("")}\n`, "utf-8", (err) => {
      if(err) {
        console.log(err);
      }
    });
  }
  
  static warn(...args) {
    console.log(`${color.blue}${getTime()} ${color.yellow}Warn${color.reset} [${this.name}]`, ...args, color.reset);
    this.logs.push(`${getTime()} Warn[${this.name}]`,...args)
    fs.appendFileSync('./logs.txt', `${getTime()} Warn[${this.name}] ${args.join("")}\n`, "utf-8", (err) => {
      if(err) {
        console.log(err);
      }})
  }
  
  static error(...args) {
    console.log(`${color.blue}${getTime()} ${color.red}Error${color.reset} [${this.name}]`, ...args, color.reset);
    fs.appendFileSync('./logs.txt', `- ${getTime()} Error[${this.name}] ${args.join("")} \n`, "utf-8", (err) => {
      if(err) {
        console.log(err);
      }})
  }
  
  static debug(...args) {
    if (this.option.debug) console.log(`${color.blue}${getTime()()}${color.magenta} Debug [${this.name}]`, ...args, color.reset);
  }
  

}

module.exports = Logger;