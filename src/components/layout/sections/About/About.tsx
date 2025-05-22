import { Nassinger } from '@/assets';
import { Link, LinkContainer, Section, SectionHashTitle, Text, Twemoji } from '@/components/ui';
import { links } from '@/config/links';
import { parseLinks } from '@/utils/misc/parseLinks';
import './About.css';

export function AboutImageAndLinks() {
    return (
        <div className="image-and-links">
            <div className="image-container">
                <div className="image-overlay">
                    <img src={Nassinger} alt="nassinger vector art" />
                </div>
            </div>
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
    )
}

export type AboutTextProps = {
    title?: string;
    titleI18n?: string;
    titleEmoji: string;
    content?: string;
    contentI18n?: string;
    contentI18nArgs?: Record<string, any>;
};

export function AboutText(props: AboutTextProps) {
    const addSpacingAfter = (str: string) => str + ' ';

    return (
        <div className="text-item">
            <Text className="title">
                <Text i18n={props.titleI18n} format={addSpacingAfter}>{props.title}</Text>
                <Twemoji emoji={props.titleEmoji} />
            </Text>
            <Text className="content" i18n={props.contentI18n} i18nArgs={props.contentI18nArgs} format={parseLinks}>
                {props.content}
            </Text>
        </div>
    )
}

export function AboutTexts() {
    const bornAt = 2005; // rounding up. I'm not including the day/month of birth for privacy reasons.
    const startedAt = 2019;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const age = currentYear - bornAt;
    const codingYears = currentYear - startedAt;

    return (
        <div className="texts-container">
            <AboutText
                titleI18n="about.first_paragraph_title"
                titleEmoji="👋"
                contentI18n="about.first_paragraph_content"
                contentI18nArgs={{ age }}
            />

            <AboutText
                titleI18n="about.second_paragraph_title"
                titleEmoji="🛠️"
                contentI18n="about.second_paragraph_content"
                contentI18nArgs={{ codingYears }}
            />
        </div>
    )
}

export function About() {
    return (
        <Section className="about" id="about">
            <SectionHashTitle i18n="nav.buttons.about"></SectionHashTitle>
            <div className="about-container">
                <AboutImageAndLinks />
                <AboutTexts />
            </div>
        </Section>
    )
}