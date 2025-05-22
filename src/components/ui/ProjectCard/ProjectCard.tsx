import { clsx } from '@/utils/dom/clsx';
import { SquareArrowOutUpRight } from 'lucide-react';
import { memo } from 'react';
import { ResponsiveListItem } from '../ResponsiveList';
import { Technology } from '../Technology';
import { Text } from '../Text';
import './ProjectCard.css';

export type ProjectCardProps = {
    projectName?: string;
    className?: string;
    title?: string;
    titleI18n?: string;
    description?: string;
    descriptionI18n?: string;
    technologies: string[];
}

export const ProjectCard = memo((props: ProjectCardProps) => {
    return (
        <ResponsiveListItem className={clsx('project-card', props.className)} name={props.projectName}>
            <div className="content">
                <Text className="title" i18n={props.titleI18n}>{props.title}</Text>
                <Text className="description" i18n={props.descriptionI18n}>{props.description}</Text>
                <div className="technologies">
                    {
                        props.technologies.map((tech, index) => (
                            <Technology key={index}>{tech}</Technology>
                        ))
                    }
                </div>
                <SquareArrowOutUpRight className="icon" />
            </div>
            <div className="blob"></div>
            <div className="fakeblob"></div>
        </ResponsiveListItem>
    )
});