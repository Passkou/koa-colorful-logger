const Koa = require('koa');
const Logger = require('./dist/index.js');

const app = new Koa();

const logger = new Logger({
    output: true,
    outputDir: './logs',
    outputLevel: 'INFO',
    prefixFormat: '[level][time] ',
    msgFormatFunction: function (ctx, costTime) {
        return `${ctx.method} ${ctx.originalUrl} - ${ctx.status} - ${costTime}ms - ${ctx.ip}`;
    }
})
app.use(logger.middleware());

app.listen(4000);