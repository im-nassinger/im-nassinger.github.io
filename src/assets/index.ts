// the "vite-plugin-svgr" doesn't expose the src of the
// components (which I need for dynamic loading images).
// so I'm exporting two versions of the same image:
// one as a string and one as a memoized component.

import { default as _HashtagIcon } from './svg/hashtag.svg?react';
import { default as _SparklesIcon } from './svg/sparkles.svg?react';
import { default as _TypeScriptIcon } from './svg/logos/typescript.svg?react';
import { default as _ReactIcon } from './svg/logos/react.svg?react';
import { default as _NodeIcon } from './svg/logos/node.svg?react';
import { default as _JavaScriptIcon } from './svg/logos/javascript.svg?react';
import { default as _Html5Icon } from './svg/logos/html5.svg?react';
import { default as _GitHubIcon } from './svg/logos/github.svg?react';
import { default as _GitIcon } from './svg/logos/git.svg?react';
import { default as _DenoIcon } from './svg/logos/deno.svg?react';
import { default as _Css3Icon } from './svg/logos/css3.svg?react';
import { default as _VSCodeIcon } from './svg/logos/vscode.svg?react';
import { default as _LinkedInIcon } from './svg/logos/linkedin.svg?react';
import { memo } from 'react';

// here I'm exporting the src of each image as a string.
export { default as Nassinger } from './bitmap/nassinger.png';
export { default as Unoesc } from './bitmap/unoesc.png';
export { default as Domestika } from './bitmap/domestika.png';

export { default as Hashtag } from './svg/hashtag.svg';
export { default as Sparkles } from './svg/sparkles.svg';
export { default as TypeScript } from './svg/logos/typescript.svg';
export { default as React } from './svg/logos/react.svg';
export { default as Node } from './svg/logos/node.svg';
export { default as JavaScript } from './svg/logos/javascript.svg';
export { default as Html5 } from './svg/logos/html5.svg';
export { default as GitHub } from './svg/logos/github.svg';
export { default as Git } from './svg/logos/git.svg';
export { default as Deno } from './svg/logos/deno.svg';
export { default as Css3 } from './svg/logos/css3.svg';
export { default as VSCode } from './svg/logos/vscode.svg';
export { default as LinkedIn } from './svg/logos/linkedin.svg';

// here I'm exporting a memoized version of each image.
export const HashtagIcon = memo(_HashtagIcon);
export const SparklesIcon = memo(_SparklesIcon);
export const TypeScriptIcon = memo(_TypeScriptIcon);
export const ReactIcon = memo(_ReactIcon);
export const NodeIcon = memo(_NodeIcon);
export const JavaScriptIcon = memo(_JavaScriptIcon);
export const Html5Icon = memo(_Html5Icon);
export const GitHubIcon = memo(_GitHubIcon);
export const GitIcon = memo(_GitIcon);
export const DenoIcon = memo(_DenoIcon);
export const Css3Icon = memo(_Css3Icon);
export const VSCodeIcon = memo(_VSCodeIcon);
export const LinkedInIcon = memo(_LinkedInIcon);