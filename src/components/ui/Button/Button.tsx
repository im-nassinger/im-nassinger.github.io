import { clsx } from '@/utils/dom/clsx';
import { useState } from 'react';
import { Text } from '../Text';
import './Button.css';

export type ButtonProps = {
    className?: any;
    href?: string;
    title?: string;
    children?: string;
    i18n?: string;
    i18nArgs?: Record<string, string>;
    type?: 'button' | 'submit' | 'reset';
    icons?: Record<string, React.ElementType>;
    icon?: React.ElementType;
    activeIcon?: keyof ButtonProps['icons'] | ButtonProps['icon'];
    onClick?: (event: React.MouseEvent) => void;
}

export function Button(props: ButtonProps) {
    const [startedDown, setStartedDown] = useState(false);

    const onMouseDown = () => setStartedDown(true);

    const onMouseUp = (event: React.MouseEvent) => {
        if (startedDown && props.onClick) props.onClick(event);

        setStartedDown(false);
    };

    return (
        <button
            title={props.title}
            className={clsx('button', props.className)}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            type={props.type}
        >
            {props.icon && <props.icon className="icon" />}

            {props.icons &&
                <div className="icons">
                    {
                        Object.entries(props.icons).map(([key, Icon]) => {
                            const isActive = (
                                key === props.activeIcon ||
                                Icon === props.activeIcon
                            );

                            return (
                                <Icon
                                    key={key}
                                    className={clsx('icon', isActive && 'active')}
                                />
                            );
                        })
                    }
                </div>
            }

            {(props.children || props.i18n) && (
                <Text
                    i18n={props.i18n}
                    i18nArgs={props.i18nArgs}
                >
                    {props.children}
                </Text>
            )}
        </button>
    )
}