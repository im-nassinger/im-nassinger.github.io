import Command from '../classes/Command.js';

export default class SayCommand extends Command {
    constructor(chat) {
        super(chat, {
            name: 'olá',
            aliases: [ 'oi', 'oii' ],
            description: 'Cumprimenta o usuário.',
            order: 4
        });
    }

    call() {
        this.reply('Olá! 😄');
    }
}