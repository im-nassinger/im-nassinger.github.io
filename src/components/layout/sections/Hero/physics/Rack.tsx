import { useObjectRef } from "@/hooks/useObjectRef";
import React, { memo } from "react";

function rack(radius: number, width: number, startX: number = 0, startY: number = 0) {
    const positions = [];
    const verticalSpacing = Math.sqrt(3) * radius;
    const height = (width - 1) * verticalSpacing;
    const offsetY = height / 2;

    for (let row = 0; row < width; row++) {
        const count = width - row;
        const xStart = -(count - 1) * radius;
        const y = (height - row * verticalSpacing) - offsetY;

        for (let i = 0; i < count; i++) {
            const x = xStart + i * 2 * radius;
            positions.push({ x: startX + x, y: startY + y });
        }
    }

    return positions;
}

function shuffleArray(array: any[]) {
    const result = [...array];

    for (let i = array.length - 1; i > 0; i--) {
        let rand = Math.floor(Math.random() * (i + 1));
        let temp = result[i];
        
        result[i] = result[rand];
        result[rand] = temp;
    }

    return result;
}

function getRackWidthFor(n: number) {
    const d = Math.sqrt(1 + 8 * n);
    return Math.ceil((d - 1) / 2);
}

export type RackProps = {
    x?: number;
    y?: number;
    radius?: number;
    suffle?: boolean;
    children?: React.ReactNode;
}

export const Rack = memo((props: RackProps) => {
    const children = React.Children.toArray(props.children);

    const stableProps = useObjectRef(props);

    const { childArray, positions } = React.useMemo(
        () => {
            const suffle = stableProps.suffle ?? true;
            const childArray = suffle ? shuffleArray(children) : children;
            const width = getRackWidthFor(childArray.length);
            const x = stableProps.x ?? 0;
            const y = stableProps.y ?? 0;
            const radius = stableProps.radius ?? 1;
            const positions = rack(radius ?? 1, width, x, y + radius * 0.5);

            return { childArray, width, positions };
        }
    , [children, stableProps]);

    return childArray.map((child, index) => {
        const { x, y } = positions[index] || { x: 0, y: 0 };

        return React.cloneElement(child, { key: index, x, y });
    });
});