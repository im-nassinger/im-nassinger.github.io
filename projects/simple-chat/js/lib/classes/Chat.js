import * as commands from '../commands/index.js';
import MessageGroup from './MessageGroup.js';
import CommandArgument from './CommandArgument.js';
import { cleanString, nextTick, sleep } from '../utils.js';
import { findBestMatch } from '../string-similarity.js';

export default class Chat {
    constructor() {
        this.element = document.querySelector('.chat');
        this.input = this.element.querySelector('textarea');
        this.sendBtn = this.element.querySelector('.send-btn');
        this.messagesElement = this.element.querySelector('.messages-scroller');
        this.assistantInfo = { username: null, avatarURL: null };
        this.commands = this.mapCommands(Object.values(commands));
        this.allCommandNames = this.getAllCommandNames();
        this.typingIndicator = this.createTypingIndicator();
        this.isTyping = false;
        this.messageGroups = [];
        this.showPossibleCommand = true;
        this.currentConfirmationCallback = null;
    }

    mapCommands(commands) {
        return commands.map((Command) => new Command(this));
    }

    getAllCommandNames() {
        return this.commands.map(({ name, aliases }) => [ name, ...aliases ]).flat();
    }

    init() {
        this.initListeners();

        this.setAssistantInfo({
            username : 'Assistente Virtual',
            avatarURL: 'img/assistant_small.png'
        });

        this.addMessage({
            role: 'assistant',
            content: 'Seja bem-vindo!\nDigite __ajuda__ para ver a lista de comandos disponíveis.',
            timestamp: Date.now()
        });
    }

    initListeners() {
        this.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.handleInput();
            }
        });

        this.sendBtn.addEventListener('click', () => this.handleInput());
    }

    async handleInput() {
        if (this.isTyping) return;

        const content = this.input.value.trim();
        if (!content) return;

        const message = await this.addMessage({
            role: 'user',
            content,
            timestamp: Date.now()
        });

        this.input.value = '';

        this.onUserMessage(message);
    }
    
    get lastMessageGroup() {
        return this.messageGroups[this.messageGroups.length - 1];
    }

    async addMessage(messageOptions) {
        if (messageOptions.role === 'assistant') await this.fakeTyping();

        const newMessageGroup = new MessageGroup(this, messageOptions);
        const lastMessageGroup = this.lastMessageGroup;
        const shouldGroup = lastMessageGroup?.shouldGroupWith(newMessageGroup);

        if (shouldGroup) {
            lastMessageGroup.groupWith(newMessageGroup);
        } else {
            this.messagesElement.appendChild(newMessageGroup.element);
            this.messageGroups.push(newMessageGroup);
        }

        this.scrollToBottom();

        return newMessageGroup.lastMessage;
    }

    createTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('typing-indicator', 'hidden');

        const typingImage = document.createElement('img');
        typingImage.src = 'img/typing.svg';

        typingIndicator.appendChild(typingImage);
        return typingIndicator;
    }

    setTypingIndicatorVisible(visible) {
        nextTick(() => this.typingIndicator.classList.toggle('hidden', !visible));
    }

    async fakeTyping(fakeTypingMs = 800, animDurationMs = 200, preDelayMs = 400) {
        if (this.isTyping) return;
        this.isTyping = true;

        await sleep(preDelayMs);
        this.setTypingIndicatorVisible(false);

        const shouldCreateNewGroup = this.lastMessageGroup?.lastMessage?.role !== 'assistant';

        if (shouldCreateNewGroup) {
            const tempMessageGroup = new MessageGroup(this, { role: 'assistant' });
            this.messageGroups.push(tempMessageGroup);
            this.messagesElement.appendChild(tempMessageGroup.element);
        }

        this.messagesElement.appendChild(this.typingIndicator);

        this.setTypingIndicatorVisible(true);
        await sleep(animDurationMs);

        this.scrollToBottom();
        await sleep(fakeTypingMs);

        this.setTypingIndicatorVisible(false);
        await sleep(animDurationMs);

        this.messagesElement.removeChild(this.typingIndicator);
        this.isTyping = false;
    }

    scrollToBottom() {
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
    }

    setAssistantInfo({ username, avatarURL }) {
        this.assistantInfo.username = username;
        this.assistantInfo.avatarURL = avatarURL;

        const avatarElement = this.element.querySelector('.header img');
        const usernameElement = this.element.querySelector('.header .name');

        avatarElement.src = avatarURL;
        avatarElement.classList.remove('loading');
        usernameElement.textContent = username;
    }

    findCommand(commandName) {
        const cleanName = cleanString(commandName);

        return this.commands.find(({ name, aliases }) => {
            if (cleanString(name) === cleanName) return true;
            return aliases.some((alias) => cleanString(alias) === cleanName);
        });
    }

    async waitForUserConfirmation() {
        return new Promise((resolve) => {
            this.currentConfirmationCallback = (message) => {
                const confirmed = CommandArgument.getBoolean(message.content);
                resolve({ confirmed, message });
            };
        });
    }

    didNotUnderstand() {
        this.addMessage({
            role: 'assistant',
            content: 'Desculpe, não entendi seu comando.',
            timestamp: Date.now()
        });
    }

    runCommand(commandResolvable, args = []) {
        const command = typeof commandResolvable === 'string' ?
            this.findCommand(commandResolvable) : commandResolvable;

        let parsedArgs = {};

        if (command.hasArguments) {
            const checkedArgs = command.checkArguments(args);
            const invalidItem = checkedArgs.find(({ checkResult }) => !checkResult.valid);

            if (invalidItem) {
                const errorMessage = `Oops.\nO valor "${invalidItem.argument.name}" ${invalidItem.checkResult.reason}`;

                return this.addMessage({
                    role: 'assistant',
                    content: errorMessage,
                    timestamp: Date.now()
                });
            }

            parsedArgs = command.parseArguments(args);
        }

        try {
            command.call(parsedArgs);
        } catch (error) {
            this.addMessage({
                role: 'assistant',
                content: `Erro ao executar o comando "${command.name}".\n${error.message}`,
                timestamp: Date.now()
            });
        }
    }

    getPossibleCommandName(commandName, threshold = 0.5) {
        const { bestMatch } = findBestMatch(commandName, this.allCommandNames);
        return bestMatch.rating >= threshold ? bestMatch.target : null;
    }

    async handleWrongUsage(possibleCommandName) {
        this.addMessage({
            role: 'assistant',
            content: `Desculpe, você está tentando executar o comando "${possibleCommandName}"?`,
            timestamp: Date.now()
        });

        const { confirmed, message } = await this.waitForUserConfirmation();

        if (confirmed === true) {
            const command = this.findCommand(possibleCommandName);

            if (command.hasRequiredArguments) {
                await this.addMessage({
                    role: 'assistant',
                    content: `Para executar o comando "${possibleCommandName}", siga a sintaxe abaixo:`,
                    timestamp: Date.now()
                });

                const helpCommand = this.findCommand('ajuda');
                const helpMessage = helpCommand.getCommandHelpMessage(command, 'full');

                await this.addMessage({
                    role: 'assistant',
                    content: helpMessage,
                    timestamp: Date.now()
                });
            } else {
                this.runCommand(command);
            }
        } else if (confirmed === false) {
            this.addMessage({
                role: 'assistant',
                content: 'Ok, para ver a lista de comandos disponíveis, digite __ajuda__.',
                timestamp: Date.now()
            });
        } else {
            this.showPossibleCommand = false;
            await this.onUserMessage(message);
            this.showPossibleCommand = true;
        }
    }

    onUserMessage(message) {
        const callback = this.currentConfirmationCallback;

        if (callback) {
            this.currentConfirmationCallback = null;
            return callback(message);
        }

        const [ commandName, ...args ] = message.content.split(/\s+/);
        const command = this.findCommand(commandName);

        if (command) {
            this.runCommand(command, args);
        } else if (this.showPossibleCommand) {
            const possibleCommandName = this.getPossibleCommandName(commandName);

            if (possibleCommandName) {
                this.handleWrongUsage(possibleCommandName);
            } else {
                this.didNotUnderstand();
            }
        } else {
            this.didNotUnderstand();
        }
    }
}