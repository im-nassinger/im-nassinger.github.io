import { clsx } from '@/utils/dom/clsx';
import './Tag.css';

type TagProps = {
    className?: string;
    tagName: string;
}

export function Tag(props: TagProps) {
    return (
        <span className={clsx('tag', props.className)}>
            {props.tagName}
        </span>
    )
}