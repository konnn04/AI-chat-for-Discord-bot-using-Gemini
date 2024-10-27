const { Events, Client, Collection } = require('discord.js');
const fs = require('fs'); //Quản lý file
const path = require('path');
const config = require('../../config.json');
const axios = require('axios');
const BoxChatAI = require('../textChatAI.js');
const wlog = require('../tool.js').wlog

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

// const allowed_channels = ["1110426046165172224_1110426047087923222"]
const allowed_channels = []

let last_reply = new Date().getTime()

const delay_reply = 10000

const chats = new Collection();

BoxChatAI.setup(path_default, promt_text, default_chat)

//Limit chat number in recent chat
const recent_chat_max = config['recent-chat-max']


//Save last reply time
module.exports = {
	name: Events.MessageCreate,	
	async execute(message) {
		// Ignore
		if (message.author.bot || message.author.id == message.client.user.id)  return
		
		const id_channel = message.guild.id+"_"+message.channel.id

		//Check if the bot is mentioned in the message and reply to it
		if (message.content == 'hsn!start') {
			if (allowed_channels.includes(id_channel)) {
				message.reply('Em sẵn sàng từ lâu rồi, thầy không cần dùng lệnh nữa đâu ạk! 🌟')
				return
			}
			// Add channel to allowed channels
			allowed_channels.push(id_channel)
			chats.set(id_channel, new BoxChatAI())
			chats.get(id_channel).init()
			message.reply('Hoshino đã sẵn sàng trò chuyện! 🌟')
			return
		}

		// Check if the channel is allowed
		if (checkAllowedChannel(id_channel) == false) return

		const bot = chats.get(id_channel)
		const displayName = message.author.displayName		
		// console.log("["+message.guild.name+"|"+message.channel.name+"] " +displayName+": "+message.content)
        
		// Check if the message contains an attachment
		if (message.attachments.size > 0) {
			const attachment = await fileToGenerativePart(message.attachments.first().url, message.attachments.first().contentType)
			bot.addAttachment(attachment)
		}	
		
		// Check if the message contains a mention to the bot
		if  (message.content.includes(`<@${message.client.user.id}>`)) {
			const now = new Date().getTime()
			setTimeout(async () => {
				try {
					await replyAI(bot, message, id_channel)
				} catch (error) {
					wlog(`${id_channel} - ${error}`)
					sendErrorLog(message, error)
					console.log('Error: ', error)
					chats.delete(id_channel)
					chats.set(id_channel, new BoxChatAI())
					chats.get(id_channel).init()
				}
			}, now - last_reply > delay_reply ? 0 : delay_reply)	
		}else{
			bot.addHistory(displayName, processMessage(message))
		}
	}
};

function processMessage(message) {
	let content = message.content;
	const userMentions = message.mentions.users;
	userMentions.forEach(user => {
		const mentionTag = `<@${user.id}>`;
		const userDisplayName = message.guild.members.cache.get(user.id).displayName;
		content = content.replace(new RegExp(mentionTag, 'g'), userDisplayName);
	});
	return content;
}

async function replyAI(bot, message, id_channel) {
	const displayName = message.author.displayName	
	// console.log(message.guild.members.cache.filter(member => member.presences))
	let  content = displayName+": "+ processMessage(message)
	const more = `
	--- Thông tin thêm ---
	Người gửi: ${displayName}\n
	Id người gửi: ${message.author.id}\n
	Server: ${message.guild.name}\n
	Channel: ${message.channel.name}\n
	Ngày giờ hiện tại: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n
	Số người trong server: ${message.guild.memberCount}\n
	--- Kết thúc thông tin thêm ---
	`.trim()
	

	await bot.getReply(displayName, content, more).then(async (reply) => {
		// Hậu kì
		if (reply == null) {
			await message.reply('Em không hiểu ý thầy ạ, thầy nói rõ hơn được không? 🤔')
			return
		}
		
		const msgs = reply.split('</drop_chat>')
		let i = 0;
		for (const msg of msgs) {
			if (i == 0) {
				if (msg.trim().length > 0) {
					await message.reply(msg.trim())
				}
				i++
			} else {
				if (msg.trim().length > 0) {
					await message.channel.send(msg.trim())
				}
			}
			
		}
		// Save chat history
		console.log("["+message.guild.name+"|"+message.channel.name+"] Hoshino: "+reply)
		// Save chat history
		const chat = bot.exportChat()
		saveChat(id_channel, chat)

	}).catch(async (error) => {
		wlog(`${id_channel} - ${error}`)
		await message.reply('*Sensei làm em chóng mặt quá, cho em nghỉ một chút nhé! *😵');
		console.log('Error: ', error)
		sendErrorLog(message, error)
		chats.delete(id_channel)
		chats.set(id_channel, new BoxChatAI())
		chats.get(id_channel).init()
	})
}

function saveChat(id_channel, items) {
	const chat_path = path.join(path_default, id_channel + '.json')
	if (!fs.existsSync(chat_path)){
		obj = JSON.stringify([items])
		fs.writeFileSync(chat_path, obj, { flag: 'w+' })
	}else{
		const load_chat = JSON.parse(fs.readFileSync(chat_path, 'utf8'))
		load_chat.concat(items)
		obj = JSON.stringify(load_chat)
		fs.writeFileSync(chat_path, obj)
	}

}

async function fileToGenerativePart(url, contentType) {
	if (!contentType.includes('image') && !contentType.includes('pdf') && !contentType.includes('audio')) return null
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

function checkAllowedChannel(id_channel) {
	return allowed_channels.includes(id_channel)
}

