import { cleanString } from '../utils.js';

const CommandArgumentTypes = {
    string : 'string',
    number : 'number',
    boolean: 'boolean'
};

const BooleanAnswers = {
    true : [ 'sim', 's', 'yes', 'y', 'true' ],
    false: [ 'nao', 'n', 'no', 'false' ]
};

export default class CommandArgument {
    constructor(argumentOptions) {
        this.name = argumentOptions.name;
        this.key = argumentOptions.key;
        this.type = CommandArgumentTypes[argumentOptions.type];
        this.description = argumentOptions.description;
        this.optional = argumentOptions.optional || false;
        this.full = argumentOptions.full || false;
        this.checkResult = { valid: null, reason: null };
        this.empty = false;
    }

    check(argText) {
        this.empty = !argText;

        if (this.empty) {
            return this.optional ?
                this.isValidBecause('é opcional.') :
                this.isWrongBecause('é obrigatório.');
        }
        
        if (this.needsToBe('string'))
            return this.isValidBecause('não está vazio.');

        if (this.needsToBe('number')) {
            const isActuallyNumber = CommandArgument.getNumber(argText) !== null;

            return isActuallyNumber ?
                this.isValidBecause('é mesmo um número.') :
                this.isWrongBecause('deve ser um número.');
        }
        
        if (this.needsToBe('boolean')) {
            const isActuallyBoolean = CommandArgument.getBoolean(argText) !== null;

            return isActuallyBoolean ?
                this.isValidBecause('é mesmo sim ou não.') :
                this.isWrongBecause('deve ser sim ou não.');
        }
    }

    isValidBecause(reason) {
        this.checkResult = { valid: true, reason };
        return this.checkResult;
    }

    isWrongBecause(reason) {
        this.checkResult = { valid: false, reason };
        return this.checkResult;
    }

    needsToBe(type) {
        return this.type === CommandArgumentTypes[type];
    }

    static getString(argText) {
        return !argText.length ? null : String(argText);
    }

    static getNumber(argText) {
        return isNaN(argText) ? null : Number(argText);
    }

    static getBoolean(argText) {
        const cleanContent = cleanString(argText);

        if (BooleanAnswers.true.includes(cleanContent)) return true;
        if (BooleanAnswers.false.includes(cleanContent)) return false;

        return null;
    }

    parse(argText) {
        if (this.needsToBe('string')) return CommandArgument.getString(argText);
        if (this.needsToBe('number')) return CommandArgument.getNumber(argText);
        if (this.needsToBe('boolean')) return CommandArgument.getBoolean(argText);
    }
}