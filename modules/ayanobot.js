const Eris              = require('eris')
const { withConfig }    = require('../core/with')
const { cmd }           = require('../core/cmd')
const events            = require('../core/events')

const colors = {
    red: 14356753,
    yellow: 16756480,
    green: 1030733,
    blue: 1420012,
}

var bot, connected

const create = withConfig((ctx) => {

    ctx.allowExit = false
    bot = new Eris(ctx.config.ayanobot.token)
    var replych = ctx.config.ayanobot.reportchannel, lastmsg, tm

    const prefix = ctx.config.ayanobot.prefix
    const send = async (content, col) => {
        if(!connected) return;

        try {
            const color = col || colors.blue
            if(lastmsg && lastmsg.embed.color === color) {
                lastmsg.embed.description += `\n${content}`
                await bot.editMessage(lastmsg.ch, lastmsg.id, { embed: lastmsg.embed })
            } else {
                const embed = { description: content, color }
                const msg = await bot.createMessage(replych, { embed })
                lastmsg = { id: msg.id, ch: msg.channel.id, embed }
            }

            clearTimeout(tm)
            tm = setTimeout(() => lastmsg = null, ctx.config.grouptimeout)
        } catch(e) { ctx.error(e) }
    } 

    const format = (msg, shard) => `${!isNaN(shard)? `[SH${shard}] `:''}${msg}` 

    events.on('info', (msg, shard) => send(format(msg, shard), colors.green))
    events.on('warn', (msg, shard) => send(format(msg, shard), colors.yellow))
    events.on('error', (msg, shard) => send(format(msg, shard), colors.red))

    /* events */
    bot.on('ready', async event => {
        connected = true

        ctx.info('AyanoBOT connected and ready')
        await bot.editStatus('online', { name: 'over you', type: 3})
    })

    bot.on('messageCreate', async (msg) => {
        if (!msg.content.startsWith(prefix)) return;
        if (msg.author.bot || !ctx.config.ayanobot.admins.includes(msg.author.id)) return;
        msg.content = msg.content.toLowerCase()

        try {
            const args = msg.content.trim().substring(prefix.length + 1).replace(/\s\s+/, ' ').split(/\s/)
            replych = msg.channel.id
            await ctx.input(args)
            replych = ctx.config.ayanobot.reportchannel
        } catch(e) {
            ctx.error(e)
        }
    })

    bot.on('disconnect', () => {
        console.log('Bot disconnected')
    })

    bot.on('error', ctx.error)

    events.on('quit', () => disconnect(ctx))

})

const startbot = async(ctx, argv) => {
    if(connected)
        return await ctx.error(`AyanoBOT is already running`)

    if(!bot) create(ctx)
    
    await bot.connect()
}

const disconnect = async (ctx) => {
    if(!connected)
        return await ctx.error(`AyanoBOT is not running`)

    await bot.disconnect()
    await ctx.warn('AyanoBOT was disconnected')
    connected = false
}

cmd(['watch'], withConfig(startbot))
cmd(['stopwatch'], disconnect)
