import Command from '../classes/Command.js';

export default class SayCommand extends Command {
    constructor(chat) {
        super(chat, {
            name: 'repetir',
            description: 'Repete a mensagem enviada.',
            example: 'repetir Olá, mundo!',
            order: 2,
            args: [{
                name: 'mensagem',
                key: 'message',
                type: 'string',
                full: true,
                description: 'Mensagem a ser repetida.',
                optional: false
            }]
        });
    }

    async call(args) {
        this.reply(args.message);
    }
}