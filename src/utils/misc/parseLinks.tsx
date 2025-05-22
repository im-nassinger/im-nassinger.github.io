export function parseLinks(string: string) {
    const elements = [];

    const regex = /\[(.*?)\]\((.*?[^\\])\)/g;
    const parts = string.split(regex);

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i % 3 === 0) {
            elements.push(<span key={i}>{part}</span>);
        } else if (i % 3 === 1) {
            const linkText = part;
            const link = parts[i + 1].replace(/\\/g, '');

            elements.push(
                <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                    {linkText}
                </a>
            );
            i++;
        }
    }

    return elements;
}