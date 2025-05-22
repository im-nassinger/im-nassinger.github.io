import { pad, nextTick, sanitizeHTML, parseEmojis } from '../utils.js';

const MessageRoles = {
    assistant: 'assistant',
    user: 'user'
};

export default class Message {
    constructor(app, messageOptions = {}) {
        this.app = app;
        this.role = MessageRoles[messageOptions.role];
        this.content = messageOptions.content || '';
        this.timestamp = messageOptions.timestamp || Date.now();
        this.element = this.createElement();
    }

    getTime() {
        const date = new Date(this.timestamp);
        return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    createElement() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.style.setProperty('--time', '"' + this.getTime() + '"');

        const contentElement = document.createElement('span');
        contentElement.classList.add('content', 'hidden');
        contentElement.innerHTML = this.parseMarkdown(this.content);

        parseEmojis(contentElement);
        messageElement.appendChild(contentElement);
        return messageElement;
    }

    parseMarkdown(content) {
        return sanitizeHTML(content)
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/---/g, '<hr>')
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    }

    toggleVisibility(visible) {
        nextTick(() => {
            const contentElement = this.element.querySelector('.content');
            contentElement.classList.toggle('hidden', !visible);
        });
    }
}