import Command from '../classes/Command.js';
import { sleep } from '../utils.js';

export default class HelpCommand extends Command {
    constructor(chat) {
        super(chat, {
            name: 'ajuda',
            aliases: [ 'comandos' ],
            description: 'Exibe infomações sobre um ou todos os comandos disponíveis.',
            example: 'ajuda repetir',
            order: 1,
            args: [{
                name: 'comando',
                key: 'command',
                type: 'string',
                description: 'Nome do comando para exibir informações.',
                optional: true
            }]
        });
    }

    getCommandHelpMessage(command, mode) {
        const { name, aliases, description, args,example } = command;

        let message = '';

        if (mode === 'short') {
            message += `**${name}**\n${description}`;
        } else if (mode === 'full') {
            message += `__Comando:__\n${name}\n\n`;
            message += `__Descrição:__\n${description}\n\n`;

            if (aliases.length)
                message += `__Aliases:__\n${aliases.join(', ')}\n\n`;
            
            if (args.length) {
                message += `__Argumentos:__\n`;

                args.forEach((argument, index) => {
                    const optional = argument.optional ? ' (opcional)' : '';
                    message += `${index + 1}. **${argument.name}**${optional}\n`;
                    message += `⤷ ${argument.description}`;
                    if (index < args.length - 1) message += '\n\n';
                });
            }

            message = message.trim();

            if (example)
                message += `\n\n__Exemplo:__\n${example}`;
        }

        return message;
    }
    
    async call(args) {
        if (args.command) {
            const command = this.chat.findCommand(args.command);

            if (command) {
                const helpMessage = this.getCommandHelpMessage(command, 'full');

                this.reply(helpMessage);
            } else {
                this.reply(`Comando "${args.command}" não encontrado.`);
            }
        } else {
            const helpMessage = this.chat.commands
                .sort((a, b) => a.order - b.order)
                .map(command => this.getCommandHelpMessage(command, 'short'))
                .join(`\n\n---\n`);

            await this.reply(helpMessage);
            await sleep(200);

            this.reply('Para mais informações sobre um comando específico, use:\n__ajuda <comando>__');
        }
    }
}