import Koa from 'koa';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

interface MsgFormatFunction {
    (ctx: Koa.Context, costTime: number): string
}

interface Config {
    /**
     * Should output logger info to file  
     * Default: false
     */
    output?: boolean
    /**
     * Where is log file in  
     * Default: `./logs`
     */
    outputDir?: string
    /**
     * Only when level exceed your setting will log info be output.  
     * Priority: DEBUG < INFO < WARNING < ERROR < CRITICAL
     */
    outputLevel?: Level
    /**
     * The format of the prefix.  
     * Default is: '[level][time] '  
     * Available variables:
     * - [level]
     * - [time]
     */
    prefixFormat?: string
    /**
     * A function that should return a string for message.  
     * It will receive two args: 'ctx` and 'costTime'.  
     * Default is:  
     * ```javascript
     * function (ctx, costTime) {
     *     return `${ctx.method} ${ctx.originalUrl} - ${ctx.status} - ${costTime}ms - ${ctx.ip}`;
     * }
     * ```
     */
    msgFormatFunction?: MsgFormatFunction
}

function getLogFileName(date: Date) {
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.log`;
}

function getChalkFunction(level: Level): chalk.ChalkFunction {
    switch (level) {
        case 'DEBUG':
            return chalk.gray;
            break;
        case 'INFO':
            return chalk.greenBright;
            break;
        case 'WARNING':
            return chalk.yellowBright;
            break;
        case 'ERROR':
            return chalk.redBright;
            break;
        case 'CRITICAL':
            return chalk.red;
            break;
        default:
            return chalk.white;
            break;
    }
}

function formatDate(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
}

const defaultMsgFormatFunction: MsgFormatFunction = function(ctx, costTime) {
    return `${ctx.method} ${ctx.originalUrl} - ${ctx.status} - ${costTime}ms - ${ctx.ip}`;
}

type Level = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

const LEVEL_RANK: any = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4
}

class Logger {
    config: Config
    _logFilename: string
    _logFileStream?: fs.WriteStream
    _format: string
    _msgFormatFunction: MsgFormatFunction

    constructor(config: Config) {
        config.output = config.output || false
        config.outputDir = config.outputDir || './logs';
        config.outputLevel = config.outputLevel || 'INFO';
        this.config = config;
        this._logFilename = getLogFileName(new Date());
        this._format = config.prefixFormat || '[level][time] ';
        this._msgFormatFunction = config.msgFormatFunction || defaultMsgFormatFunction;
        if (config.output) {
            try {
                fs.accessSync(config.outputDir, fs.constants.F_OK);
            } catch(e) {
                // 输出文件夹不存在
                fs.mkdirSync(config.outputDir);
            }
            try {
                this._logFileStream= fs.createWriteStream(path.join(config.outputDir, this._logFilename), {flags: 'a'});
            } catch(e) {
                this.warning('Could not access to the log file. File output is now closed.')
                config.output = false;
            }
        }
    }
    /**
     * Return a middleware so you can use it.  
     * Ensure that it will be loaded at first.
     */
    middleware(): Koa.Middleware {
        const handler: Koa.Middleware = async (ctx, next) => {
            const timeStart = Date.now();
            await next();
            const timeEnd = Date.now();
            const cost = timeEnd - timeStart;
            const status = ctx.status;
            let level: Level = 'INFO';
            let colorFunc: chalk.ChalkFunction;
            if (status >= 100 && status < 200) {
                // 1xx
                colorFunc = chalk.gray;
                level = 'INFO';
            } else if (status >= 200 && status < 300) {
                // 2xx
                colorFunc = chalk.white;
                level = 'INFO';
            } else if (status >= 300 && status < 400) {
                // 3xx
                colorFunc = chalk.gray;
                level = 'INFO';
            } else if (status >= 400 && status < 500) {
                // 4xx
                colorFunc = chalk.yellow;
                level = 'INFO';
            } else {
                // 5xx
                colorFunc = chalk.redBright;
                level = 'ERROR';
            }
            let msg = this._msgFormatFunction(ctx, cost);
            this.log(level, colorFunc, msg);
        }
        return handler;
    }
    debug(...msg: any) {
        this.log('DEBUG', undefined, ...msg);
    }
    info(...msg: any) {
        this.log('INFO', undefined, ...msg);
    }
    warning(...msg: any) {
        this.log('WARNING', undefined, ...msg);
    }
    error(...msg: any) {
        this.log('ERROR', undefined, ...msg);
    }
    critical(...msg: any) {
        this.log('CRITICAL', undefined, ...msg);
    }
    log(level: Level, bodyColorFunc?: chalk.ChalkFunction, ...msg: any) {
        let printMsg = msg;
        if (bodyColorFunc) {
            printMsg = bodyColorFunc(msg);
        }
        switch (level) {
            case 'DEBUG':
                if (process.env.NODE_ENV === 'development') {
                    console.log(this._getLogPrefix(level, true) + printMsg);
                }
                break;
            default:
                console.log(this._getLogPrefix(level, true) + printMsg);
                break;
        }
        const config = this.config;
            
        if (config.output && LEVEL_RANK[level] >= LEVEL_RANK[<string>config.outputLevel]) {
            const n = getLogFileName(new Date());
            if (this._logFilename !== n) {
                // 新一天
                this._logFileStream!.end(() => {
                    this._logFileStream = fs.createWriteStream(path.join(<string>config.outputDir, n), {flags: 'a'});
                });
            }
            
            this._logFileStream!.write(this._getLogPrefix(level, false) + msg + '\n');
        }
    }
    _getLogPrefix(level: Level, useColor?:boolean): string {
        const now = new Date();
        let msg;
        if (useColor) {
            msg = this._format
                .replace('[level]', getChalkFunction(level)(`[${level}]`))
                .replace('[time]', chalk.cyan(`[${formatDate(now)}]`));
        } else {
            msg = this._format
                .replace('[level]', `[${level}]`)
                .replace('[time]', `[${formatDate(now)}]`);
        }
        return msg;
    }
}

export default Logger;
module.exports = Logger;