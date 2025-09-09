import { ProjectCard, ResponsiveList, Section, SectionDescription, SectionHashTitle, SectionInfo, SectionTitle, Text } from '@/components/ui';
import { SmoothScrollContext } from '@/contexts/SmoothScrollContext';
import { getCssVar } from '@/utils/dom/getCssVar';
import { getRootFontSize } from '@/utils/dom/getRootFontSize';
import { pointInRect } from '@/utils/math/pointInRect';
import { debounce } from '@/utils/timing/debounce';
import { useContext, useEffect } from 'react';
import projectList from './project-list.json' with { type: 'json' };
import './Projects.css';

export function ProjectsInfo() {
    return (
        <SectionInfo>
            <SectionTitle i18n="projects.title"></SectionTitle>
            <SectionDescription i18n="projects.description"></SectionDescription>
        </SectionInfo>
    )
}

export function ProjectsList() {
    const queryParams = new URLSearchParams(window.location.href.split('?')[1]);
    const isSchoolMode = queryParams.get('school_mode') === 'true';

    return (
        <ResponsiveList className="projects-container">
            {
                projectList.map(({ projectName, technologies, url, activity }) => {
                    if (activity && !isSchoolMode) return null;

                    const titleI18n = `projects.items.${projectName}.displayName`;
                    const descriptionI18n = `projects.items.${projectName}.description`;

                    return (
                        <ProjectCard
                            key={projectName}
                            projectName={projectName}
                            titleI18n={titleI18n}
                            descriptionI18n={descriptionI18n}
                            technologies={technologies}
                            url={url}
                            activity={activity}
                        />
                    );
                })
            }
        </ResponsiveList>
    )
}

export function ProjectsSectionContent() {
    return (
        <>
            <SectionHashTitle i18n="nav.buttons.projects"></SectionHashTitle>
            <ProjectsInfo />
            <ProjectsList />
            <Text i18n="projects.more_soon" className="more-soon"></Text>
        </>
    )
}

export function Projects() {
    const scrollCtx = useContext(SmoothScrollContext);

    if (!scrollCtx) {
        throw new Error('Projects must be used within a <SmoothScrollContext>');
    }

    useEffect(() => {
        const cardElements = document.querySelectorAll<HTMLElement>('.project-card')!;
        const ctrl = new AbortController();
        const { signal } = ctrl;

        const resetBlob = (blob: HTMLElement) => blob.removeAttribute('style');

        const resetBlobs = () => {
            for (const element of cardElements) {
                const blob = element.querySelector<HTMLElement>('.blob')!;

                if (blob) resetBlob(element);
            }
        };

        resetBlobs();

        let lastMouseX = -1, lastMouseY = -1;

        const updateBlobs = () => {
            if (lastMouseX === -1 || lastMouseY === -1) return;

            for (const element of cardElements) {
                const blob = element.querySelector<HTMLElement>('.blob')!;
                const fakeBlob = element.querySelector<HTMLElement>('.fakeblob')!;

                if (!blob || !fakeBlob) continue;

                const elementRect = element.getBoundingClientRect();
                const blobRect = fakeBlob.getBoundingClientRect();

                const updateBlobPosition = () => {
                    const x = Math.round((lastMouseX - blobRect.left) - (blobRect.width / 2));
                    const y = Math.round((lastMouseY - blobRect.top) - (blobRect.height / 2));

                    blob.style.transform = `translate(${x}px, ${y}px)`;
                };

                const blobRadius = parseFloat(getCssVar('--size', blob)) / 2;

                if (isNaN(blobRadius)) {
                    updateBlobPosition();
                    continue;
                }

                const rootFontSize = getRootFontSize();
                const actualRadius = blobRadius * rootFontSize;

                const expandedRect = {
                    x: elementRect.left - actualRadius,
                    y: elementRect.top - actualRadius,
                    width: elementRect.width + actualRadius * 2,
                    height: elementRect.height + actualRadius * 2,
                };

                const isInside = pointInRect(lastMouseX, lastMouseY, expandedRect);

                if (isInside) {
                    updateBlobPosition();
                } else {
                    resetBlob(blob);
                }
            }
        };

        let isTouching = false;

        const resetTouch = debounce(() => {
            lastMouseX = -1;
            lastMouseY = -1;
            isTouching = false;
        }, 1000);

        document.addEventListener('touchmove', () => {
            isTouching = true;
        }, { signal });

        document.addEventListener('touchend', (event) => {
            if (!event.touches.length) {
                resetTouch();
            }
        }, { signal });

        document.addEventListener('mousemove', (event) => {
            if (isTouching) return;

            lastMouseX = event.clientX;
            lastMouseY = event.clientY;

            updateBlobs();
        }, { signal });

        const container = scrollCtx.container

        if (!container) return;

        container.addEventListener('scroll', () => updateBlobs(), { signal });

        return () => {
            ctrl.abort();
            resetBlobs();
        };
    }, [scrollCtx.container]);

    return (
        <Section className="projects" id="projects">
            <ProjectsSectionContent />
        </Section>
    )
}