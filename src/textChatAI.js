const { Events, Client, Collection } = require('discord.js');
const fs = require('fs'); 
const path = require('path');
const config = require('../config.json');
const {wlog, infoWeather } = require('./tool.js')
const {
	GoogleGenerativeAI,
    HarmBlockThreshold, HarmCategory,
    FunctionCallingMode,
} = require("@google/generative-ai");

const { timeStamp } = require('console');

const apiKey = config['gmn-key'];
const genAI = new GoogleGenerativeAI(apiKey);

// const getWeatherAnwser = {
//     name : 'getWeather',
//     description : "Lấy thông tin thời tiết của một địa điểm cụ thể.",
//     parameters :  {
//         type: "OBJECT",
//         properties: {
//             location: {
//                 type: "STRING",
//                 description: "Địa điểm cần lấy thông tin thời tiết."
//             }
//         },
//         required: ['location']
//     },   
// }

const funcs = {
    'weather' : infoWeather
}

// const funcs = {
//     'getWeather': infoWeather
// }

const model = genAI.getGenerativeModel({
	model: config['gmn-model'],
    tools: [{
        codeExecution: {},// Chỉ sử dụng công cụ được hỗ trợ,
        
    }]
});

//Save last reply time
// let last_reply = new Date().getTime()
// Delay reply
const delay_reply = 10000
const max_history = 15

// const path_default = path.join(__dirname, '/data')
// const promt_path = path.join(path_default, 'promt.txt')
// const base_chat_path = path.join(path_default,'default_chat.json')

// const promt_text = fs.readFileSync(promt_path, 'utf8');
// const default_promt_path = JSON.parse(fs.readFileSync(base_chat_path, 'utf8'))

//Init Model
class BoxChatAI{
    static data_path = null
    static default_promt = null
    static default_chat = null
    static recent_chat_max = config['recent-chat-max']
    static generationConfig = {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
    };
    static debug = {
        discord_id_guild: config['error-log-guild'],
        discord_id_channel: config['error-log-channel']
    }
    static max_history = 15
    #history = []
    #last_attachment = null
    #chatSession = null
    #archived = []
    #lastChat = null
    constructor(){
        this.#history = []
        this.#last_attachment = null
    }

    static async setup(path_default,promt_path,default_chat, archived) {
        BoxChatAI.data_path = path_default
        BoxChatAI.default_promt = promt_path
        BoxChatAI.default_chat = default_chat
        BoxChatAI.archived = archived
    }

    checkReady(){
        return BoxChatAI.data_path && BoxChatAI.default_promt && BoxChatAI.default_chat
    }

    #initDefaultChat(){     
        let p = []   
        // console.log(BoxChatAI.default_promt)
        if (BoxChatAI.default_promt.length > 0) {
            p.push({
                role: 'user',
                parts: [
                    {text: BoxChatAI.default_promt}
                ]
            })
            p.push({
                role: 'model',
                parts: [
                    {text: "OK!"}
                ]
            })
        }
        p = p.concat(BoxChatAI.default_chat)

        if (this.#archived.length > 0) {
            p = p.concat(this.#archived)
        }

        return p
    }

    async init(archived = null){
        if (!this.checkReady()) {
            console.error("Data path, promt and default chat must be set")
            return
        }
        const h = this.#initDefaultChat()
        if (archived) {
            h = h.concat(archived)
        }
        this.#chatSession = model.startChat({
            generationConfig: BoxChatAI.generationConfig,
            history: this.#initDefaultChat(),
            safetySettings: [{
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                }
            ],
            tools: {
                codeExecution: {},
                // functionDeclarations: [getWeatherAnwser],
                // functionCallingMode: FunctionCallingMode.FUNCTION_CALLING_MODE_BLOCKING,
            },
        })
    }

    

    async addHistory(name, content){
        if (typeof content !== 'string' || content.length === 0) {
            return
        }

        this.#history.push(`${name}: ${content}`)

        if (this.#history.length > this.max_history) {
            this.#history.shift()
        }
    }

    async addAttachment(attachment){
        this.#last_attachment = attachment
    }

    exportChat(){
        return this.#lastChat
    }

    async getReply(name, content, more_info){
        if (!this.#chatSession) {
            console.error("Chat session not init")
            return
        }
        
        let text = this.#history.join('\n') + '\n' + `${name}: ${content}`
        if (more_info) {
            text =  more_info+'\n'+text
        }

        console.log(text)

        const send = this.#last_attachment ? [this.#last_attachment, text]:[text]
        let reply;
        try {
            reply = await this.#chatSession.sendMessage(send)
            reply = reply.response.text()

            // Ví dụ: </callFunction weather('Thành phố Hồ Chí Minh','1')>
            const functionCallRegex = /<\/callFunction (\w+)\(([^)]+)\)>/;
            const match = reply.match(functionCallRegex);
            if (match) {
                const functionName = match[1];
                const argsString = match[2];
                const args = argsString.split(',').map(arg => arg.trim().replace(/^'(.*)'$/, '$1'));
                console.log("Function call:", functionName, args);
                let t = ""
                if (funcs[functionName]) {
                    t = await funcs[functionName](...args)
                }
                t = `
                Đây là thông tin được cung cấp: ${t}. Hãy trả lời câu hỏi trước đó dựa vào thông tin đã được cung cấp.
                `.trim();
                reply = await this.#chatSession.sendMessage(t);
                reply = reply.response.text();
                console.log("Function call reply:", t);
            }

            
            this.#history = []
            this.#last_attachment = null
            this.#lastChat = [
                {
                    role: 'user',
                    parts: [
                        {text: text}
                    ]
                },
                {
                    role: 'model',
                    parts: [
                        {text: reply}
                    ]
                }
            ]
                
        } catch (error) {
            wlog(`$[TextChatAI.JS] - ${error}`)
            console.error("Error generating response:", error);
            reply = "Em chóng mặt quá, cho em ngủ xíu!!! Zzz";
        }
        

        return reply
    }    

    async restart(){
        this.#chatSession = null
        this.#history = []
        this.#last_attachment = null
        this.#lastChat = null
        this.init()
    }

}



module.exports = BoxChatAI