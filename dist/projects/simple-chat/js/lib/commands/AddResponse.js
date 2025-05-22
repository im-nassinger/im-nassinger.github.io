import Command from '../classes/Command.js';

export default class AddResponse extends Command {
    constructor(chat) {
        super(chat, {
            name: 'resposta',
            aliases: [],
            description: 'Adiciona uma resposta customizada para um comando.',
            example: 'resposta tchau Até mais!',
            order: 5,
            args: [{
                name: 'comando',
                key: 'command',
                type: 'string',
                description: 'Nome do comando para adicionar.',
                optional: false
            }, {
                name: 'resposta',
                key: 'response',
                type: 'string',
                full: true,
                description: 'Resposta do comando.',
                optional: false
            }]
        });
    }

    call({ command, response }) {
        const newCommand = new Command(this.chat, {
            name: command,
            description: `Responde com: ${response}`,
            order: this.chat.commands.length + 1,
            call: () => this.reply(response)
        });

        this.chat.commands.push(newCommand);

        this.reply(`Comando **${command}** adicionado com sucesso!`);
    }
}