import { TypeScript } from '@/assets';
import { Text, Twemoji } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import './Footer.css';

const HeartImage = () => <Twemoji className="image" emoji="❤" />;
const TypeScriptImage = () => <img className="image" src={TypeScript} alt="TypeScript" />;

export function FooterContent() {
    const { t } = useTranslation();
    const madeWith = t('footer.text.0');
    const and = t('footer.text.1');
    const heart = <HeartImage />;
    const typescript = <TypeScriptImage />;

    return (
        <Text>
            {madeWith} {heart} {and} {typescript}
        </Text>
    )
}

export function Footer() {
    return (
        <div className="footer">
            <FooterContent />
        </div>
    )
}