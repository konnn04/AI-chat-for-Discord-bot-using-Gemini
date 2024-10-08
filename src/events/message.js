const { Events, Client, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');
const axios = require('axios');


const {
	GoogleGenerativeAI
} = require("@google/generative-ai");
const { timeStamp } = require('console');

const apiKey = config['gmn-key'];
const genAI = new GoogleGenerativeAI(apiKey);

const path_default = path.join(__dirname, '../data')
const promt_path = path.join(path_default, 'promt.txt')
const base_chat_path = path.join(path_default,'default_chat.json')

const promt_text = fs.readFileSync(promt_path, 'utf8');
const default_chat = JSON.parse(fs.readFileSync(base_chat_path, 'utf8'))

// Set up a fixed Discord channel for error reporting
const error_log_guild = config['error-log-guild']
const error_log_channel = config['error-log-channel'] 

//Init Model
const model = genAI.getGenerativeModel({
	model: config['gmn-model'],
});

//Save last reply time
let last_reply = new Date().getTime()
// Delay reply
const delay_reply = 10000

const generationConfig = {
	temperature: 0,
	topP: 0.95,
	topK: 40,
	maxOutputTokens: 8192,
	responseMimeType: "text/plain",
};

const chatSessions = new Collection();
const recent_chats = new Collection()
const last_attachments = new Collection()

//Limit chat number in recent chat
const recent_chat_max = config['recent-chat-max']

//Add chat to recent chat
function addRecentChat(id_channel ,name, content) {
	if (!content) return
	recent_chats[id_channel].push({
		name: name,
		content: content,
		timeStamp: new Date().getTime()
	})
	console.log("[V] " + id_channel + "| new chat added, have " + recent_chats[id_channel].length + " chat")

	if (recent_chats[id_channel].length > recent_chat_max) {
		recent_chats[id_channel].shift()
	}
}

// Init new Chat
async function initChat(id_channel) {
	let history_chat = []

	if (fs.existsSync(path.join(path_default, id_channel+".json"))){
		history_chat = fs.readFileSync(path.join(path_default, id_channel+".json"), 'utf8')
		history_chat = JSON.parse(history_chat)
	}

	const history = [
		{
		  role: "user",
		  parts: [
			{text: promt_text},
		  ],
		},
		{
		  role: "model",
		  parts: [
			{text: "OK\n"},
		  ],
		}
	]

	default_chat.forEach(chat => {
		history.push({
			role: 'user',
			parts: [
				{text: `${
					chat.user.history.map(h => `<chat> ${h.name}: ${h.content} <chat>`).join('\n')
				}\n` +chat.user.name+": "+chat.user.content},
			],
		})
		history.push({
			role: 'model',
			parts: [
				{text: chat.model.content},
			],
		})
	})

	history_chat.forEach(chat => {
		history.push({
			role: 'user',
			parts: [
				{text: chat.user.name+": "+chat.user.content},
			],
		})
		history.push({
			role: 'model',
			parts: [
				{text: chat.model.content},
			],
		})
	})
	

	chatSessions[id_channel] = model.startChat({
		generationConfig,
		// safetySettings: Adjust safety settings
		history: history
	});
}

module.exports = {
	name: Events.MessageCreate,
	
	async execute(message) {
		const displayName = message.author.displayName		
		const id_channel = message.guild.id+"_"+message.channel.id
		console.log("["+message.guild.name+"|"+message.channel.name+"] " +displayName+": "+message.content)
        if (message.author.id == message.client.user.id) return

		//Check if message has attachment, only process the first attachment
        if (message.attachments.size > 0) {
			const attachment = await fileToGenerativePart(message.attachments.first().url, message.attachments.first().contentType)
			if (attachment) {
				last_attachments[id_channel] = attachment
				console.log("[V] " + id_channel + "| Add attachment")
			}
		}
		//Check if message is mention bot
		if (!message.author.bot) {			
			if (message.content.includes(`<@${message.client.user.id}>`)) {	
				const now = new Date().getTime()
				setTimeout(async () => {
					await replyAI(message, id_channel)
				}, now - last_reply > delay_reply ? 0 : delay_reply)
			}else{
				addRecentChat(id_channel,displayName,message.content)
				console.log("[V] + " + id_channel + "| Add chat to recent chat")
			}
		}
	},
};

async function replyAI(message, id_channel) {
	if (!chatSessions[id_channel]) {
		await initChat(id_channel)
		console.log("[V] " + id_channel + "| Init chat")
	}
	const chatSession = chatSessions[id_channel];

	const displayName = message.author.displayName
	
	let  content = displayName+": "+ message.content.replace(`<@${message.client.user.id}>`,'Hoshino')
	// Replace user mentions with their display names
	const userMentions = message.mentions.users;
	userMentions.forEach(user => {
		const mentionTag = `<@${user.id}>`;
		const userDisplayName = message.guild.members.cache.get(user.id).displayName;
		content = content.replace(new RegExp(mentionTag, 'g'), userDisplayName);
	});

	// Send recent chat
	history_chat = ""
	if (recent_chats[id_channel] && recent_chats[id_channel].length > 0) {
		history_chat = recent_chats[id_channel].map(chat => {
			return `<chat> ${chat.name}: ${chat.content} <chat>`
		}).join("\n")				
		recent_chats[id_channel] = []
	}	

	const user_question = {
		"name": displayName,
        "content": content,
        "timestamp": new Date().getTime(),
        "history":recent_chats[id_channel]
	}

	// Send message to AI
	try {
		if (last_attachments[id_channel]) {
			result = await chatSession.sendMessage([history_chat + content, last_attachments[id_channel]]);
			last_attachments[id_channel] = null
		}else{
			result = await chatSession.sendMessage(history_chat + content);
		}

		let replyText = result.response.text();
		if (replyText.trim().indexOf("<//>")==0) {
			replyText=replyText.trim().substring(4)
		}
		const replyArray = replyText.split('<//>');

		for (const [index, line] of replyArray.entries()) {
			try {
				await (index === 0 ? message.reply(line) : message.channel.send(line));
			} catch (error) {
				console.log("[V] Error when send the message: ", error);
				sendErrorLog(message, error)
			}
		}

		const model_reply = {
			"name": message.client.user.username,
			"content": replyText,
			"timestamp": new Date().getTime(),
			"history":[]
		}		

		const item = {
			user: user_question,
			model: model_reply
		}

		const chat_path = path.join(path_default, id_channel + '.json')

		if (!fs.existsSync(chat_path)){
			obj = JSON.stringify([item])
			fs.writeFileSync(chat_path, obj, { flag: 'w+' })
		}else{
			const load_chat = JSON.parse(fs.readFileSync(chat_path, 'utf8'))
			load_chat.push(item)
			obj = JSON.stringify(load_chat)
			fs.writeFileSync(chat_path, obj)
		}

	} catch (error) {
		console.log(error)
		await message.reply('[Error] Sensei làm em chóng mặt quá, cho em nghỉ một chút nhé! 😵');
		sendErrorLog(message, error)
		initChat()
	}
	return
}

async function fileToGenerativePart(url, contentType) {
	if (!contentType.includes('image') && !contentType.includes('document')) return null
	const response = await axios.get(url, {
		responseType: 'arraybuffer'
	})
	const buffer = Buffer.from(response.data, 'binary')
	const base64 = buffer.toString('base64')
	return {
		inlineData: {
			data: base64,
			mimeType: contentType
		},
	};
}


function sendErrorLog(message, error) {
	const error_log = message.client.guilds.cache.get(error_log_guild).channels.cache.get(error_log_channel)
	error_log.send(`Error: \n${error}`)
}
