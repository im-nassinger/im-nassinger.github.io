import { ResponsiveList, Section, SectionDescription, SectionHashTitle, SectionInfo, SectionTitle } from '@/components/ui';
import { ExtraCard } from '@/components/ui/ExtraCard';
import extraList from './extra-list' with { type: 'json' };
import './Extras.css';

export function ExtrasInfo() {
    return (
        <SectionInfo>
            <SectionTitle i18n="extras.title"></SectionTitle>
            <SectionDescription i18n="extras.description"></SectionDescription>
        </SectionInfo>
    )
}

export function ExtrasList() {
    return (
        <ResponsiveList className="extras-container">
            {
                extraList.map(({ extraName, imageURL, side, color }) => {
                    const titleI18n = `extras.items.${extraName}.title`;
                    const subtitleI18n = `extras.items.${extraName}.subtitle`;
                    const descriptionI18n = `extras.items.${extraName}.description`;

                    return (
                        <ExtraCard
                            key={extraName}
                            extraName={extraName}
                            imageURL={imageURL}
                            className={side}
                            color={color}
                            titleI18n={titleI18n}
                            subtitleI18n={subtitleI18n}
                            descriptionI18n={descriptionI18n}
                        />
                    );
                })
            }
        </ResponsiveList>
    )
}

export function Extras() {
    return (
        <Section className="extras" id="extras">
            <SectionHashTitle i18n="nav.buttons.extras"></SectionHashTitle>
            <ExtrasInfo />
            <ExtrasList />
        </Section>
    )
}