// index.js
const express = require('express');
const app = express();
const port = 3000;
// DISCORD
const {Client,IntentsBitField,Collection, Events, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js')

const config = require("../config.json")
const wait = require('timers/promises').setTimeout;
const fs = require('fs'); 
const path = require('path'); 

const status = {
    "online":false
}
//DISCORD
const client = new Client({
intents: [
    GatewayIntentBits.Guilds,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates
]})

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, async(...args) => await event.execute(...args));
    } else {
        client.on(event.name, async(...args) =>await event.execute(...args));
    }
}



app.get('/', (req, res) => {
    res.send('Hello World');
});

// app.get('/start', async (req, res) => {
//     if (status.online) {
//         res.send('Bot is already online');
//         return;
//     }

    
//     try {
//         await client.login(config.token);
//         status.online = true;
//         res.send('Bot is starting');
//     } catch (error) {
//         console.error('Error starting bot:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);    
});


client.login(config.token);

client.once('ready', async () => {
    console.log(`Đã sẵn sàng  ${client.user.tag}`);
    status.online = true
    client.user.setPresence({
        activities:[{
        name: `Zzz`,type: ActivityType.Listening
        }],
        status:"idle"
    })	
}) 




