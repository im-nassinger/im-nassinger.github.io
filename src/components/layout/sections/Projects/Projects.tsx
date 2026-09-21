import { ProjectCard, ResponsiveList, Section, SectionDescription, SectionHashTitle, SectionInfo, SectionTitle, Text } from '@/components/ui';
import { SmoothScrollContext } from '@/contexts/SmoothScrollContext';
import { getCssVar } from '@/utils/dom/getCssVar';
import { getRootFontSize } from '@/utils/dom/getRootFontSize';
import { pointInRect } from '@/utils/math/pointInRect';
import { debounce } from '@/utils/timing/debounce';
import { useContext, useEffect } from 'react';
import projectList from './project-list.json' with { type: 'json' };
import './Projects.css';
import { profile } from '@/utils/profiler/profiler.ts';

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

type BlobCard = {
    card: HTMLElement;
    blob: HTMLElement;
    fakeBlob: HTMLElement;
    radiusPx: number;
};

function findBlobCards() {
    const blobCards: BlobCard[] = [];

    for (const card of document.querySelectorAll<HTMLElement>('.project-card')) {
        const blob = card.querySelector<HTMLElement>('.blob');
        const fakeBlob = card.querySelector<HTMLElement>('.fakeblob');

        if (blob && fakeBlob) blobCards.push({ card, blob, fakeBlob, radiusPx: NaN });
    }

    return blobCards;
}

export function Projects() {
    const scrollCtx = useContext(SmoothScrollContext);

    if (!scrollCtx) {
        throw new Error('Projects must be used within a <SmoothScrollContext>');
    }

    useEffect(() => {
        const ctrl = new AbortController();
        const { signal } = ctrl;

        const blobCards = findBlobCards();

        const resetBlob = (blob: HTMLElement) => blob.removeAttribute('style');

        const resetBlobs = () => {
            for (const { blob } of blobCards) resetBlob(blob);
        };

        // computed styles are read once (and again on resize), never while scrolling.
        const measureBlobRadii = () => {
            const rootFontSize = getRootFontSize();

            for (const blobCard of blobCards) {
                const blobSize = parseFloat(getCssVar('--size', blobCard.blob));
                blobCard.radiusPx = (blobSize / 2) * rootFontSize;
            }
        };

        resetBlobs();
        measureBlobRadii();

        window.addEventListener('resize', measureBlobRadii, { signal });

        let lastMouseX = -1, lastMouseY = -1;

        // every layout read happens before any style write, so the browser lays out at most once.
        const updateBlobs = () => {
            if (lastMouseX === -1 || lastMouseY === -1) return;

            const updates = blobCards.map((blobCard) => ({
                blobCard,
                cardRect: blobCard.card.getBoundingClientRect(),
                fakeBlobRect: blobCard.fakeBlob.getBoundingClientRect()
            }));

            for (const { blobCard, cardRect, fakeBlobRect } of updates) {
                const { blob, radiusPx } = blobCard;

                const expandedRect = {
                    x: cardRect.left - radiusPx,
                    y: cardRect.top - radiusPx,
                    width: cardRect.width + radiusPx * 2,
                    height: cardRect.height + radiusPx * 2,
                };

                const hasRadius = !isNaN(radiusPx);
                const isInside = !hasRadius || pointInRect(lastMouseX, lastMouseY, expandedRect);

                if (!isInside) {
                    resetBlob(blob);
                    continue;
                }

                const x = Math.round((lastMouseX - fakeBlobRect.left) - (fakeBlobRect.width / 2));
                const y = Math.round((lastMouseY - fakeBlobRect.top) - (fakeBlobRect.height / 2));

                blob.style.transform = `translate(${x}px, ${y}px)`;
            }
        };

        // scroll and mousemove fire several times per frame, but the blobs only need to move once per frame.
        let pendingFrame = 0;

        const scheduleBlobUpdate = () => {
            if (pendingFrame) return;

            pendingFrame = requestAnimationFrame(() => {
                pendingFrame = 0;
                profile('projects:update-blobs', updateBlobs);
            });
        };

        signal.addEventListener('abort', () => cancelAnimationFrame(pendingFrame));

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

            scheduleBlobUpdate();
        }, { signal });

        const container = scrollCtx.container

        if (!container) return;

        container.addEventListener('scroll', scheduleBlobUpdate, { signal });

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