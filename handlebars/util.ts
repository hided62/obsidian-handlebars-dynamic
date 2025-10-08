import { parseYaml } from "obsidian";
import type { tplFrontmatter } from "./codeBlockProcessor";

const frontmatterBegin = /^---\r?\n/;
const frontmatterEnd = /\r?\n---(?:\r?\n)|$/;

export function parseFrontmatter(text: string): { frontmatter: tplFrontmatter, content: string } {
    const front = frontmatterBegin.exec(text);
    if (!front) {
        return {
            frontmatter: {},
            content: text,
        };
    }

    const end = text.search(frontmatterEnd);
    if(end < 0){
        return {
            frontmatter: {},
            content: text,
        };
    }

    const frontmatterText = text.slice(front[0].length, end);

    try{
        const frontmatter = parseYaml(frontmatterText) as tplFrontmatter;
        const content = text.slice(end + 5);

        return {
            frontmatter,
            content,
        };
    }
    catch(e){
        return {
            frontmatter: {},
            content: text,
        };
    }
}

const testFenceBegin = /^(?:\s*\n)*(````+)\s*\n/;
const testFenceEnd = /\n(````+)(?:\s*\n)*$/;

export function parseHBFrontmatter(text: string): {frontmatter: tplFrontmatter, content: string}{
    const {frontmatter, content} = parseFrontmatter(text);

    const fenceBegin = testFenceBegin.exec(content);
    if(!fenceBegin){
        return {
            frontmatter,
            content,
        };
    }

    const fence = fenceBegin[1];

    const fenceEnd = testFenceEnd.exec(content.slice(fenceBegin[0].length));

    if(!fenceEnd){
        return {
            frontmatter,
            content,
        };
    }

    const fence2 = fenceEnd[1];

    if(fence !== fence2){
        return {
            frontmatter,
            content,
        };
    }

    const unfenced = content.slice(fenceBegin[0].length, -fenceEnd[0].length);
    return {
        frontmatter,
        content: unfenced,
    }
}