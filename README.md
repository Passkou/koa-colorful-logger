# koa-colorful-logger

A middleware for koa that can log colorful request info automatically. And you can also use it as a normal logger.

# Installation

```bash
$ npm install -S koa-colorful-logger
```

# Example

![](./example.jpg)

```javascript
const Koa = require('koa');
const Logger = require('koa-colorful-logger');

const app = new Koa();

const logger = new Logger({
    /**
     * Should output logger info to file  
     * Default: false
     */
    output: true,
    /**
     * Where is log file in  
     * Default: `./logs`
     */
    outputDir: './logs',
    /**
     * Only when level exceed your setting will log info be output.  
     * Priority: DEBUG < INFO < WARNING < ERROR < CRITICAL
     */
    outputLevel: 'INFO',
    /**
     * The format of the prefix.  
     * Default is: '[level][time] '  
     * Available variables:
     * - [level]
     * - [time]
     */
    prefixFormat: '[level][time] ',
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
    msgFormatFunction: function (ctx, costTime) {
        return `${ctx.method} ${ctx.originalUrl} - ${ctx.status} - ${costTime}ms - ${ctx.ip}`;
    }
})
app.use(logger.middleware());

app.listen(4000);
```

# Output your message.

You can use these api below to output your message.

```javascript
logger.debug(msg);
logger.info(msg);
logger.warning(msg);
logger.error(msg);
logger.critical(msg);
/**
 * Param bodyColorFunc should be chalk.ChalkFunction
 */
logger.log(level, bodyColorFunc, msg);
```