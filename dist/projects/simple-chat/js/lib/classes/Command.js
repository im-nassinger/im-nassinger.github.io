import CommandArgument from './CommandArgument.js';

export default class Command {
    constructor(chat, commandOptions) {
        this.chat = chat;
        this.name = commandOptions.name;
        this.aliases = commandOptions.aliases || [];
        this.description = commandOptions.description;
        this.order = commandOptions.order || 0;
        this.example = commandOptions.example || null;
        this.args = commandOptions.args ?
            this.mapArguments(commandOptions.args) : [];
        
        if (commandOptions.call) this.call = commandOptions.call;
    }

    get hasArguments() {
        return this.args.length > 0;
    }

    get hasRequiredArguments() {
        return this.args.some((argument) => !argument.optional);
    }

    mapArguments(args) {
        return args.map((argumentOptions) => new CommandArgument(argumentOptions));
    }

    walkArguments(args, callback) {
        for (let i = 0; i < this.args.length; i++) {
            const argument = this.args[i];
            const argText = argument.full ?
                args.slice(i).join(' ') : args[i];

            callback(argText || '', argument);
        }
    }

    checkArguments(args) {
        const results = [];

        this.walkArguments(args, (argText, argument) => {
            const checkResult = argument.check(argText);
            results.push({ argument, checkResult });
        });

        return results;
    }

    parseArguments(args) {
        const result = {};

        this.walkArguments(args, (argText, argument) => {
            const value = argument.parse(argText);
            result[argument.key] = value;
        });

        return result;
    }

    reply(content) {  
        return this.chat.addMessage({
            role: 'assistant',
            content,
            timestamp: Date.now()
        });
    }
}