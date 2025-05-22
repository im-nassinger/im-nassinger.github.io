import Command from '../classes/Command.js';

export default class AboutCommand extends Command {
    constructor(chat) {
        super(chat, {
            name: 'sobre',
            description: 'Exibe informações sobre o chatbot.',
            order: 3
        });
    }

    async call() {
        await this.reply(`Olá, eu sou um chatbot criado por Nassinger! 😄`);
        await this.reply(`Para acessar o meu código fonte, visite o repositório no [GitHub](https://github.com/im-nassinger/simple-chat).`);
    }
}