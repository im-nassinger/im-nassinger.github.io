import { clsx } from '@/utils/dom/clsx';
import { parseLinks } from '@/utils/misc/parseLinks';
import { ResponsiveListItem } from '../ResponsiveList';
import { Text } from '../Text';
import './ExtraCard.css';

export type ExtraCardProps = {
    extraName?: string;
    className?: string;
    imageURL?: string;
    color?: string;
    title?: string;
    titleI18n?: string;
    subtitle?: string;
    subtitleI18n?: string;
    description?: string;
    descriptionI18n?: string;
}

export function ExtraCard(props: ExtraCardProps) {
    return (
        <ResponsiveListItem
            className={clsx('extra-card', props.className)}
            name={props.extraName}
            style={{ '--color': props.color }}
        >
            <div className="info">
                <div className="image">
                    <img src={props.imageURL} />
                </div>
                <div className="texts">
                    <Text className="title" i18n={props.titleI18n}>{props.title}</Text>
                    <Text className="subtitle" i18n={props.subtitleI18n}>{props.subtitle}</Text>
                </div>
            </div>
            <Text className="description" i18n={props.descriptionI18n} format={parseLinks}>
                {props.description}
            </Text>
        </ResponsiveListItem>
    )
}