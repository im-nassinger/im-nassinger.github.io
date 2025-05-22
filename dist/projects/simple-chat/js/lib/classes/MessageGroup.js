import { nextTick } from '../utils.js';
import Message from './Message.js';

const MessageSides = {
    assistant: 'left',
    user: 'right'
};

export default class MessageGroup {
    constructor(app, messageOptions = {}) {
        this.app = app;
        this.side = MessageSides[messageOptions.role];
        this.messages = [];

        if (messageOptions.content)
            this.messages.push(new Message(app, messageOptions));
        
        this.element = this.createElement();
    }

    get lastMessage() {
        return this.messages[this.messages.length - 1];
    }

    createElement() {
        const groupElement = document.createElement('div');
        groupElement.classList.add('message-group', this.side);

        if (this.side === MessageSides.assistant) {
            const avatarElement = document.createElement('div');
            avatarElement.classList.add('avatar', 'hidden');
            nextTick(() => avatarElement.classList.remove('hidden'));

            const imageElement = document.createElement('img');
            imageElement.src = this.app.assistantInfo.avatarURL;

            avatarElement.appendChild(imageElement);
            groupElement.appendChild(avatarElement);
        }

        for (const message of this.messages) {
            groupElement.appendChild(message.element);
            message.toggleVisibility(true);
        }

        return groupElement;
    }

    shouldGroupWith(otherGroup, maxIntervalMinutes = 5) {
        if (this.side !== otherGroup.side) return false;

        const thisLastMessage = this.lastMessage;
        const otherLastMessage = otherGroup.lastMessage;

        if (!thisLastMessage || !otherLastMessage) return true;

        const maxIntervalMs = maxIntervalMinutes * 60 * 1000;
        const elapsedMs = Math.abs(thisLastMessage.timestamp - otherLastMessage.timestamp);

        return elapsedMs <= maxIntervalMs;
    }

    groupWith(otherGroup) {
        this.messages.push(...otherGroup.messages);

        for (const message of otherGroup.messages) {
            this.element.appendChild(message.element);
            message.toggleVisibility(true);
        }
    }
}