import { Button, Link, LinkContainer, Section, SectionDescription, SectionHashTitle, SectionInfo, SectionTitle, Text } from '@/components/ui';
import { EmailJSConfig } from '@/config/emailjs';
import { links } from '@/config/links';
import { useTranslation } from '@/hooks/useTranslation';
import { clsx } from '@/utils/dom/clsx';
import emailjs from '@emailjs/browser';
import { t } from 'i18next';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import './Contact.css';

export type GenericInputProps = {
    type: 'input' | 'textarea';
    name?: string;
    className?: string;
    placeholder?: string;
    placeholderI18n?: string;
}

export function GenericInput(props: GenericInputProps) {
    const Tag = props.type;
    const type = props.type === 'input' ? 'text' : undefined;
    const { t } = useTranslation(!!props.placeholderI18n);
    const placeholder = props.placeholderI18n ? t(props.placeholderI18n) : props.placeholder;

    return (
        <div className={clsx('generic-input', props.className)}>
            <Tag
                className="input"
                type={type}
                name={props.name}
                placeholder={placeholder}
            />
        </div>
    );
}

function sendEmail(form: HTMLFormElement): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const onSuccess = () => {
            form.reset();
            resolve(true);
        };

        const onError = (error: any) => {
            console.error(error);
            reject(error);
        };

        const { serviceId, templateId, publicKey } = EmailJSConfig;

        emailjs
            .sendForm(serviceId, templateId, form, { publicKey })
            .then(onSuccess, onError);
    });
}

export function MessageForm() {
    const form = useRef<HTMLFormElement>(null);

    const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);
        const name = formData.get('name') as string;
        const message = formData.get('message') as string;

        if (!name || !message) {
            toast.error(t('contact.message_form.missing_fields'));
            return;
        }

        const promise = sendEmail(form);
        const pending = t('contact.message_form.sending_message');
        const success = t('contact.message_form.success');
        const error = t('contact.message_form.error');

        toast.promise(promise, { pending, success, error });
    };

    return (
        <form className="message-form" ref={form} onSubmit={onSubmit}>
            <div className="entry">
                <Text className="label" i18n="contact.message_form.name_title"></Text>
                <GenericInput type="input" name="name" placeholderI18n="contact.message_form.name_placeholder" />
            </div>

            <div className="entry">
                <Text className="label" i18n="contact.message_form.message_title"></Text>
                <GenericInput type="textarea" name="message" placeholderI18n="contact.message_form.message_placeholder" />
            </div>

            <Button className="send-message-btn" type="submit" i18n="contact.message_form.submit"></Button>
        </form>
    );
}

export function ContactInfo() {
    return (
        <SectionInfo>
            <SectionTitle i18n="contact.title"></SectionTitle>
            <SectionDescription i18n="contact.description"></SectionDescription>
        </SectionInfo>
    )
}

export function ContactSectionContent() {
    return (
        <>
            <div className="info-and-links-container">
                <SectionHashTitle i18n="nav.buttons.contact"></SectionHashTitle>
                <ContactInfo />
                <LinkContainer>
                    {
                        links.map((link) => (
                            <Link key={link.name} icon={link.icon} href={link.href} target="_blank">
                                {link.name}
                            </Link>
                        ))
                    }
                </LinkContainer>
            </div>
            <div className="send-message-container">
                <MessageForm />
            </div>
        </>
    )
}

export function Contact() {
    return (
        <Section className="contact" id="contact">
            <ContactSectionContent />
        </Section>
    )
}